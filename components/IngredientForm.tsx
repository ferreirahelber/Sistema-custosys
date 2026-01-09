import React, { useState, useEffect } from 'react';
import { Ingredient, Unit, MeasureConversion } from '../types';
import { calculateBaseCost } from '../utils/calculations';
import { IngredientService } from '../services/ingredientService';
import {
  Plus,
  Trash2,
  Package,
  Scale,
  AlertCircle,
  Loader2,
  Edit,
  Save,
  X,
  Box,
  Calculator,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner'; // <--- Importando toast

export const IngredientForm: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stockEntryMode, setStockEntryMode] = useState<'package' | 'unit'>('package');

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    amount: '',
    unit: Unit.G,
    current_stock: '',
    min_stock: '',
  });

  const [conversions, setConversions] = useState<MeasureConversion[]>([]);
  const [newConvName, setNewConvName] = useState('Xícara (chá)');
  const [newConvValue, setNewConvValue] = useState('');

  const commonMeasures = [
    'Xícara (chá)',
    'Colher (sopa)',
    'Colher (chá)',
    'Copo Americano',
    'Pitada',
  ];

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      setLoading(true);
      const data = await IngredientService.getAll();
      setIngredients(data);
    } catch (error) {
      console.error('Erro ao carregar:', error);
      toast.error('Erro ao carregar ingredientes.');
    } finally {
      setLoading(false);
    }
  };

  // --- HELPERS ---
  const getMultiplier = (unit: string) => {
    const cleanUnit = unit.toLowerCase();
    return cleanUnit === 'kg' || cleanUnit === 'l' ? 1000 : 1;
  };

  const formatStockDisplay = (stock: number, baseUnit: string) => {
    if (!stock) return '0';
    if (baseUnit === 'g' && stock >= 1000) return `${parseFloat((stock / 1000).toFixed(3))} kg`;
    if (baseUnit === 'ml' && stock >= 1000) return `${parseFloat((stock / 1000).toFixed(3))} L`;
    return `${parseFloat(stock.toFixed(3))} ${baseUnit}`;
  };

  const calculatePackageCount = (stockTotal: number, packageAmount: number, unit: string) => {
    if (!stockTotal || !packageAmount) return 0;
    const multiplier = getMultiplier(unit);
    const onePackageSizeBase = packageAmount * multiplier;
    const count = stockTotal / onePackageSizeBase;
    return Number.isInteger(count) ? count : count.toFixed(2);
  };

  // --- HANDLERS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addConversion = () => {
    if (!newConvName || !newConvValue) return;
    const newItem: MeasureConversion = { name: newConvName, value: parseFloat(newConvValue) };
    setConversions([...conversions, newItem]);
    setNewConvValue('');
  };

  const removeConversion = (idx: number) => {
    setConversions(conversions.filter((_, i) => i !== idx));
  };

  // --- EDITAR ---
  const handleEdit = (ing: Ingredient) => {
    setEditingId(ing.id);

    const multiplier = getMultiplier(ing.package_unit);
    const packageSizeInBaseUnit = ing.package_amount * multiplier;

    let displayStock = '';

    if (ing.current_stock && packageSizeInBaseUnit > 0) {
      const stockInPackages = ing.current_stock / packageSizeInBaseUnit;
      if (Math.abs(Math.round(stockInPackages) - stockInPackages) < 0.001) {
        setStockEntryMode('package');
        displayStock = Math.round(stockInPackages).toString();
      } else {
        setStockEntryMode('unit');
        const displayMultiplier = getMultiplier(ing.package_unit);
        displayStock = (ing.current_stock / displayMultiplier).toString();
      }
    }

    const minStockDisplay = ing.min_stock
      ? (ing.min_stock / getMultiplier(ing.package_unit)).toString()
      : '10';

    setFormData({
      name: ing.name,
      price: ing.package_price.toString(),
      amount: ing.package_amount.toString(),
      unit: ing.package_unit,
      current_stock: displayStock,
      min_stock: minStockDisplay,
    });
    setConversions(ing.conversions || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    clearForm();
  };

  // --- SALVAR ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseFloat(formData.price);
    const amount = parseFloat(formData.amount);
    const stockInput = parseFloat(formData.current_stock) || 0;

    const minStockInput = parseFloat(formData.min_stock);
    const multiplier = getMultiplier(formData.unit);

    const minStockBase = isNaN(minStockInput) ? 10 : minStockInput * multiplier;

    let stockBase = 0;
    if (stockEntryMode === 'package') {
      stockBase = stockInput * amount * multiplier;
    } else {
      stockBase = stockInput * multiplier;
    }

    if (!formData.name || isNaN(price) || isNaN(amount)) {
      toast.warning('Preencha o nome, preço e quantidade da embalagem.');
      return;
    }

    try {
      setSaving(true);
      const { baseCost, baseUnit } = calculateBaseCost(price, amount, formData.unit);

      const ingredientData = {
        name: formData.name,
        package_price: price,
        package_amount: amount,
        package_unit: formData.unit,
        unit_cost_base: baseCost,
        base_unit: baseUnit,
        current_stock: stockBase,
        min_stock: minStockBase,
        conversions: conversions,
      };

      if (editingId) {
        await IngredientService.update(editingId, ingredientData);
        toast.success('Ingrediente atualizado!');
      } else {
        await IngredientService.create(ingredientData);
        toast.success('Ingrediente salvo!');
      }

      await loadIngredients();
      cancelEdit();
    } catch (error: any) {
      console.error('ERRO:', error);
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir ingrediente permanentemente?')) {
      try {
        await IngredientService.delete(id);
        setIngredients(ingredients.filter((i) => i.id !== id));
        if (editingId === id) cancelEdit();
        toast.success('Ingrediente excluído.');
      } catch (error) {
        toast.error('Erro ao excluir ingrediente.');
      }
    }
  };

  const clearForm = () => {
    setFormData({
      name: '',
      price: '',
      amount: '',
      unit: Unit.G,
      current_stock: '',
      min_stock: '',
    });
    setConversions([]);
    setNewConvValue('');
    setEditingId(null);
    setStockEntryMode('package');
  };

  const previewCost = () => {
    const price = parseFloat(formData.price);
    const amount = parseFloat(formData.amount);
    if (isNaN(price) || isNaN(amount) || amount === 0) return null;
    const { baseCost, baseUnit } = calculateBaseCost(price, amount, formData.unit);
    return `R$ ${baseCost.toFixed(4)} / ${baseUnit}`;
  };

  const currentBaseUnit = calculateBaseCost(0, 1, formData.unit).baseUnit;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* FORMULÁRIO */}
      <div className="lg:col-span-1 space-y-6 sticky top-6 h-fit">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              {editingId ? 'Editar Ingrediente' : 'Novo Ingrediente'}
            </h3>
            {editingId && (
              <button
                onClick={cancelEdit}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
              >
                <X size={14} /> Cancelar
              </button>
            )}
          </div>

          <form id="ing-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Item</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Ex: Embalagem Bombom"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Qtd Embalagem
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: 100"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  {Object.values(Unit).map((u) => (
                    <option key={u} value={u}>
                      {u.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* --- BLOCO DE ESTOQUE --- */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Calculator size={16} className="text-amber-600" /> Lançamento de Estoque
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setStockEntryMode('package')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded border transition ${stockEntryMode === 'package' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                    📦 Por Pacote
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockEntryMode('unit')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded border transition ${stockEntryMode === 'unit' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                    🔢 Qtd Solta
                  </button>
                </div>
                <input
                  type="number"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder={
                    stockEntryMode === 'package' ? 'Ex: 1 (1 pacote)' : 'Ex: 100 (100 un)'
                  }
                />
              </div>
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> Alerta de Estoque Mínimo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="min_stock"
                    value={formData.min_stock}
                    onChange={handleInputChange}
                    className="w-24 px-3 py-1.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="10"
                  />
                  <span className="text-xs text-slate-500">{formData.unit}</span>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                Custo Unitário Base
              </span>
              <div className="text-lg font-bold text-amber-600">{previewCost() || '---'}</div>
            </div>
          </form>
        </div>

        {/* MEDIDAS CASEIRAS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-600" /> Medidas Caseiras
          </h4>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <select
                value={newConvName}
                onChange={(e) => setNewConvName(e.target.value)}
                className="w-full px-2 py-2 text-sm border rounded-lg bg-white"
              >
                {commonMeasures.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-20 relative">
              <input
                type="number"
                value={newConvValue}
                onChange={(e) => setNewConvValue(e.target.value)}
                placeholder="0"
                className="w-full px-2 py-2 text-sm border rounded-lg"
              />
              <span className="absolute right-1 top-2 text-xs text-slate-400">
                {currentBaseUnit}
              </span>
            </div>
            <button
              type="button"
              onClick={addConversion}
              className="px-3 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-600"
            >
              <Plus size={16} />
            </button>
          </div>
          {conversions.length > 0 && (
            <div className="space-y-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              {conversions.map((conv, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-sm p-1 border-b border-slate-200 last:border-0"
                >
                  <span className="text-slate-700">1 {conv.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-700">
                      {conv.value} {currentBaseUnit}
                    </span>
                    <button
                      onClick={() => removeConversion(idx)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          form="ing-form"
          disabled={saving}
          className={`w-full font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-white ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {saving ? (
            <Loader2 className="animate-spin" />
          ) : editingId ? (
            <Save size={18} />
          ) : (
            <Plus size={18} />
          )}
          {editingId ? 'Atualizar Item' : 'Salvar Item'}
        </button>
      </div>

      {/* LISTAGEM (Inalterada) */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">Base de Ingredientes & Produtos</h3>
          {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">Preço/Emb.</th>
                <th className="px-4 py-3 font-semibold">Custo Unit.</th>
                <th className="px-4 py-3 font-semibold">Qtd Emb.</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ingredients.map((ing) => {
                const minStock = ing.min_stock || 10;
                const isLowStock = (ing.current_stock || 0) < minStock;

                return (
                  <tr
                    key={ing.id}
                    className={`hover:bg-slate-50 transition ${editingId === ing.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-800">{ing.name}</div>
                      {ing.conversions && ing.conversions.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {ing.conversions.map((c: any, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] bg-amber-50 text-amber-700 px-1 rounded border border-amber-100"
                            >
                              1{c.name}={c.value}
                              {ing.base_unit}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-600 text-sm whitespace-nowrap">
                      R$ {ing.package_price.toFixed(2)}{' '}
                      <span className="text-xs ml-1">
                        ({ing.package_amount}
                        {ing.package_unit})
                      </span>
                    </td>
                    <td className="px-4 py-4 text-amber-600 font-semibold whitespace-nowrap">
                      R$ {ing.unit_cost_base.toFixed(2)}{' '}
                      <span className="text-xs text-slate-400">/{ing.base_unit}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Box size={14} className="text-slate-400" />
                        {calculatePackageCount(
                          ing.current_stock,
                          ing.package_amount,
                          ing.package_unit
                        )}
                        <span className="text-xs text-slate-400 font-normal">emb</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${isLowStock ? 'text-red-500' : 'text-green-600'}`}
                        >
                          {formatStockDisplay(ing.current_stock, ing.base_unit)}
                        </span>
                        {isLowStock && (
                          <div className="group relative">
                            <AlertCircle size={14} className="text-red-400 cursor-help" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                              Mínimo: {formatStockDisplay(minStock, ing.base_unit)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(ing)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(ing.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && ingredients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Nenhum ingrediente cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
