import React, { useState } from 'react';
import { House, Product, HouseLedgerSummary } from '../types';
import { 
  Building, Phone, Search, Plus, CreditCard, 
  FileText, MessageSquare, Edit, AlertCircle, CheckCircle, ChevronRight
} from 'lucide-react';

interface HouseDirectoryProps {
  houses: House[];
  products: Product[];
  calculateLedger: (houseId: string) => HouseLedgerSummary;
  searchQuery: string;
  onOpenLedgerModal: (houseId: string) => void;
  onOpenPaymentModal: (houseId: string) => void;
  onSaveHouse: (house: House) => void;
}

export const HouseDirectory: React.FC<HouseDirectoryProps> = ({
  houses,
  products,
  calculateLedger,
  searchQuery,
  onOpenLedgerModal,
  onOpenPaymentModal,
  onSaveHouse,
}) => {
  const [selectedStreet, setSelectedStreet] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'pending' | 'clear' | 'advance'>('all');
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const streets = Array.from(new Set(houses.map(h => h.street)));

  // Filter houses
  const filteredHouses = houses.filter(house => {
    if (selectedStreet !== 'all' && house.street !== selectedStreet) return false;

    const ledger = calculateLedger(house.id);

    if (balanceFilter === 'pending' && ledger.netOutstanding <= 0) return false;
    if (balanceFilter === 'clear' && ledger.netOutstanding !== 0) return false;
    if (balanceFilter === 'advance' && ledger.netOutstanding >= 0) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = house.houseNumber.toLowerCase().includes(q);
      const matchName = house.customerName.toLowerCase().includes(q);
      const matchPhone = house.phone.includes(q);
      if (!matchNum && !matchName && !matchPhone) return false;
    }

    return true;
  });

  // Totals across filtered houses
  let totalPendingSum = 0;
  houses.forEach(h => {
    const l = calculateLedger(h.id);
    if (l.netOutstanding > 0) totalPendingSum += l.netOutstanding;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner & Quick Add House */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-emerald-400" />
            <span>Customer House Directory ({houses.length} Houses)</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Total Pending Collection Across All Houses: <strong className="text-amber-400 text-sm">₹{totalPendingSum.toLocaleString()}</strong>
          </p>
        </div>

        <button
          onClick={() => {
            setEditingHouse(null);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Customer House</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setSelectedStreet('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
            selectedStreet === 'all'
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-white text-slate-700 border-slate-200'
          }`}
        >
          All Streets ({houses.length})
        </button>
        {streets.map(st => (
          <button
            key={st}
            onClick={() => setSelectedStreet(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
              selectedStreet === st
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            {st}
          </button>
        ))}

        <div className="h-4 w-px bg-slate-300 mx-1" />

        {[
          { id: 'all', label: 'All Balances' },
          { id: 'pending', label: '⚠️ Dues Pending' },
          { id: 'clear', label: '✅ Clear' },
          { id: 'advance', label: '💎 Advance' },
        ].map(bf => (
          <button
            key={bf.id}
            onClick={() => setBalanceFilter(bf.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
              balanceFilter === bf.id
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            {bf.label}
          </button>
        ))}
      </div>

      {/* House Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredHouses.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-6">
            <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-700">No houses match this query</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or search keyword.</p>
          </div>
        ) : (
          filteredHouses.map(house => {
            const ledger = calculateLedger(house.id);
            const defaultProd = products.find(p => p.id === house.defaultMilkProductId) || products[0];

            return (
              <div
                key={house.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 font-extrabold text-sm flex items-center justify-center shadow-sm">
                        {house.houseNumber}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          {house.customerName}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{house.phone}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditingHouse(house)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      title="Edit Customer Details"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Street/Block:</span>
                      <strong className="text-slate-900">{house.street}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Base Packet Order:</span>
                      <strong className="text-emerald-700 font-bold">
                        {house.defaultMilkQty}L {defaultProd.name}
                        {house.customMilkPrice ? ` @ ₹${house.customMilkPrice}/L` : ` @ ₹${defaultProd.price}/L`}
                      </strong>
                    </div>
                    {house.deliveryChargePerMonth ? (
                      <div className="flex justify-between text-slate-600 pt-0.5">
                        <span>Monthly Delivery Fee:</span>
                        <strong className="text-amber-700 font-bold">+₹{house.deliveryChargePerMonth}/month</strong>
                      </div>
                    ) : null}
                  </div>

                  {/* Balance Display Box */}
                  <div className="mt-3 p-3 rounded-xl border flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Ledger Balance Status
                      </span>
                      {ledger.netOutstanding > 0 ? (
                        <span className="text-base font-extrabold text-amber-700 flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>₹{ledger.netOutstanding.toLocaleString()} Pending</span>
                        </span>
                      ) : ledger.netOutstanding < 0 ? (
                        <span className="text-base font-extrabold text-teal-700 flex items-center gap-1 mt-0.5">
                          <CheckCircle className="w-4 h-4 text-teal-600" />
                          <span>₹{Math.abs(ledger.netOutstanding).toLocaleString()} Advance</span>
                        </span>
                      ) : (
                        <span className="text-base font-extrabold text-emerald-700 flex items-center gap-1 mt-0.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>All Clear (₹0)</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onOpenPaymentModal(house.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>+ Pay</span>
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenLedgerModal(house.id)}
                    className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Full Ledger</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
                  </button>

                  {house.phone && (
                    <a
                      href={`https://wa.me/91${house.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `*MILK DELIVERY STATEMENT - Shree Krishna Dairy*\nCustomer: ${house.customerName} (${house.houseNumber})\nOutstanding Dues: ₹${ledger.netOutstanding}\nTotal Billed: ₹${ledger.totalBilled} | Total Paid: ₹${ledger.totalPaid}\nThank you!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition"
                      title="Send Bill via WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit House Modal */}
      {(isAddModalOpen || editingHouse) && (
        <HouseFormModal
          products={products}
          existingHouse={editingHouse || undefined}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingHouse(null);
          }}
          onSave={(savedHouse) => {
            onSaveHouse(savedHouse);
            setIsAddModalOpen(false);
            setEditingHouse(null);
          }}
        />
      )}
    </div>
  );
};

// Sub-component: Add / Edit House Modal
interface HouseFormModalProps {
  products: Product[];
  existingHouse?: House;
  onClose: () => void;
  onSave: (house: House) => void;
}

const HouseFormModal: React.FC<HouseFormModalProps> = ({
  products,
  existingHouse,
  onClose,
  onSave,
}) => {
  const [houseNumber, setHouseNumber] = useState(existingHouse?.houseNumber || '');
  const [customerName, setCustomerName] = useState(existingHouse?.customerName || '');
  const [phone, setPhone] = useState(existingHouse?.phone || '');
  const [street, setStreet] = useState(existingHouse?.street || 'Block A (Rose Avenue)');
  const [defaultMilkProductId, setDefaultMilkProductId] = useState(existingHouse?.defaultMilkProductId || products[0].id);
  const [defaultMilkQty, setDefaultMilkQty] = useState(existingHouse?.defaultMilkQty || 1);
  const [customMilkPrice, setCustomMilkPrice] = useState<string>(existingHouse?.customMilkPrice ? String(existingHouse.customMilkPrice) : '');
  const [deliveryChargePerMonth, setDeliveryChargePerMonth] = useState<number>(
    existingHouse?.deliveryChargePerMonth !== undefined ? existingHouse.deliveryChargePerMonth : 0
  );
  const [openingBalance, setOpeningBalance] = useState(existingHouse?.openingBalance || 0);
  const [notes, setNotes] = useState(existingHouse?.notes || '');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNumber || !customerName) {
      alert('House Number and Customer Name are required.');
      return;
    }

    const houseObj: House = {
      id: existingHouse?.id || `house-${Date.now()}`,
      houseNumber,
      customerName,
      phone,
      street,
      defaultMilkProductId,
      defaultMilkQty: Number(defaultMilkQty),
      customMilkPrice: customMilkPrice ? Number(customMilkPrice) : undefined,
      deliveryChargePerMonth: Number(deliveryChargePerMonth) || 0,
      openingBalance: Number(openingBalance),
      notes,
      isActive: true,
    };

    onSave(houseObj);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">
            {existingHouse ? `Edit House ${existingHouse.houseNumber}` : 'Add New Customer House'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">House # *</label>
              <input
                type="text"
                required
                value={houseNumber}
                onChange={e => setHouseNumber(e.target.value)}
                placeholder="e.g. A-101"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Street / Block</label>
              <input
                type="text"
                value={street}
                onChange={e => setStreet(e.target.value)}
                placeholder="e.g. Block A"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Default Milk Type</label>
              <select
                value={defaultMilkProductId}
                onChange={e => setDefaultMilkProductId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
              >
                {products.filter(p => p.category === 'milk').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Std ₹{p.price}/L)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Base Packet Qty (Litres)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={defaultMilkQty}
                onChange={e => setDefaultMilkQty(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Custom Packet Rate (₹/L)
                <span className="text-[10px] text-slate-400 font-normal block">Leave blank for standard rate</span>
              </label>
              <input
                type="number"
                step="1"
                value={customMilkPrice}
                onChange={e => setCustomMilkPrice(e.target.value)}
                placeholder={`Standard (₹${products.find(p => p.id === defaultMilkProductId)?.price || 60})`}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Monthly Delivery Charge (₹/month)
                <span className="text-[10px] text-slate-400 font-normal block">Billed once per month with milk dues</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={deliveryChargePerMonth}
                onChange={e => setDeliveryChargePerMonth(Number(e.target.value))}
                placeholder="0 (e.g. ₹50/month)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Opening Balance (₹)</label>
            <input
              type="number"
              value={openingBalance}
              onChange={e => setOpeningBalance(Number(e.target.value))}
              placeholder="0 (Positive = Dues, Negative = Advance)"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">Enter previous month pending dues if any.</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Notes / Instructions</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Ring bell twice, leave in bag"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-slate-700 font-semibold text-xs rounded-xl border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Save Customer Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
