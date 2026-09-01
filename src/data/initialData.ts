import { House, Product, VendorProfile, DeliveryRecord, PaymentRecord } from '../types';
import { format, subDays } from 'date-fns';

export const DEFAULT_VENDOR_PROFILE: VendorProfile = {
  vendorName: "Renuka & Mohan",
  businessName: "Om Provisions",
  phone: "+91 98765 43210",
  upiId: "omprovisions@upi",
  husbandPhoneName: "K Mohan",
  wifePhoneName: "K Renuka",
  defaultMonthlyDeliveryCharge: 0,
  autoBackupDaily: true,
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-milk-fc',
    name: 'Full Cream Milk',
    category: 'milk',
    unit: 'Litre',
    price: 66,
    isDefaultMilk: true,
  },
  {
    id: 'prod-milk-toned',
    name: 'Toned Milk',
    category: 'milk',
    unit: 'Litre',
    price: 56,
  },
  {
    id: 'prod-milk-cow',
    name: 'Cow Milk',
    category: 'milk',
    unit: 'Litre',
    price: 60,
  },
  {
    id: 'prod-curd-500',
    name: 'Fresh Curd (Dahi)',
    category: 'curd',
    unit: '500g Pkt',
    price: 35,
  },
  {
    id: 'prod-curd-1k',
    name: 'Fresh Curd (Dahi)',
    category: 'curd',
    unit: '1kg Bucket',
    price: 68,
  },
  {
    id: 'prod-paneer-200',
    name: 'Fresh Paneer',
    category: 'paneer',
    unit: '200g Pkt',
    price: 90,
  },
  {
    id: 'prod-paneer-500',
    name: 'Fresh Paneer',
    category: 'paneer',
    unit: '500g Pkt',
    price: 210,
  },
  {
    id: 'prod-butter-100',
    name: 'Table Butter',
    category: 'butter',
    unit: '100g Box',
    price: 58,
  },
  {
    id: 'prod-ghee-500',
    name: 'Pure Desi Ghee',
    category: 'ghee',
    unit: '500ml Jar',
    price: 380,
  },
];

// Single sample dummy house record
export const generateInitialHouses = (): House[] => {
  return [
    {
      id: 'house-1',
      houseNumber: 'A-101',
      customerName: 'Rajesh Sharma',
      phone: '9876543210',
      street: 'Block A (Rose Avenue)',
      defaultMilkProductId: 'prod-milk-fc',
      defaultMilkQty: 1,
      notes: 'Sample customer record. Tap to edit or add new houses.',
      isActive: true,
      openingBalance: 0,
    },
  ];
};

// Generate 1 sample delivery record and 1 sample payment record for the single sample house
export const generateInitialHistory = (houses: House[]) => {
  const deliveryRecords: DeliveryRecord[] = [];
  const paymentRecords: PaymentRecord[] = [];
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const sampleHouse = houses[0] || { id: 'house-1' };
  const prod = DEFAULT_PRODUCTS[0]; // Full Cream Milk

  deliveryRecords.push({
    id: `deliv-${todayStr}-${sampleHouse.id}`,
    date: todayStr,
    houseId: sampleHouse.id,
    status: 'delivered',
    items: [
      {
        productId: prod.id,
        productName: prod.name,
        qty: 1,
        unit: prod.unit,
        unitPrice: prod.price,
        totalPrice: prod.price,
      },
    ],
    totalAmount: prod.price,
    updatedAt: new Date().toISOString(),
    updatedBy: 'primary',
    notes: 'Morning delivery completed',
  });

  paymentRecords.push({
    id: `pay-${todayStr}-${sampleHouse.id}`,
    date: todayStr,
    houseId: sampleHouse.id,
    amount: 500,
    paymentMode: 'upi',
    referenceNote: 'Advance payment via UPI',
    receivedBy: 'primary',
    createdAt: new Date().toISOString(),
  });

  return { deliveryRecords, paymentRecords };
};
