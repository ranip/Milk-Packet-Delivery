import React, { useState } from 'react';
import { 
  House, Product, DeliveryRecord, DeliveryItem 
} from '../types';
import { 
  Check, X, Plus, Minus, Milk, AlertCircle, Phone, 
  Sparkles, CheckCircle2, RotateCcw, Filter, MessageSquare,
  Zap, List, LayoutGrid, ArrowRight, ChevronRight, ShoppingBag,
  SlidersHorizontal, Search
} from 'lucide-react';
import { format } from 'date-fns';

interface TodayDeliveryRunProps {
  selectedDate: string; // YYYY-MM-DD
  houses: House[];
  products: Product[];
  deliveryRecords: DeliveryRecord[];
  searchQuery: string;
  deviceName: string;
  onUpdateDelivery: (record: DeliveryRecord) => void;
  onOpenHouseLedger: (houseId: string) => void;
}

export const TodayDeliveryRun: React.FC<TodayDeliveryRunProps> = ({
  selectedDate,
  houses,
  products,
  deliveryRecords,
  searchQuery,
  deviceName,
  onUpdateDelivery,
  onOpenHouseLedger,
}) => {
  const [selectedStreet, setSelectedStreet] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered' | 'vacation'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'speedList'>('grid');
  const [extraItemModalHouseIndex, setExtraItemModalHouseIndex] = useState<number | null>(null);
  
  // Temporary inline draft quantity and extras before confirming delivery for a house
  // Map of houseId -> { qty: number, extraItems: { [productId: string]: number } }
  const [draftCustomizations, setDraftCustomizations] = useState<Record<string, { qty: number; extraItems: Record<string, number> }>>({});

  // Quick extra products to display on cards (e.g. Curd & Paneer)
  const quickExtraProducts = products.filter(p => p.category === 'curd' || p.category === 'paneer' || p.category === 'milk').slice(0, 3);

  // Get distinct streets
  const streets = Array.from(new Set(houses.map(h => h.street)));

  // Map houses with today's record
  const recordsMap = new Map<string, DeliveryRecord>();
  deliveryRecords.forEach(r => {
    if (r.date === selectedDate) {
      recordsMap.set(r.houseId, r);
    }
  });

  // Helper to get active house customization draft or default
  const getHouseDraft = (house: House) => {
    const existingRec = recordsMap.get(house.id);
    if (draftCustomizations[house.id]) {
      return draftCustomizations[house.id];
    }
    if (existingRec && existingRec.status === 'delivered' && existingRec.items.length > 0) {
      const defaultMilkItem = existingRec.items.find(it => it.productName.toLowerCase().includes('milk')) || existingRec.items[0];
      const extraItemsMap: Record<string, number> = {};
      existingRec.items.forEach(it => {
        if (it !== defaultMilkItem) {
          extraItemsMap[it.productId] = it.qty;
        }
      });
      return {
        qty: defaultMilkItem ? defaultMilkItem.qty : house.defaultMilkQty,
        extraItems: extraItemsMap,
      };
    }
    return {
      qty: house.defaultMilkQty,
      extraItems: {} as Record<string, number>,
    };
  };

  // Helper to calculate total price for draft
  const calculateDraftCost = (house: House, draft: { qty: number; extraItems: Record<string, number> }) => {
    const defaultProduct = products.find(p => p.id === house.defaultMilkProductId) || products[0];
    const unitPrice = house.customMilkPrice && house.customMilkPrice > 0 ? house.customMilkPrice : defaultProduct.price;
    
    let total = draft.qty * unitPrice;
    Object.entries(draft.extraItems).forEach(([prodId, val]) => {
      const qty = Number(val) || 0;
      const prod = products.find(p => p.id === prodId);
      if (prod && qty > 0) {
        total += qty * prod.price;
      }
    });
    return total;
  };

  // Inline adjustment handlers
  const handleInlineQtyChange = (house: House, newQty: number) => {
    const safeQty = Math.max(0.5, Math.min(20, Math.round(newQty * 2) / 2));
    const currentDraft = getHouseDraft(house);
    setDraftCustomizations(prev => ({
      ...prev,
      [house.id]: {
        ...currentDraft,
        qty: safeQty,
      }
    }));
  };

  const handleInlineToggleExtra = (house: House, productId: string, delta: number) => {
    const currentDraft = getHouseDraft(house);
    const currentQty = currentDraft.extraItems[productId] || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    const updatedExtras = { ...currentDraft.extraItems };
    if (newQty === 0) {
      delete updatedExtras[productId];
    } else {
      updatedExtras[productId] = newQty;
    }

    setDraftCustomizations(prev => ({
      ...prev,
      [house.id]: {
        ...currentDraft,
        extraItems: updatedExtras,
      }
    }));
  };

  // Calculate stats for selected date
  let totalDeliveredCount = 0;
  let totalVacationCount = 0;
  let totalPendingCount = 0;
  let totalMilkLitresDelivered = 0;
  let totalRupeesBilledToday = 0;

  houses.forEach(house => {
    const rec = recordsMap.get(house.id);
    if (!rec || rec.status === 'pending') {
      totalPendingCount++;
    } else if (rec.status === 'vacation') {
      totalVacationCount++;
    } else if (rec.status === 'delivered') {
      totalDeliveredCount++;
      totalRupeesBilledToday += rec.totalAmount;
      rec.items.forEach(item => {
        if (item.productName.toLowerCase().includes('milk')) {
          totalMilkLitresDelivered += item.qty;
        }
      });
    }
  });

  // Filter houses based on street, status, and search query
  const filteredHouses = houses.filter(house => {
    const rec = recordsMap.get(house.id);
    const status = rec ? rec.status : 'pending';

    // Street filter
    if (selectedStreet !== 'all' && house.street !== selectedStreet) return false;

    // Status filter
    if (statusFilter !== 'all' && status !== statusFilter) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = house.houseNumber.toLowerCase().includes(q);
      const matchName = house.customerName.toLowerCase().includes(q);
      const matchStreet = house.street.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchStreet) return false;
    }

    return true;
  });

  // Action: Deliver with customized or default items
  const handleDeliverHouse = (house: House) => {
    const draft = getHouseDraft(house);
    const defaultProduct = products.find(p => p.id === house.defaultMilkProductId) || products[0];
    const unitPrice = house.customMilkPrice && house.customMilkPrice > 0 ? house.customMilkPrice : defaultProduct.price;

    const items: DeliveryItem[] = [
      {
        productId: defaultProduct.id,
        productName: defaultProduct.name,
        qty: draft.qty,
        unit: defaultProduct.unit,
        unitPrice,
        totalPrice: draft.qty * unitPrice,
      }
    ];

    Object.entries(draft.extraItems).forEach(([prodId, val]) => {
      const extraQty = Number(val) || 0;
      const prod = products.find(p => p.id === prodId);
      if (prod && extraQty > 0) {
        items.push({
          productId: prod.id,
          productName: prod.name,
          qty: extraQty,
          unit: prod.unit,
          unitPrice: prod.price,
          totalPrice: extraQty * prod.price,
        });
      }
    });

    const totalAmount = items.reduce((sum, it) => sum + it.totalPrice, 0);

    const newRecord: DeliveryRecord = {
      id: `deliv-${selectedDate}-${house.id}`,
      date: selectedDate,
      houseId: house.id,
      status: 'delivered',
      items,
      totalAmount,
      updatedAt: new Date().toISOString(),
      updatedBy: deviceName.includes('Secondary') ? 'secondary' : 'primary',
    };

    onUpdateDelivery(newRecord);
  };

  // Action: Mark Default Delivery directly
  const handleMarkDeliveredDefault = (house: House) => {
    const defaultProduct = products.find(p => p.id === house.defaultMilkProductId) || products[0];
    const unitPrice = house.customMilkPrice && house.customMilkPrice > 0 ? house.customMilkPrice : defaultProduct.price;

    const defaultItem: DeliveryItem = {
      productId: defaultProduct.id,
      productName: defaultProduct.name,
      qty: house.defaultMilkQty,
      unit: defaultProduct.unit,
      unitPrice,
      totalPrice: house.defaultMilkQty * unitPrice,
    };

    const newRecord: DeliveryRecord = {
      id: `deliv-${selectedDate}-${house.id}`,
      date: selectedDate,
      houseId: house.id,
      status: 'delivered',
      items: [defaultItem],
      totalAmount: defaultItem.totalPrice,
      updatedAt: new Date().toISOString(),
      updatedBy: deviceName.includes('Secondary') ? 'secondary' : 'primary',
    };

    onUpdateDelivery(newRecord);
  };

  // Action: Mark Vacation
  const handleMarkVacation = (house: House) => {
    const newRecord: DeliveryRecord = {
      id: `deliv-${selectedDate}-${house.id}`,
      date: selectedDate,
      houseId: house.id,
      status: 'vacation',
      items: [],
      totalAmount: 0,
      notes: 'No delivery (Vacation/Absent)',
      updatedAt: new Date().toISOString(),
      updatedBy: deviceName.includes('Secondary') ? 'secondary' : 'primary',
    };

    onUpdateDelivery(newRecord);
  };

  // Action: Reset/Undo to pending
  const handleUndoDelivery = (house: House) => {
    const newRecord: DeliveryRecord = {
      id: `deliv-${selectedDate}-${house.id}`,
      date: selectedDate,
      houseId: house.id,
      status: 'pending',
      items: [],
      totalAmount: 0,
      updatedAt: new Date().toISOString(),
      updatedBy: deviceName.includes('Secondary') ? 'secondary' : 'primary',
    };

    onUpdateDelivery(newRecord);
  };

  // Deliver all pending in current view/street
  const handleDeliverAllCurrentView = () => {
    const pendingInView = filteredHouses.filter(h => {
      const rec = recordsMap.get(h.id);
      return !rec || rec.status === 'pending';
    });

    if (pendingInView.length === 0) return;

    const msg = selectedStreet === 'all' 
      ? `Deliver all ${pendingInView.length} pending houses now?`
      : `Deliver all ${pendingInView.length} pending houses on ${selectedStreet}?`;

    if (confirm(msg)) {
      pendingInView.forEach(house => {
        handleDeliverHouse(house);
      });
    }
  };

  const extraItemModalHouse = extraItemModalHouseIndex !== null ? filteredHouses[extraItemModalHouseIndex] : null;

  return (
    <div className="space-y-4 pb-12">
      {/* Progress & Quick Stats Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-slate-700/80 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Morning Delivery Run
              </span>
              <span className="text-xs text-slate-400">Date: {format(new Date(selectedDate), 'dd MMM yyyy')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              {totalDeliveredCount} / {houses.length} Houses Delivered
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Pending: <strong className="text-amber-400">{totalPendingCount}</strong> • Vacation: <strong className="text-slate-400">{totalVacationCount}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">Milk Delivered</span>
              <span className="text-lg font-black text-emerald-400">{totalMilkLitresDelivered.toFixed(1)} L</span>
            </div>
            <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">Billed Today</span>
              <span className="text-lg font-black text-white">₹{totalRupeesBilledToday.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
              style={{ width: `${houses.length > 0 ? (totalDeliveredCount / houses.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Quick Batch Actions */}
        {totalPendingCount > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Speed Tip: Tap quantity stepper or extra item chips directly on each card!</span>
            </p>
            <button
              onClick={handleDeliverAllCurrentView}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Deliver All {selectedStreet === 'all' ? `${totalPendingCount} Pending` : `on ${selectedStreet}`}</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Bar: View Toggle, Street & Status Filters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Street Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 flex-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Street:
            </span>
            <button
              onClick={() => setSelectedStreet('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                selectedStreet === 'all'
                  ? 'bg-slate-900 text-white border-slate-700 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Streets ({houses.length})
            </button>
            {streets.map(street => {
              const count = houses.filter(h => h.street === street).length;
              const isSel = selectedStreet === street;
              return (
                <button
                  key={street}
                  onClick={() => setSelectedStreet(street)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                    isSel
                      ? 'bg-slate-900 text-white border-slate-700 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {street} ({count})
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle: Cards vs Speed List */}
          <div className="flex items-center bg-white rounded-xl border border-slate-300 p-1 shadow-sm shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards View</span>
            </button>
            <button
              onClick={() => setViewMode('speedList')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'speedList'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Speed Runner List"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ Speed List</span>
            </button>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `All Houses (${houses.length})`, color: 'bg-slate-200 text-slate-800' },
            { id: 'pending', label: `⏳ Pending Today (${totalPendingCount})`, color: 'bg-amber-100 text-amber-800 border-amber-300' },
            { id: 'delivered', label: `✅ Delivered (${totalDeliveredCount})`, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
            { id: 'vacation', label: `🏖️ Vacation (${totalVacationCount})`, color: 'bg-slate-100 text-slate-700 border-slate-300' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                statusFilter === f.id
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Houses Delivery View: Cards or Speed List */}
      {filteredHouses.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-6">
          <Milk className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-700">No houses match your filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try changing the street, search query, or status tab.</p>
        </div>
      ) : viewMode === 'speedList' ? (
        /* SPEED RUNNER LIST VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold">
            <span>⚡ RAPID RUNNER MODE ({filteredHouses.length} Houses)</span>
            <span className="text-slate-300">Tap Checkmark to Deliver instantly</span>
          </div>

          {filteredHouses.map((house, idx) => {
            const record = recordsMap.get(house.id);
            const status = record ? record.status : 'pending';
            const draft = getHouseDraft(house);
            const draftCost = calculateDraftCost(house, draft);
            const defaultProd = products.find(p => p.id === house.defaultMilkProductId) || products[0];

            return (
              <div 
                key={house.id}
                className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                  status === 'delivered'
                    ? 'bg-emerald-50/40'
                    : status === 'vacation'
                    ? 'bg-slate-50/80 opacity-70'
                    : 'hover:bg-amber-50/30'
                }`}
              >
                {/* House Info */}
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div
                    onClick={() => onOpenHouseLedger(house.id)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm cursor-pointer shrink-0 shadow-sm ${
                      status === 'delivered'
                        ? 'bg-emerald-500 text-white'
                        : status === 'vacation'
                        ? 'bg-slate-400 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {house.houseNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 
                        onClick={() => onOpenHouseLedger(house.id)}
                        className="font-extrabold text-slate-900 text-sm hover:text-emerald-700 cursor-pointer leading-tight"
                      >
                        {house.customerName}
                      </h4>
                      {status === 'delivered' && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-md">
                          ✓ Done
                        </span>
                      )}
                      {status === 'vacation' && (
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded-md">
                          Vacation
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{house.street}</p>
                  </div>
                </div>

                {/* Quick Inline Quantity Stepper & Extras */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Milk Stepper */}
                  <div className="flex items-center bg-slate-100 border border-slate-300 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => handleInlineQtyChange(house, draft.qty - 0.5)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 font-bold text-xs shadow-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 font-black text-slate-900 text-xs min-w-[55px] text-center">
                      {draft.qty}L <span className="text-[10px] text-slate-500 font-normal">Milk</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleInlineQtyChange(house, draft.qty + 0.5)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 font-bold text-xs shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 1-Tap Extra Product Chips */}
                  {quickExtraProducts.filter(p => p.id !== defaultProd.id).map(prod => {
                    const count = draft.extraItems[prod.id] || 0;
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleInlineToggleExtra(house, prod.id, count > 0 ? -1 : 1)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                          count > 0
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <span>{prod.name.split(' ')[0]}</span>
                        {count > 0 ? (
                          <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">+{count}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">+₹{prod.price}</span>
                        )}
                      </button>
                    );
                  })}

                  {/* Open Full Customizer */}
                  <button
                    type="button"
                    onClick={() => setExtraItemModalHouseIndex(idx)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                    title="Full items editor"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Instant Actions */}
                <div className="flex items-center gap-2 justify-end shrink-0">
                  <span className="text-xs font-extrabold text-slate-900 min-w-[50px] text-right">
                    ₹{draftCost}
                  </span>

                  {status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleDeliverHouse(house)}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Deliver</span>
                      </button>
                      <button
                        onClick={() => handleMarkVacation(house)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 transition"
                        title="Mark Vacation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleDeliverHouse(house)}
                        className="py-1.5 px-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 transition flex items-center gap-1"
                        title="Re-save updated items"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Update</span>
                      </button>
                      <button
                        onClick={() => handleUndoDelivery(house)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 transition"
                        title="Undo to Pending"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredHouses.map((house, idx) => {
            const record = recordsMap.get(house.id);
            const status = record ? record.status : 'pending';
            const defaultProd = products.find(p => p.id === house.defaultMilkProductId) || products[0];
            const draft = getHouseDraft(house);
            const draftCost = calculateDraftCost(house, draft);

            return (
              <div
                key={house.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md p-4 relative flex flex-col justify-between ${
                  status === 'delivered'
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : status === 'vacation'
                    ? 'border-slate-300 bg-slate-50/80'
                    : 'border-amber-200 hover:border-amber-400'
                }`}
              >
                {/* House Top Details */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        onClick={() => onOpenHouseLedger(house.id)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm cursor-pointer shadow-sm ${
                          status === 'delivered'
                            ? 'bg-emerald-500 text-white'
                            : status === 'vacation'
                            ? 'bg-slate-400 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {house.houseNumber}
                      </div>

                      <div>
                        <h3 
                          onClick={() => onOpenHouseLedger(house.id)}
                          className="font-bold text-slate-900 text-base leading-tight hover:text-emerald-700 cursor-pointer"
                        >
                          {house.customerName}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">{house.street}</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {status === 'delivered' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Delivered</span>
                        </span>
                      ) : status === 'vacation' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Vacation</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          <span>Pending</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fast Inline Adjuster Box */}
                  <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    {/* Milk Quantity Stepper & Quick Pills */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Milk className="w-3.5 h-3.5 text-emerald-600" />
                        {defaultProd.name}:
                      </span>

                      {/* Stepper */}
                      <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleInlineQtyChange(house, draft.qty - 0.5)}
                          className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 font-extrabold text-xs"
                        >
                          -
                        </button>
                        <span className="px-2.5 font-black text-slate-900 text-xs min-w-[45px] text-center">
                          {draft.qty} L
                        </span>
                        <button
                          type="button"
                          onClick={() => handleInlineQtyChange(house, draft.qty + 0.5)}
                          className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 font-extrabold text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Quantity Preset Quick Pills */}
                    <div className="flex items-center gap-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Quick:</span>
                      {[0.5, 1, 1.5, 2, 2.5].map(q => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleInlineQtyChange(house, q)}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition border ${
                            draft.qty === q
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {q}L
                        </button>
                      ))}
                    </div>

                    {/* Quick Add Extra Dairy Chips */}
                    <div className="pt-1.5 border-t border-slate-200/80">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                        <span>+ Quick Add Extras:</span>
                        <button
                          type="button"
                          onClick={() => setExtraItemModalHouseIndex(idx)}
                          className="text-emerald-700 hover:text-emerald-900 text-[11px] font-bold flex items-center gap-0.5"
                        >
                          <span>More</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {quickExtraProducts.map(prod => {
                          const count = draft.extraItems[prod.id] || 0;
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleInlineToggleExtra(house, prod.id, count > 0 ? -1 : 1)}
                              className={`px-2 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border ${
                                count > 0
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              <span>{prod.name.split(' ')[0]}</span>
                              {count > 0 ? (
                                <span className="bg-white/20 px-1.5 rounded-full text-[10px]">+{count}</span>
                              ) : (
                                <span className="text-[10px] text-slate-400">+₹{prod.price}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Total Price Summary */}
                    <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Billed Total:</span>
                      <span className="font-black text-slate-900 text-sm">₹{draftCost}</span>
                    </div>

                    {house.notes && (
                      <p className="text-[11px] text-amber-700 font-medium pt-1 border-t border-slate-200/60 flex items-center gap-1">
                        📌 Note: {house.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom One-Tap Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  {status === 'pending' ? (
                    <>
                      {/* Mark Delivered Button */}
                      <button
                        onClick={() => handleDeliverHouse(house)}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Deliver (₹{draftCost})</span>
                      </button>

                      {/* Vacation Button */}
                      <button
                        onClick={() => handleMarkVacation(house)}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-medium text-xs rounded-xl border border-slate-300 transition flex items-center justify-center"
                        title="Mark No Delivery / Vacation"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Re-save / Update button */}
                      <button
                        onClick={() => handleDeliverHouse(house)}
                        className="flex-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 transition flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Update Order (₹{draftCost})</span>
                      </button>

                      <button
                        onClick={() => handleUndoDelivery(house)}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl border border-slate-300 transition flex items-center gap-1"
                        title="Reset status back to Pending"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Undo</span>
                      </button>
                    </>
                  )}

                  {/* Phone & WhatsApp Link */}
                  {house.phone && (
                    <a
                      href={`https://wa.me/91${house.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${house.customerName}, Om Provisions delivery update for today (${selectedDate}). Thank you!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition shrink-0"
                      title="Send WhatsApp message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extra Items Modal with Rapid Chain-Navigation */}
      {extraItemModalHouse && (
        <ExtraItemModal
          selectedDate={selectedDate}
          house={extraItemModalHouse}
          products={products}
          existingRecord={recordsMap.get(extraItemModalHouse.id)}
          deviceName={deviceName}
          hasNext={extraItemModalHouseIndex !== null && extraItemModalHouseIndex < filteredHouses.length - 1}
          onClose={() => setExtraItemModalHouseIndex(null)}
          onSave={(record, andNext) => {
            onUpdateDelivery(record);
            if (andNext && extraItemModalHouseIndex !== null && extraItemModalHouseIndex < filteredHouses.length - 1) {
              setExtraItemModalHouseIndex(extraItemModalHouseIndex + 1);
            } else {
              setExtraItemModalHouseIndex(null);
            }
          }}
        />
      )}
    </div>
  );
};

// Sub-component: Extra Items Modal
interface ExtraItemModalProps {
  selectedDate: string;
  house: House;
  products: Product[];
  existingRecord?: DeliveryRecord;
  deviceName: string;
  hasNext: boolean;
  onClose: () => void;
  onSave: (record: DeliveryRecord, andNext?: boolean) => void;
}

const ExtraItemModal: React.FC<ExtraItemModalProps> = ({
  selectedDate,
  house,
  products,
  existingRecord,
  deviceName,
  hasNext,
  onClose,
  onSave,
}) => {
  const defaultProd = products.find(p => p.id === house.defaultMilkProductId) || products[0];

  const [items, setItems] = useState<DeliveryItem[]>(() => {
    if (existingRecord && existingRecord.items && existingRecord.items.length > 0) {
      return [...existingRecord.items];
    }
    return [
      {
        productId: defaultProd.id,
        productName: defaultProd.name,
        qty: house.defaultMilkQty,
        unit: defaultProd.unit,
        unitPrice: house.customMilkPrice && house.customMilkPrice > 0 ? house.customMilkPrice : defaultProd.price,
        totalPrice: house.defaultMilkQty * (house.customMilkPrice && house.customMilkPrice > 0 ? house.customMilkPrice : defaultProd.price),
      },
    ];
  });

  const [notes, setNotes] = useState<string>(existingRecord?.notes || '');

  // Add a product item
  const handleAddProduct = (prod: Product) => {
    const existingIndex = items.findIndex(i => i.productId === prod.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].qty += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].qty * prod.price;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          productId: prod.id,
          productName: prod.name,
          qty: 1,
          unit: prod.unit,
          unitPrice: prod.price,
          totalPrice: prod.price,
        },
      ]);
    }
  };

  // Change quantity of an item
  const handleQtyChange = (productId: string, delta: number) => {
    const updated = items
      .map(it => {
        if (it.productId === productId) {
          const newQty = Math.max(0, Math.round((it.qty + delta) * 2) / 2);
          return {
            ...it,
            qty: newQty,
            totalPrice: newQty * it.unitPrice,
          };
        }
        return it;
      })
      .filter(it => it.qty > 0);
    setItems(updated);
  };

  // Quick set milk quantity preset
  const handleSetMilkQtyPreset = (newQty: number) => {
    const milkItemIndex = items.findIndex(i => i.productName.toLowerCase().includes('milk') || i.productId === defaultProd.id);
    if (milkItemIndex >= 0) {
      const updated = [...items];
      updated[milkItemIndex].qty = newQty;
      updated[milkItemIndex].totalPrice = newQty * updated[milkItemIndex].unitPrice;
      setItems(updated);
    } else {
      setItems([
        {
          productId: defaultProd.id,
          productName: defaultProd.name,
          qty: newQty,
          unit: defaultProd.unit,
          unitPrice: defaultProd.price,
          totalPrice: newQty * defaultProd.price,
        },
        ...items,
      ]);
    }
  };

  const grandTotal = items.reduce((sum, it) => sum + it.totalPrice, 0);

  const handleFormSave = (andNext: boolean = false) => {
    const newRecord: DeliveryRecord = {
      id: existingRecord?.id || `deliv-${selectedDate}-${house.id}`,
      date: selectedDate,
      houseId: house.id,
      status: items.length > 0 ? 'delivered' : 'vacation',
      items,
      totalAmount: grandTotal,
      notes,
      updatedAt: new Date().toISOString(),
      updatedBy: deviceName.includes('Secondary') ? 'secondary' : 'primary',
    };
    onSave(newRecord, andNext);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center">
              {house.houseNumber}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight">{house.customerName}</h3>
              <p className="text-xs text-slate-400">{house.street}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Milk Presets */}
          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
              <span className="flex items-center gap-1.5">
                <Milk className="w-4 h-4 text-emerald-700" />
                <span>1-Tap Milk Presets ({defaultProd.name})</span>
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[0.5, 1, 1.5, 2, 3].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSetMilkQtyPreset(q)}
                  className="py-1.5 px-1 bg-white hover:bg-emerald-600 hover:text-white text-emerald-900 border border-emerald-300 font-extrabold text-xs rounded-xl shadow-xs transition text-center"
                >
                  {q} Litre
                </button>
              ))}
            </div>
          </div>

          {/* Items Currently Selected */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Selected Items for Today
            </h4>

            {items.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl text-center">
                No items selected. Saving will mark this house as Vacation / No Delivery.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">
                        ₹{item.unitPrice} / {item.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-white rounded-xl border border-slate-300 overflow-hidden shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.productId, -0.5)}
                          className="px-3 py-1.5 text-slate-700 hover:bg-slate-100 font-black text-sm"
                        >
                          -
                        </button>
                        <span className="px-3 font-black text-slate-900 text-xs">
                          {item.qty} {item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.productId, 0.5)}
                          className="px-3 py-1.5 text-slate-700 hover:bg-slate-100 font-black text-sm"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-extrabold text-slate-900 text-sm min-w-[55px] text-right">
                        ₹{item.totalPrice}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Add Extra Products */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              + Add Extra Dairy Products (1-Tap)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products.map(prod => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleAddProduct(prod)}
                  className="p-2.5 bg-white hover:bg-emerald-50 text-left rounded-2xl border border-slate-200 hover:border-emerald-400 transition flex items-center justify-between group shadow-xs active:scale-95"
                >
                  <div className="overflow-hidden pr-1">
                    <span className="block font-bold text-xs text-slate-800 truncate group-hover:text-emerald-900">
                      {prod.name}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      ₹{prod.price} / {prod.unit}
                    </span>
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Delivery Note / Special Instruction
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Left packet on main gate"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">Total Amount</span>
            <span className="text-xl font-black text-slate-900">₹{grandTotal}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 bg-white text-slate-700 font-bold text-xs rounded-xl border border-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => handleFormSave(false)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save & Deliver</span>
            </button>
            {hasNext && (
              <button
                onClick={() => handleFormSave(true)}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1 active:scale-95"
                title="Save this house and move immediately to the next house"
              >
                <span>Save & Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
