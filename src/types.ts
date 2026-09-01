export type ProductCategory = 'milk' | 'curd' | 'paneer' | 'butter' | 'ghee' | 'other';
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'other';
export type DeliveryStatus = 'delivered' | 'vacation' | 'pending';
export type ReceivedBy = 'primary' | 'secondary' | 'Primary' | 'Secondary' | 'self';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unit: string; // e.g. 'Litre', '500g', '200g', 'Packet'
  price: number; // in Rupees
  icon?: string;
  isDefaultMilk?: boolean;
}

export interface House {
  id: string;
  houseNumber: string; // e.g., "A-101"
  customerName: string;
  phone: string;
  street: string; // e.g., "Block A", "Green Park Lane"
  defaultMilkProductId: string;
  defaultMilkQty: number; // Litres or Packets
  customMilkPrice?: number; // Custom price per packet/litre for this specific house if different from standard rate
  deliveryChargePerMonth?: number; // Monthly delivery charge for this house (e.g. ₹50/month, ₹100/month)
  notes?: string;
  isActive: boolean;
  openingBalance?: number; // Previous dues (+) or advance (-)
}

export interface DeliveryItem {
  productId: string;
  productName: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface DeliveryRecord {
  id: string;
  date: string; // YYYY-MM-DD
  houseId: string;
  status: DeliveryStatus;
  items: DeliveryItem[];
  deliveryCharge?: number; // Delivery charge applied for this day's run
  totalAmount: number;
  notes?: string;
  updatedAt: string; // ISO string
  updatedBy?: string; // 'husband' | 'wife'
}

export interface PaymentRecord {
  id: string;
  date: string; // YYYY-MM-DD
  houseId: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNote?: string;
  receivedBy: ReceivedBy;
  createdAt: string;
}

export interface HouseLedgerSummary {
  houseId: string;
  totalDeliveriesCost: number; // Pure product delivery total
  monthlyDeliveryChargeTotal: number; // Monthly delivery charges billed
  totalBilled: number; // totalDeliveriesCost + monthlyDeliveryChargeTotal
  totalPaid: number;
  openingBalance: number;
  netOutstanding: number; // positive = dues owed by house, negative = advance paid
  deliveredDaysCount: number;
  vacationDaysCount: number;
  activeMonthsCount: number;
  monthlyBreakdown?: {
    monthKey: string; // e.g. "2026-08"
    monthName: string; // e.g. "August 2026"
    deliveriesCost: number;
    monthlyDeliveryFee: number;
    deliveredDays: number;
  }[];
}

export interface BackupLog {
  id: string;
  timestamp: string;
  deviceName: string; // e.g. "Husband's Phone (Galaxy S23)" or "Wife's Phone (iPhone 14)"
  type: 'auto_daily' | 'manual_export' | 'manual_import' | 'cloud_sync';
  recordsCount: {
    houses: number;
    deliveries: number;
    payments: number;
  };
}

export interface VendorProfile {
  vendorName: string;
  businessName: string;
  phone: string;
  upiId: string; // e.g., omprovisions@upi
  husbandPhoneName: string;
  wifePhoneName: string;
  defaultMonthlyDeliveryCharge?: number; // Default monthly delivery charge per house
  autoBackupDaily: boolean;
}

export interface BackupDataPayload {
  version: string;
  exportedAt: string;
  exportedBy: string;
  vendorProfile: VendorProfile;
  products: Product[];
  houses: House[];
  deliveryRecords: DeliveryRecord[];
  paymentRecords: PaymentRecord[];
  backupLogs: BackupLog[];
}

export interface AiParseResult {
  actionType: 'delivery' | 'payment' | 'vacation' | 'unknown';
  houseNumber?: string;
  houseId?: string;
  customerName?: string;
  date?: string;
  items?: {
    productName: string;
    qty: number;
  }[];
  paymentAmount?: number;
  paymentMode?: PaymentMode;
  notes?: string;
  confidence: number;
  rawText: string;
}
