import React, { useState } from 'react';
import { 
  House, Product, DeliveryRecord, PaymentRecord, HouseLedgerSummary, VendorProfile, PaymentMode, ReceivedBy 
} from '../types';
import { 
  FileText, Calendar, CreditCard, MessageSquare, Copy, Check, Plus, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface HouseLedgerModalProps {
  house: House;
  products: Product[];
  deliveryRecords: DeliveryRecord[];
  paymentRecords: PaymentRecord[];
  vendorProfile: VendorProfile;
  ledgerSummary: HouseLedgerSummary;
  deviceName: string;
  onClose: () => void;
  onAddPayment: (payment: PaymentRecord) => void;
}

export const HouseLedgerModal: React.FC<HouseLedgerModalProps> = ({
  house,
  products,
  deliveryRecords,
  paymentRecords,
  vendorProfile,
  ledgerSummary,
  deviceName,
  onClose,
  onAddPayment,
}) => {
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Filter records for this house sorted by date desc
  const houseDeliveries = deliveryRecords
    .filter(d => d.houseId === house.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const housePayments = paymentRecords
    .filter(p => p.houseId === house.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Combine into unified transaction feed sorted by date desc
  interface CombinedRow {
    id: string;
    date: string;
    type: 'delivery' | 'payment';
    description: string;
    amount: number;
    modeOrStatus?: string;
    updatedBy?: string;
  }

  const combinedRows: CombinedRow[] = [];

  houseDeliveries.forEach(d => {
    if (d.status === 'delivered') {
      const itemsText = d.items.map(it => `${it.qty} ${it.unit} ${it.productName}`).join(', ');
      combinedRows.push({
        id: d.id,
        date: d.date,
        type: 'delivery',
        description: itemsText || 'Milk Delivered',
        amount: d.totalAmount,
        modeOrStatus: 'Delivered',
        updatedBy: d.updatedBy,
      });
    } else if (d.status === 'vacation') {
      combinedRows.push({
        id: d.id,
        date: d.date,
        type: 'delivery',
        description: 'Vacation (No Milk)',
        amount: 0,
        modeOrStatus: 'Vacation',
        updatedBy: d.updatedBy,
      });
    }
  });

  // Include monthly delivery charge rows if applicable
  if (ledgerSummary.monthlyBreakdown) {
    ledgerSummary.monthlyBreakdown.forEach(mb => {
      if (mb.monthlyDeliveryFee > 0) {
        combinedRows.push({
          id: `monthly-fee-${mb.monthKey}`,
          date: `${mb.monthKey}-01`,
          type: 'delivery',
          description: `${mb.monthName} Monthly Delivery Fee`,
          amount: mb.monthlyDeliveryFee,
          modeOrStatus: 'Monthly Fee',
          updatedBy: 'system',
        });
      }
    });
  }

  housePayments.forEach(p => {
    combinedRows.push({
      id: p.id,
      date: p.date,
      type: 'payment',
      description: `Payment Received (${p.paymentMode.toUpperCase()}) ${p.referenceNote ? '- ' + p.referenceNote : ''}`,
      amount: p.amount,
      modeOrStatus: `Received by ${p.receivedBy}`,
      updatedBy: p.receivedBy,
    });
  });

  combinedRows.sort((a, b) => b.date.localeCompare(a.date));

  // Generate WhatsApp Bill Text
  const currentMonthName = format(new Date(), 'MMMM yyyy');
  const deliveryChargeLine = ledgerSummary.monthlyDeliveryChargeTotal > 0
    ? `*Monthly Delivery Fee:* ₹${ledgerSummary.monthlyDeliveryChargeTotal.toLocaleString()}\n`
    : '';

  const whatsappBillText = `*🥛 MILK DELIVERY BILL - ${currentMonthName.toUpperCase()}*
*Supplier:* ${vendorProfile.businessName} (${vendorProfile.phone})
*Customer:* ${house.customerName} (House #${house.houseNumber})
*Address:* ${house.street}
------------------------------------------------
*Milk & Dairy Deliveries:* ₹${ledgerSummary.totalDeliveriesCost.toLocaleString()}
${deliveryChargeLine}*Total Deliveries Billed:* ₹${ledgerSummary.totalBilled.toLocaleString()}
*Opening Balance / Dues:* ₹${ledgerSummary.openingBalance.toLocaleString()}
*Total Amount Payable:* ₹${(ledgerSummary.openingBalance + ledgerSummary.totalBilled).toLocaleString()}
*Total Payments Received:* ₹${ledgerSummary.totalPaid.toLocaleString()}
------------------------------------------------
*FINAL NET OUTSTANDING DUES: ₹${ledgerSummary.netOutstanding.toLocaleString()}*
------------------------------------------------
Please pay via UPI to: *${vendorProfile.upiId}*
Thank you for your business! 🙏`;

  const handleCopyReceipt = () => {
    navigator.clipboard.writeText(whatsappBillText);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                House #{house.houseNumber}
              </span>
              <span className="text-xs text-slate-400">{house.street}</span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1">{house.customerName}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>📞 {house.phone}</span>
              <span>•</span>
              <span>Daily Order: {house.defaultMilkQty}L Milk</span>
            </p>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl font-bold p-1">
            ✕
          </button>
        </div>

        {/* Financial Summary Cards */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Opening Dues</span>
            <span className="text-base font-extrabold text-slate-800">₹{ledgerSummary.openingBalance}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Billed Total</span>
              {ledgerSummary.monthlyDeliveryChargeTotal > 0 && (
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                  incl. ₹{ledgerSummary.monthlyDeliveryChargeTotal} fee
                </span>
              )}
            </div>
            <span className="text-base font-extrabold text-slate-900">₹{ledgerSummary.totalBilled}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Milk ₹{ledgerSummary.totalDeliveriesCost} {ledgerSummary.monthlyDeliveryChargeTotal > 0 ? `+ Fee ₹${ledgerSummary.monthlyDeliveryChargeTotal}` : ''}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Payments</span>
            <span className="text-base font-extrabold text-emerald-700">₹{ledgerSummary.totalPaid}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{ledgerSummary.deliveredDaysCount} days delivered</span>
          </div>

          <div className={`p-3 rounded-xl border shadow-2xs ${
            ledgerSummary.netOutstanding > 0
              ? 'bg-amber-500/10 border-amber-300'
              : 'bg-emerald-500/10 border-emerald-300'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-600">Net Outstanding</span>
            <span className={`text-lg font-black ${
              ledgerSummary.netOutstanding > 0 ? 'text-amber-800' : 'text-emerald-800'
            }`}>
              ₹{ledgerSummary.netOutstanding.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {ledgerSummary.netOutstanding > 0 ? 'Dues to Collect' : ledgerSummary.netOutstanding < 0 ? 'Advance Balance' : 'Fully Settled'}
            </span>
          </div>
        </div>

        {/* Action Bar: Add Payment & WhatsApp Bill */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => setIsAddPaymentOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <CreditCard className="w-4 h-4" />
            <span>+ Record Payment Received</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReceipt}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center gap-1"
            >
              {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedReceipt ? 'Receipt Copied!' : 'Copy Bill Text'}</span>
            </button>

            {house.phone && (
              <a
                href={`https://wa.me/91${house.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappBillText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 transition flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Open WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        {/* Transaction History Feed */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Complete Delivery & Payment Ledger
          </h3>

          {combinedRows.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No records found for this house yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {combinedRows.map((row) => (
                <div
                  key={row.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                    row.type === 'payment'
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : row.modeOrStatus === 'Monthly Fee'
                      ? 'bg-amber-50/80 border-amber-200'
                      : row.modeOrStatus === 'Vacation'
                      ? 'bg-slate-50 border-slate-200 opacity-70'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                      row.type === 'payment'
                        ? 'bg-emerald-600 text-white'
                        : row.modeOrStatus === 'Monthly Fee'
                        ? 'bg-amber-600 text-white'
                        : row.modeOrStatus === 'Vacation'
                        ? 'bg-slate-300 text-slate-700'
                        : 'bg-slate-900 text-white'
                    }`}>
                      {row.type === 'payment' ? '₹' : row.modeOrStatus === 'Monthly Fee' ? '🚚' : '🥛'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{format(parseISO(row.date), 'dd MMM yyyy')}</span>
                        <span className={`text-[10px] font-semibold ${
                          row.modeOrStatus === 'Monthly Fee' ? 'text-amber-700' : 'text-slate-500'
                        }`}>
                          ({row.modeOrStatus})
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{row.description}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-black ${
                      row.type === 'payment' ? 'text-emerald-700' : row.modeOrStatus === 'Monthly Fee' ? 'text-amber-900' : 'text-slate-900'
                    }`}>
                      {row.type === 'payment' ? `+ ₹${row.amount}` : `₹${row.amount}`}
                    </span>
                    {row.updatedBy && (
                      <span className="block text-[10px] text-slate-400 capitalize">
                        By {row.updatedBy}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 text-white text-xs flex items-center justify-between">
          <span className="text-slate-400">MilkBoy Daily Ledger Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs"
          >
            Close Statement
          </button>
        </div>
      </div>

      {/* Add Payment Modal */}
      {isAddPaymentOpen && (
        <AddPaymentModal
          house={house}
          deviceName={deviceName}
          onClose={() => setIsAddPaymentOpen(false)}
          onSave={(p) => {
            onAddPayment(p);
            setIsAddPaymentOpen(false);
          }}
        />
      )}
    </div>
  );
};

// Sub-component: Add Payment Modal
interface AddPaymentModalProps {
  house: House;
  deviceName: string;
  onClose: () => void;
  onSave: (payment: PaymentRecord) => void;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  house,
  deviceName,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState<number>(500);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [receivedBy, setReceivedBy] = useState<ReceivedBy>(
    deviceName.includes('Secondary') ? 'secondary' : 'primary'
  );
  const [referenceNote, setReferenceNote] = useState<string>('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const record: PaymentRecord = {
      id: `pay-${Date.now()}-${house.id}`,
      date,
      houseId: house.id,
      amount: Number(amount),
      paymentMode,
      receivedBy,
      referenceNote,
      createdAt: new Date().toISOString(),
    };

    onSave(record);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">Record Payment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <p className="text-xs text-slate-600 font-semibold">
            Customer: <strong className="text-slate-900">{house.customerName} ({house.houseNumber})</strong>
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (₹) *</label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-black text-emerald-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="cash">Cash Given</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other / Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Received By</label>
              <select
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value as ReceivedBy)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="primary">Primary Device</option>
                <option value="secondary">Secondary Device</option>
                <option value="self">Self / Shop</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Date Received</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reference / Note</label>
            <input
              type="text"
              value={referenceNote}
              onChange={e => setReferenceNote(e.target.value)}
              placeholder="e.g. GPay Ref #987213"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white text-slate-700 font-semibold text-xs rounded-xl border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
