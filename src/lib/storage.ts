import { 
  House, Product, DeliveryRecord, PaymentRecord, BackupLog, VendorProfile, 
  BackupDataPayload, HouseLedgerSummary 
} from '../types';
import { DEFAULT_VENDOR_PROFILE, DEFAULT_PRODUCTS, generateInitialHouses, generateInitialHistory } from '../data/initialData';
import { format } from 'date-fns';

const STORAGE_KEYS = {
  PROFILE: 'milkboy_vendor_profile',
  PRODUCTS: 'milkboy_products',
  HOUSES: 'milkboy_houses',
  DELIVERIES: 'milkboy_deliveries',
  PAYMENTS: 'milkboy_payments',
  BACKUP_LOGS: 'milkboy_backup_logs',
  DEVICE_NAME: 'milkboy_device_name',
  LAST_BACKUP_DATE: 'milkboy_last_backup_date',
  DATA_VERSION: 'milkboy_single_sample_v1',
};

export interface AppState {
  vendorProfile: VendorProfile;
  products: Product[];
  houses: House[];
  deliveryRecords: DeliveryRecord[];
  paymentRecords: PaymentRecord[];
  backupLogs: BackupLog[];
  deviceName: string;
}

// Get or assign device name (Primary Phone vs Secondary Phone)
export const getDeviceName = (): string => {
  let name = localStorage.getItem(STORAGE_KEYS.DEVICE_NAME);
  if (!name) {
    name = "Primary Phone";
    localStorage.setItem(STORAGE_KEYS.DEVICE_NAME, name);
  }
  return name;
};

export const setDeviceName = (name: string): void => {
  localStorage.setItem(STORAGE_KEYS.DEVICE_NAME, name);
};

// Reset to single sample dummy record
export const resetToSampleData = (): AppState => {
  const initialHouses = generateInitialHouses();
  const { deliveryRecords, paymentRecords } = generateInitialHistory(initialHouses);
  const initialLogs: BackupLog[] = [
    {
      id: `log-init-${Date.now()}`,
      timestamp: new Date().toISOString(),
      deviceName: getDeviceName(),
      type: 'auto_daily',
      recordsCount: {
        houses: initialHouses.length,
        deliveries: deliveryRecords.length,
        payments: paymentRecords.length,
      },
    },
  ];

  const newState: AppState = {
    vendorProfile: DEFAULT_VENDOR_PROFILE,
    products: DEFAULT_PRODUCTS,
    houses: initialHouses,
    deliveryRecords,
    paymentRecords,
    backupLogs: initialLogs,
    deviceName: getDeviceName(),
  };

  localStorage.setItem(STORAGE_KEYS.DATA_VERSION, 'true');
  saveAppData(newState, false);
  return newState;
};

// Initialize App State
export const loadAppData = (): AppState => {
  try {
    const isSingleSampleVersion = localStorage.getItem(STORAGE_KEYS.DATA_VERSION) === 'true';
    const rawProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    const rawProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const rawHouses = localStorage.getItem(STORAGE_KEYS.HOUSES);
    const rawDeliveries = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
    const rawPayments = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    const rawLogs = localStorage.getItem(STORAGE_KEYS.BACKUP_LOGS);

    if (rawHouses && rawDeliveries) {
      const parsedHouses: House[] = JSON.parse(rawHouses);
      // If client has legacy 50-house mock dataset or hasn't upgraded to single-sample version
      const isLegacyDummyDataset = !isSingleSampleVersion && (
        parsedHouses.length >= 40 || 
        parsedHouses.some(h => h.id === 'house-50' || h.id === 'house-10')
      );

      if (isLegacyDummyDataset) {
        return resetToSampleData();
      }

      let vendorProfile = rawProfile ? JSON.parse(rawProfile) : DEFAULT_VENDOR_PROFILE;
      if (vendorProfile.businessName === "Shree Krishna Dairy Services" || !vendorProfile.businessName) {
        vendorProfile.businessName = "Om Provisions";
        vendorProfile.upiId = "omprovisions@upi";
      }

      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, 'true');
      return {
        vendorProfile,
        products: rawProducts ? JSON.parse(rawProducts) : DEFAULT_PRODUCTS,
        houses: parsedHouses,
        deliveryRecords: JSON.parse(rawDeliveries),
        paymentRecords: rawPayments ? JSON.parse(rawPayments) : [],
        backupLogs: rawLogs ? JSON.parse(rawLogs) : [],
        deviceName: getDeviceName(),
      };
    }
  } catch (err) {
    console.error('Error loading data from localStorage, re-initializing...', err);
  }

  // First time bootstrap
  return resetToSampleData();
};

// Save state to local storage
export const saveAppData = (state: AppState, logBackup = true): void => {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(state.vendorProfile));
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(state.products));
  localStorage.setItem(STORAGE_KEYS.HOUSES, JSON.stringify(state.houses));
  localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(state.deliveryRecords));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(state.paymentRecords));
  localStorage.setItem(STORAGE_KEYS.BACKUP_LOGS, JSON.stringify(state.backupLogs));

  if (logBackup) {
    checkAndCreateDailyAutoBackup(state);
  }
};

// Check if daily backup has been created today, if not create backup snapshot
export const checkAndCreateDailyAutoBackup = (state: AppState): boolean => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DATE);

  if (lastBackup !== todayStr && state.vendorProfile.autoBackupDaily) {
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_DATE, todayStr);
    
    const newLog: BackupLog = {
      id: `log-auto-${Date.now()}`,
      timestamp: new Date().toISOString(),
      deviceName: state.deviceName,
      type: 'auto_daily',
      recordsCount: {
        houses: state.houses.length,
        deliveries: state.deliveryRecords.length,
        payments: state.paymentRecords.length,
      },
    };

    state.backupLogs = [newLog, ...state.backupLogs.slice(0, 20)];
    localStorage.setItem(STORAGE_KEYS.BACKUP_LOGS, JSON.stringify(state.backupLogs));
    
    // Fire background sync to server backup mirror
    syncToServerBackup(state).catch(err => console.warn('Server sync failed:', err));
    return true;
  }
  return false;
};

// Calculate house billing ledger
export const calculateHouseLedger = (houseId: string, state: AppState): HouseLedgerSummary => {
  const house = state.houses.find(h => h.id === houseId);
  const openingBalance = house?.openingBalance || 0;

  const houseDeliveries = state.deliveryRecords.filter(d => d.houseId === houseId);
  const totalDeliveriesCost = houseDeliveries.reduce((sum, d) => sum + (d.status === 'delivered' ? d.totalAmount : 0), 0);

  const housePayments = state.paymentRecords.filter(p => p.houseId === houseId);
  const totalPaid = housePayments.reduce((sum, p) => sum + p.amount, 0);

  const deliveredDaysCount = houseDeliveries.filter(d => d.status === 'delivered').length;
  const vacationDaysCount = houseDeliveries.filter(d => d.status === 'vacation').length;

  // Monthly delivery charge calculation:
  // Apply monthly delivery fee for each distinct calendar month that had deliveries
  const monthMap = new Map<string, { deliveriesCost: number; deliveredDays: number }>();
  houseDeliveries.forEach(d => {
    if (d.status === 'delivered') {
      const monthKey = d.date.substring(0, 7); // e.g. "2026-08"
      const current = monthMap.get(monthKey) || { deliveriesCost: 0, deliveredDays: 0 };
      current.deliveriesCost += d.totalAmount;
      current.deliveredDays += 1;
      monthMap.set(monthKey, current);
    }
  });

  const monthlyDeliveryFeeRate = house?.deliveryChargePerMonth !== undefined 
    ? (house.deliveryChargePerMonth || 0) 
    : (state.vendorProfile.defaultMonthlyDeliveryCharge || 0);

  const monthlyBreakdown: {
    monthKey: string;
    monthName: string;
    deliveriesCost: number;
    monthlyDeliveryFee: number;
    deliveredDays: number;
  }[] = [];

  let monthlyDeliveryChargeTotal = 0;
  monthMap.forEach((data, monthKey) => {
    let monthName = monthKey;
    try {
      const [year, month] = monthKey.split('-').map(Number);
      const d = new Date(year, month - 1, 1);
      monthName = format(d, 'MMMM yyyy');
    } catch {
      monthName = monthKey;
    }

    const fee = data.deliveredDays > 0 ? monthlyDeliveryFeeRate : 0;
    monthlyDeliveryChargeTotal += fee;

    monthlyBreakdown.push({
      monthKey,
      monthName,
      deliveriesCost: data.deliveriesCost,
      monthlyDeliveryFee: fee,
      deliveredDays: data.deliveredDays,
    });
  });

  // Sort monthly breakdown newest first
  monthlyBreakdown.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  const totalBilled = totalDeliveriesCost + monthlyDeliveryChargeTotal;
  const netOutstanding = openingBalance + totalBilled - totalPaid;

  return {
    houseId,
    totalDeliveriesCost,
    monthlyDeliveryChargeTotal,
    totalBilled,
    totalPaid,
    openingBalance,
    netOutstanding,
    deliveredDaysCount,
    vacationDaysCount,
    activeMonthsCount: monthlyBreakdown.length,
    monthlyBreakdown,
  };
};

// Export Backup JSON file
export const exportBackupJSON = (state: AppState): void => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
  const payload: BackupDataPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    exportedBy: state.deviceName,
    vendorProfile: state.vendorProfile,
    products: state.products,
    houses: state.houses,
    deliveryRecords: state.deliveryRecords,
    paymentRecords: state.paymentRecords,
    backupLogs: state.backupLogs,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `MilkBoy_Backup_${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export CSV for Excel/Sheets
export const exportBackupCSV = (state: AppState): void => {
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  let csvContent = 'House Number,Customer Name,Street,Phone,Milk Deliveries Cost (₹),Monthly Delivery Fee (₹),Total Billed (₹),Total Payments (Paid),Opening Balance,Net Outstanding Dues (₹)\n';

  state.houses.forEach(house => {
    const ledger = calculateHouseLedger(house.id, state);
    const line = `"${house.houseNumber}","${house.customerName}","${house.street}","${house.phone}",${ledger.totalDeliveriesCost},${ledger.monthlyDeliveryChargeTotal},${ledger.totalBilled},${ledger.totalPaid},${ledger.openingBalance},${ledger.netOutstanding}`;
    csvContent += line + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `MilkBoy_House_Ledgers_${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Validate and Import JSON backup content
export const parseBackupJSON = (jsonString: string): BackupDataPayload => {
  const parsed = JSON.parse(jsonString);
  if (!parsed || !Array.isArray(parsed.houses) || !Array.isArray(parsed.deliveryRecords)) {
    throw new Error('Invalid MilkBoy backup file format. Missing houses or delivery records.');
  }
  return parsed as BackupDataPayload;
};

// Server Cloud Backup Sync
export const syncToServerBackup = async (state: AppState): Promise<boolean> => {
  try {
    const payload: BackupDataPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: state.deviceName,
      vendorProfile: state.vendorProfile,
      products: state.products,
      houses: state.houses,
      deliveryRecords: state.deliveryRecords,
      paymentRecords: state.paymentRecords,
      backupLogs: state.backupLogs,
    };

    const res = await fetch('/api/backup/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn('Backup sync endpoint not available:', err);
  }
  return false;
};

export const fetchServerBackup = async (): Promise<BackupDataPayload | null> => {
  try {
    const res = await fetch('/api/backup/latest');
    if (res.ok) {
      const data = await res.json();
      if (data && data.houses) {
        return data as BackupDataPayload;
      }
    }
  } catch (err) {
    console.warn('Could not fetch server backup:', err);
  }
  return null;
};
