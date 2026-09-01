import React, { useState } from 'react';
import { House, PaymentRecord, HouseLedgerSummary, VendorProfile, PaymentMode, ReceivedBy } from '../types';
import { CreditCard, DollarSign, ArrowUpRight, CheckCircle2, AlertTriangle, MessageSquare, Phone, Search } from 'lucide-react';
import { format } from 'date-fns';

interface BillingAndPaymentsProps {
  houses: House[];
  calculateLedger: (houseId: string) => HouseLedgerSummary;
  vendorProfile: VendorProfile;
  deviceName: string;
  onAddPayment: (payment: PaymentRecord) => void;
  onOpenLedgerModal: (houseId: string) => void;
}

export const BillingAndPayments: React.FC<BillingAndPaymentsProps> = ({
  houses,
  calculateLedger,
  vendorProfile,
  deviceName,
  onAddPayment,
  onOpenLedgerModal,
}) => {
  const [selectedHouseId, setSelectedHouseId] = useState<string>('');
  const [amount, setAmount] = useState<number>(1000);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [receivedBy, setReceivedBy] = useState<ReceivedBy>(
    deviceName.includes('Secondary') ? 'secondary' : 'primary'
  );
  const [referenceNote, setReferenceNote] = useState<string>('');
  const [paymentSearch, setPaymentSearch] = useState<string>('');

  // Collect all ledgers
  const houseLedgers = houses.map(h => ({
    house: h,
    ledger: calculateLedger(h.id),
  }));

  // Totals
  let totalPendingDues = 0;
  let totalBilledSum = 0;
  let totalPaidSum = 0;
  let overdueHousesCount = 0;

  houseLedgers.forEach(hl => {
    totalBilledSum += hl.ledger.totalBilled;
    totalPaidSum += hl.ledger.totalPaid;
    if (hl.ledger.netOutstanding > 0) {
      totalPendingDues += hl.ledger.netOutstanding;
      overdueHousesCount++;
    }
  });

  // Top overdue houses sorted by highest dues
  const overdueHouses = [...houseLedgers]
    .filter(hl => hl.ledger.netOutstanding > 0)
    .sort((a, b) => b.ledger.netOutstanding - a.ledger.netOutstanding);

  // Houses filtered for payment dropdown search
  const filteredHousesForPay = houses.filter(h => {
    if (!paymentSearch) return true;
    const q = paymentSearch.toLowerCase();
    return h.houseNumber.toLowerCase().includes(q) || h.customerName.toLowerCase().includes(q);
  });

  const handleQuickPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHouseId) {
      alert('Please select a customer house.');
      return;
    }
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const targetHouse = houses.find(h => h.id === selectedHouseId);

    const record: PaymentRecord = {
      id: `pay-${Date.now()}-${selectedHouseId}`,
      date: format(new Date(), 'yyyy-MM-dd'),
      houseId: selectedHouseId,
      amount: Number(amount),
      paymentMode,
      receivedBy,
      referenceNote,
      createdAt: new Date().toISOString(),
    };

    onAddPayment(record);
    alert(`Success! Recorded payment of ₹${amount} for ${targetHouse?.customerName} (${targetHouse?.houseNumber}).`);
    setSelectedHouseId('');
    setAmount(1000);
    setReferenceNote('');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Financial Dashboard Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 text-white rounded-2xl p-4 border border-amber-700/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Total Outstanding Dues</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            ₹{totalPendingDues.toLocaleString()}
          </h2>
          <p className="text-xs text-amber-200 mt-1">
            Pending across <strong className="text-white">{overdueHousesCount} houses</strong>
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white rounded-2xl p-4 border border-emerald-700/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Total Payments Collected</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            ₹{totalPaidSum.toLocaleString()}
          </h2>
          <p className="text-xs text-emerald-200 mt-1">
            Received via UPI & Cash
          </p>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Deliveries Billed</span>
            <DollarSign className="w-5 h-5 text-slate-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            ₹{totalBilledSum.toLocaleString()}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Milk & Dairy Sales
          </p>
        </div>
      </div>

      {/* Main Grid: Quick Payment Logger & Top Overdue List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Payment Logger Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Quick Payment Collector</h3>
              <p className="text-xs text-slate-500">Record cash/UPI collected at door</p>
            </div>
          </div>

          <form onSubmit={handleQuickPaymentSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Customer House *</label>
              
              <div className="relative mb-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={e => setPaymentSearch(e.target.value)}
                  placeholder="Filter by house # or name..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-800"
                />
              </div>

              <select
                required
                value={selectedHouseId}
                onChange={e => setSelectedHouseId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Choose House ({filteredHousesForPay.length}) --</option>
                {filteredHousesForPay.map(h => {
                  const l = calculateLedger(h.id);
                  return (
                    <option key={h.id} value={h.id}>
                      {h.houseNumber} - {h.customerName} ({l.netOutstanding > 0 ? `₹${l.netOutstanding} Dues` : 'Clear'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-black text-emerald-700 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900"
                >
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="cash">Cash Given</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Received By</label>
                <select
                  value={receivedBy}
                  onChange={e => setReceivedBy(e.target.value as ReceivedBy)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900"
                >
                  <option value="primary">Primary ({vendorProfile.husbandPhoneName})</option>
                  <option value="secondary">Secondary ({vendorProfile.wifePhoneName})</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reference Note (Optional)</label>
              <input
                type="text"
                value={referenceNote}
                onChange={e => setReferenceNote(e.target.value)}
                placeholder="e.g. Paid for August month"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment Received</span>
            </button>
          </form>
        </div>

        {/* Top Overdue Houses Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Top Overdue Houses Pending Payment</h3>
              <p className="text-xs text-slate-500">Sorted by highest outstanding balance</p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
              {overdueHouses.length} Houses Owe Dues
            </span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {overdueHouses.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">🎉 Excellent! No pending dues found across any house!</p>
            ) : (
              overdueHouses.map(({ house, ledger }) => (
                <div
                  key={house.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {house.houseNumber}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{house.customerName}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{house.street}</span>
                        <span>•</span>
                        <span>📞 {house.phone}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <div className="text-left sm:text-right">
                      <span className="text-base font-black text-amber-800">₹{ledger.netOutstanding.toLocaleString()}</span>
                      <span className="block text-[10px] text-slate-500">Billed: ₹{ledger.totalBilled} | Paid: ₹{ledger.totalPaid}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedHouseId(house.id);
                          setAmount(ledger.netOutstanding);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-2xs"
                        title="Collect this exact pending amount"
                      >
                        Collect ₹{ledger.netOutstanding}
                      </button>

                      <button
                        onClick={() => onOpenLedgerModal(house.id)}
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs"
                        title="View Ledger"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>

                      {house.phone && (
                        <a
                          href={`https://wa.me/91${house.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `*MILK BILL PAYMENT REMINDER - Shree Krishna Dairy*\nDear ${house.customerName},\nThis is a gentle reminder regarding your pending milk delivery dues: ₹${ledger.netOutstanding}.\nPlease transfer via UPI to: ${vendorProfile.upiId}.\nThank you!`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg border border-emerald-300"
                          title="Send Payment Reminder"
                        >
                          <MessageSquare className="w-4 h-4 text-emerald-700" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
