import React, { useState } from 'react';
import { Product, ProductCategory } from '../types';
import { Package, Plus, Edit, Trash2, Check } from 'lucide-react';

interface ProductRateCardProps {
  products: Product[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

export const ProductRateCard: React.FC<ProductRateCardProps> = ({
  products,
  onSaveProduct,
  onDeleteProduct,
}) => {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTargetProduct, setDeleteTargetProduct] = useState<Product | null>(null);

  const handleDeleteConfirm = () => {
    if (!deleteTargetProduct) return;
    if (products.length <= 1) {
      alert('You must keep at least one product in your rate card.');
      setDeleteTargetProduct(null);
      return;
    }
    onDeleteProduct(deleteTargetProduct.id);
    setDeleteTargetProduct(null);
    if (editingProduct?.id === deleteTargetProduct.id) {
      setEditingProduct(null);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-400" />
            <span>Product Rate Card & Price Settings</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Configure default prices per Litre / Packet for Milk, Curd, Paneer, Butter, and Ghee.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setIsAddOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Product Item</span>
        </button>
      </div>

      {/* Mid-Month Price Change Helper Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-900">
        <span className="text-base leading-none">💡</span>
        <div className="space-y-1">
          <p className="font-bold text-emerald-950">Mid-Month Price Adjustments & Custom Packet Rates:</p>
          <p className="text-slate-700">
            • <strong>Mid-Month Rate Update:</strong> If milk purchase prices change mid-month, edit the rate here. Past deliveries will keep their historical recorded amount, and all new deliveries starting today will use the new price.
          </p>
          <p className="text-slate-700">
            • <strong>Different Base Packet / Rates per House:</strong> You can set custom milk packet rates and daily delivery charges per house under the <strong>Houses</strong> tab!
          </p>
        </div>
      </div>

      {/* Product List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {products.map(product => (
          <div
            key={product.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition flex items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base">{product.name}</span>
                {product.isDefaultMilk && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    Default Milk
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Category: <strong className="capitalize text-slate-700">{product.category}</strong> • Unit: <strong className="text-slate-700">{product.unit}</strong>
              </p>
              <p className="text-lg font-black text-emerald-700 mt-1">
                ₹{product.price} <span className="text-xs font-semibold text-slate-500">/ {product.unit}</span>
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditingProduct(product)}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition flex items-center gap-1 text-xs font-semibold"
                title="Edit Product Price"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden xs:inline">Edit</span>
              </button>

              <button
                onClick={() => setDeleteTargetProduct(product)}
                className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition flex items-center gap-1 text-xs font-semibold"
                title="Delete Product"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden xs:inline">Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Product Edit / Add Modal */}
      {(isAddOpen || editingProduct) && (
        <ProductFormModal
          existingProduct={editingProduct || undefined}
          onClose={() => {
            setIsAddOpen(false);
            setEditingProduct(null);
          }}
          onSave={(p) => {
            onSaveProduct(p);
            setIsAddOpen(false);
            setEditingProduct(null);
          }}
          onDelete={() => {
            if (editingProduct) {
              setDeleteTargetProduct(editingProduct);
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetProduct && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Delete Product?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to remove <strong>{deleteTargetProduct.name}</strong> from your rate card?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
              <p>• <strong>Unit:</strong> {deleteTargetProduct.unit}</p>
              <p>• <strong>Current Price:</strong> ₹{deleteTargetProduct.price}</p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTargetProduct(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Yes, Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ProductFormModalProps {
  existingProduct?: Product;
  onClose: () => void;
  onSave: (product: Product) => void;
  onDelete?: () => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  existingProduct,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(existingProduct?.name || '');
  const [category, setCategory] = useState<ProductCategory>(existingProduct?.category || 'milk');
  const [unit, setUnit] = useState(existingProduct?.unit || 'Litre');
  const [price, setPrice] = useState<number>(existingProduct?.price || 60);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price <= 0) {
      alert('Product Name and valid price are required.');
      return;
    }

    const prod: Product = {
      id: existingProduct?.id || `prod-${Date.now()}`,
      name,
      category,
      unit,
      price: Number(price),
      isDefaultMilk: existingProduct?.isDefaultMilk || false,
    };

    onSave(prod);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">
            {existingProduct ? `Edit ${existingProduct.name}` : 'Add New Dairy Product'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Fresh Curd 500g"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ProductCategory)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              >
                <option value="milk">Milk</option>
                <option value="curd">Curd / Dahi</option>
                <option value="paneer">Paneer</option>
                <option value="butter">Butter</option>
                <option value="ghee">Ghee</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unit Label</label>
              <input
                type="text"
                required
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="e.g. Litre, 500g Pkt"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Standard Rate Price (₹) *</label>
            <input
              type="number"
              required
              min="1"
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-black text-emerald-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
            {existingProduct && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete();
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
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
                Save Product
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
