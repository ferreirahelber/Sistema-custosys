import React, { useState } from 'react';
import { X, ShoppingCart, History, Plus, Building2, Tag, Calendar, Package, DollarSign, TrendingUp, Info } from 'lucide-react';
import { Ingredient, IngredientPurchase } from '../types';
import { useIngredientPurchases, usePurchaseSuggestions } from '../hooks/useIngredients';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SmartCombobox } from './common/SmartCombobox';

interface IngredientPurchaseModalProps {
  ingredient: Ingredient;
  onClose: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function IngredientPurchaseModal({ ingredient, onClose }: IngredientPurchaseModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'new-purchase'>('history');
  const { purchases, loading, addPurchase, isAdding } = useIngredientPurchases(ingredient.id);
  const { brands, suppliers, renameBrand, renameSupplier } = usePurchaseSuggestions();

  const [formData, setFormData] = useState({
    brand: '',
    supplier: '',
    price: '',
    quantity: '',
    unit: ingredient.base_unit || 'g',
    purchase_date: format(new Date(), 'yyyy-MM-dd')
  });

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand || !formData.supplier || !formData.price || !formData.quantity) return;

    let multiplier = 1;
    if ((formData.unit === 'kg' && ingredient.base_unit === 'g') || (formData.unit === 'l' && ingredient.base_unit === 'ml')) {
      multiplier = 1000;
    }

    const convertedQuantity = parseFloat(formData.quantity) * multiplier;

    try {
      await addPurchase({
        ingredient_id: ingredient.id!,
        brand: formData.brand,
        supplier: formData.supplier,
        price: parseFloat(formData.price),
        quantity: convertedQuantity,
        unit: ingredient.base_unit || formData.unit,
        purchase_date: formData.purchase_date
      });
      
      // Reset form and go to history
      setFormData({
        ...formData,
        brand: '',
        supplier: '',
        price: '',
        quantity: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd')
      });
      setActiveTab('history');
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition z-10"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{ingredient.name}</h2>
              <p className="text-sm text-slate-500">Gestão de Estoque e Preços</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition border-b-2 ${
              activeTab === 'history' 
                ? 'border-amber-500 text-amber-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <History size={18} />
            Histórico de Compras
          </button>
          <button
            onClick={() => setActiveTab('new-purchase')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition border-b-2 ${
              activeTab === 'new-purchase' 
                ? 'border-amber-500 text-amber-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Plus size={18} />
            Nova Compra
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'history' ? (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <p>Carregando histórico...</p>
                </div>
              ) : purchases.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
                  <ShoppingCart size={48} strokeWidth={1} />
                  <p className="text-center text-sm max-w-[240px]">
                    Nenhuma compra registrada para este ingrediente ainda.
                  </p>
                  <button 
                    onClick={() => setActiveTab('new-purchase')}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold text-xs"
                  >
                    Registrar Primeira Compra
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {purchases.map((purchase) => (
                      <div key={purchase.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm group hover:border-amber-300 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {format(parseISO(purchase.purchase_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                          </span>
                          <div className="p-1.5 bg-slate-50 text-slate-400 rounded group-hover:bg-amber-50 group-hover:text-amber-500 transition">
                            <TrendingUp size={14} />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Building2 size={14} className="text-slate-400" />
                            <span className="font-bold text-sm truncate">{purchase.supplier}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Tag size={14} className="text-slate-400" />
                            <span className="text-sm">{purchase.brand}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-end">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Quantidade</p>
                            <p className="text-sm font-black text-slate-700">{purchase.quantity} {purchase.unit}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Preço Pago</p>
                            <p className="text-lg font-black text-amber-600">{formatCurrency(purchase.price)}</p>
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                           <span className="text-[10px] text-slate-400 font-medium">Custo Unitário: {formatCurrency(purchase.price / purchase.quantity)} / {purchase.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden lg:flex-row flex-col">
              {/* Form Side */}
              <div className="lg:w-1/2 p-6 border-r border-slate-100 overflow-y-auto bg-white">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Plus size={18} className="text-amber-500" /> Informações da Compra
                </h3>
                
                <form onSubmit={handleAddPurchase} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <SmartCombobox
                        label="Marca"
                        value={formData.brand}
                        options={brands}
                        onChange={(val) => setFormData({ ...formData, brand: val })}
                        onRename={async (old, newVal) => await renameBrand({ oldName: old, newName: newVal })}
                        placeholder="Ex: Italac, Mococa..."
                        icon={<Tag size={16} />}
                      />
                    </div>

                    <div className="col-span-2">
                       <SmartCombobox
                        label="Local de Compra (Fornecedor)"
                        value={formData.supplier}
                        options={suppliers}
                        onChange={(val) => setFormData({ ...formData, supplier: val })}
                        onRename={async (old, newVal) => await renameSupplier({ oldName: old, newName: newVal })}
                        placeholder="Ex: Assaí, Atacadão..."
                        icon={<Building2 size={16} />}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Preço Total (R$)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 text-slate-400" size={16} />
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.price}
                          onChange={e => setFormData({ ...formData, price: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 font-black"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Quantidade Comprada</label>
                      <div className="flex">
                        <input
                          type="number"
                          step="0.001"
                          required
                          value={formData.quantity}
                          onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                          className="w-full px-4 py-2.5 border-l border-t border-b rounded-l-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 font-bold"
                          placeholder="0.00"
                        />
                        <select
                          value={formData.unit}
                          onChange={e => setFormData({ ...formData, unit: e.target.value })}
                          className="px-3 border rounded-r-lg bg-slate-50 text-slate-700 font-bold text-xs"
                        >
                          <option value="kg">kg</option>
                          <option value="l">l</option>
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                          <option value="un">un</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-span-2">
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data da Compra</label>
                       <div className="relative">
                        <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                        <input
                          type="date"
                          required
                          value={formData.purchase_date}
                          onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAdding}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdding ? (
                      <span className="flex items-center gap-2">
                         Registrando...
                      </span>
                    ) : (
                      <>
                        <Save size={18} />
                        Registrar Entrada de Estoque
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Summary Side */}
              <div className="lg:w-1/2 p-10 bg-slate-50 flex flex-col justify-center items-center text-center">
                <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-[300px] w-full">
                   <p className="text-xs font-bold text-slate-400 uppercase mb-1">Custo Médio p/ {ingredient.base_unit || 'un'}</p>
                   {formData.price && formData.quantity ? (
                     <p className="text-3xl font-black text-amber-600">
                        {formatCurrency(parseFloat(formData.price) / (parseFloat(formData.quantity) * (
                          (formData.unit === 'kg' && ingredient.base_unit === 'g') || (formData.unit === 'l' && ingredient.base_unit === 'ml') ? 1000 : 1
                        )))}
                        <span className="text-sm font-bold text-slate-400 ml-1">/ {ingredient.base_unit || 'un'}</span>
                     </p>
                   ) : (
                     <p className="text-xl font-bold text-slate-300 italic">Insira os valores</p>
                   )}
                </div>
                
                <div className="max-w-[320px] space-y-4">
                  <div className="flex gap-4 text-left p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="text-amber-500 shrink-0">
                      <Info size={24} />
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed font-medium">
                      Ao registrar uma nova compra, o sistema irá **somar** a quantidade ao estoque atual e **atualizar** o custo unitário base nas suas receitas.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-left">
                     <p className="text-[10px] font-bold text-blue-400 uppercase mb-1 tracking-wider">Estoque Atual</p>
                     <p className="text-lg font-black text-blue-700">
                       {ingredient.current_stock || 0} {ingredient.base_unit || 'g'}
                     </p>
                     <div className="mt-2 text-[10px] text-blue-600 font-bold uppercase flex items-center gap-1">
                        <TrendingUp size={10} /> + {formData.quantity || 0} {formData.unit} em reposição
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Save(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
