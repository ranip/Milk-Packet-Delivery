import React, { useState } from 'react';
import { House, Product, DeliveryRecord, PaymentRecord, AiParseResult } from '../types';
import { 
  BarChart3, Milk, Sparkles, Mic, Send, Check, AlertCircle, ShoppingBag, Truck 
} from 'lucide-react';
import { format } from 'date-fns';

interface AnalyticsAndStockProps {
  selectedDate: string; // YYYY-MM-DD
  houses: House[];
  products: Product[];
  deliveryRecords: DeliveryRecord[];
  paymentRecords: PaymentRecord[];
  onUpdateDelivery: (record: DeliveryRecord) => void;
  onAddPayment: (payment: PaymentRecord) => void;
}

export const AnalyticsAndStock: React.FC<AnalyticsAndStockProps> = ({
  selectedDate,
  houses,
  products,
  deliveryRecords,
  paymentRecords,
  onUpdateDelivery,
  onAddPayment,
}) => {
  const [aiInputText, setAiInputText] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiParseResult, setAiParseResult] = useState<AiParseResult | null>(null);

  // Calculate morning stock requirements for today
  const productStockDemand = new Map<string, { product: Product; qty: number; count: number }>();

  products.forEach(p => {
    productStockDemand.set(p.id, { product: p, qty: 0, count: 0 });
  });

  const todayRecords = deliveryRecords.filter(r => r.date === selectedDate);

  houses.forEach(house => {
    const rec = todayRecords.find(r => r.houseId === house.id);
    
    if (rec && rec.status === 'delivered') {
      rec.items.forEach(item => {
        const curr = productStockDemand.get(item.productId);
        if (curr) {
          curr.qty += item.qty;
          curr.count += 1;
        }
      });
    } else if (!rec || rec.status === 'pending') {
      // Default subscription demand
      const defaultProd = products.find(p => p.id === house.defaultMilkProductId) || products[0];
      const curr = productStockDemand.get(defaultProd.id);
      if (curr) {
        curr.qty += house.defaultMilkQty;
        curr.count += 1;
      }
    }
  });

  const stockList = Array.from(productStockDemand.values()).filter(s => s.qty > 0);

  // Call Gemini AI parser endpoint
  const handleAiParse = async () => {
    if (!aiInputText.trim()) return;
    setIsAiLoading(true);
    setAiParseResult(null);

    try {
      const houseList = houses.map(h => ({
        houseNumber: h.houseNumber,
        customerName: h.customerName,
        street: h.street,
      }));

      const res = await fetch('/api/ai/parse-voice-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiInputText, houseList }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setAiParseResult({
          ...data.result,
          rawText: aiInputText,
        });
      } else {
        alert('Could not parse text note via Gemini AI.');
      }
    } catch (err: any) {
      alert(`AI parse error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Confirm AI Action
  const handleConfirmAiAction = () => {
    if (!aiParseResult) return;

    // Find house
    let targetHouse = houses.find(h => 
      aiParseResult.houseNumber && h.houseNumber.toLowerCase().includes(aiParseResult.houseNumber.toLowerCase())
    );

    if (!targetHouse && aiParseResult.customerName) {
      targetHouse = houses.find(h => 
        h.customerName.toLowerCase().includes(aiParseResult.customerName!.toLowerCase())
      );
    }

    if (!targetHouse) {
      alert('Could not match house number or customer name from AI result. Please verify house number.');
      return;
    }

    if (aiParseResult.actionType === 'delivery') {
      const items = (aiParseResult.items || []).map(it => {
        const prod = products.find(p => p.name.toLowerCase().includes(it.productName.toLowerCase())) || products[0];
        return {
          productId: prod.id,
          productName: prod.name,
          qty: it.qty || 1,
          unit: prod.unit,
          unitPrice: prod.price,
          totalPrice: (it.qty || 1) * prod.price,
        };
      });

      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

      const record: DeliveryRecord = {
        id: `deliv-${selectedDate}-${targetHouse.id}`,
        date: selectedDate,
        houseId: targetHouse.id,
        status: 'delivered',
        items,
        totalAmount,
        notes: `AI Voice Log: ${aiInputText}`,
        updatedAt: new Date().toISOString(),
        updatedBy: 'primary',
      };

      onUpdateDelivery(record);
      alert(`Updated delivery for ${targetHouse.customerName} (${targetHouse.houseNumber})!`);
    } else if (aiParseResult.actionType === 'payment' && aiParseResult.paymentAmount) {
      const payment: PaymentRecord = {
        id: `pay-${Date.now()}-${targetHouse.id}`,
        date: selectedDate,
        houseId: targetHouse.id,
        amount: aiParseResult.paymentAmount,
        paymentMode: aiParseResult.paymentMode || 'cash',
        referenceNote: `AI Log: ${aiInputText}`,
        receivedBy: 'primary',
        createdAt: new Date().toISOString(),
      };

      onAddPayment(payment);
      alert(`Recorded payment of ₹${aiParseResult.paymentAmount} for ${targetHouse.customerName}!`);
    }

    setAiParseResult(null);
    setAiInputText('');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Morning Stock & AI Assistant
            </span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white mt-1">Daily Delivery Requirement & Smart Logger</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Know exact crates and litres to load for {format(new Date(selectedDate), 'dd MMM yyyy')}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Morning Stock Requirement Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
            <Truck className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Morning Dairy Stock Needed</h3>
              <p className="text-xs text-slate-500">Total packets/litres required for today's run</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {stockList.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No stock needed for selected date.</p>
            ) : (
              stockList.map(({ product, qty, count }) => (
                <div
                  key={product.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 font-black text-sm flex items-center justify-center">
                      <Milk className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{product.name}</h4>
                      <p className="text-xs text-slate-500">
                        {count} Houses • Rate: ₹{product.price}/{product.unit}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-700">
                      {qty} {product.unit}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-bold">
                      Est Value: ₹{(qty * product.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Voice / Smart Text Quick Logger (Gemini API) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-2xl border border-slate-700 p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-extrabold text-white text-base">AI Smart Voice / Text Note Assistant</h3>
                <p className="text-xs text-slate-400">Powered by Gemini AI for rapid delivery & payment entry</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-2">
              Speak or type natural voice notes while walking during delivery:
            </p>

            <div className="space-y-1 text-[11px] text-slate-400 mb-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <p>💡 Example 1: <em>"House A-102 took 2 packets curd and 1 paneer today"</em></p>
              <p>💡 Example 2: <em>"Gupta house B-201 paid 1500 rupees cash"</em></p>
            </div>

            <div className="space-y-2">
              <textarea
                rows={3}
                value={aiInputText}
                onChange={e => setAiInputText(e.target.value)}
                placeholder="Type or paste quick note here..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />

              <button
                onClick={handleAiParse}
                disabled={isAiLoading || !aiInputText.trim()}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                {isAiLoading ? (
                  <span>Processing note via Gemini AI...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Process Note with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Result Preview Modal/Card */}
          {aiParseResult && (
            <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-emerald-500/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>AI Parsed Structure:</span>
                <span className="capitalize text-slate-300">Action: {aiParseResult.actionType}</span>
              </div>

              <div className="text-xs text-slate-200 space-y-1">
                {aiParseResult.houseNumber && <p>• House Detected: <strong>{aiParseResult.houseNumber}</strong></p>}
                {aiParseResult.paymentAmount && <p>• Payment Amount: <strong>₹{aiParseResult.paymentAmount} ({aiParseResult.paymentMode})</strong></p>}
                {aiParseResult.items && aiParseResult.items.length > 0 && (
                  <p>• Items: {aiParseResult.items.map(i => `${i.qty} x ${i.productName}`).join(', ')}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={handleConfirmAiAction}
                  className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirm & Save Record</span>
                </button>
                <button
                  onClick={() => setAiParseResult(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
