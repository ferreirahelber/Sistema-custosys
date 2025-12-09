import React, { useState, useEffect } from 'react';
import { Ingredient, Unit } from '../types';
import { calculateBaseCost } from '../utils/calculations';
import { StorageService } from '../services/storage';
import { Plus, Trash2, Package, Edit2 } from 'lucide-react';

export const IngredientForm: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    amount: '',
    unit: Unit.G
  });

  useEffect(() => {
    setIngredients(StorageService.getIngredients());
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setFormData({
      name: ing.name,
      price: ing.package_price.toString(),
      amount: ing.package_amount.toString(),
      unit: ing.package_unit
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', price: '', amount: '', unit: Unit.G });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formData.price);
    const amount = parseFloat(formData.amount);

    if (!formData.name || isNaN(price) || isNaN(amount)) return;

    const { baseCost, baseUnit } = calculateBaseCost(price, amount, formData.unit);

    const newIngredient: Ingredient = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      package_price: price,
      package_amount: amount,
      package_unit: formData.unit,
      unit_cost_base: baseCost,
      base_unit: baseUnit
    };

    const updated = StorageService.saveIngredient(newIngredient);
    setIngredients(updated);
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este ingrediente?')) {
      const updated = StorageService.deleteIngredient(id);
      setIngredients(updated);
      if (editingId === id) cancelEdit();
    }
  };

  const previewCost = () => {
    const price = parseFloat(formData.price);
    const amount = parseFloat(formData.amount);
    if (isNaN(price) || isNaN(amount) || amount === 0) return null;
    const { baseCost, baseUnit } = calculateBaseCost(price, amount, formData.unit);
    // Showing more decimals here for precision, but table will show 2
    return `R$ ${baseCost.toFixed(4)} / ${baseUnit}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Section */}
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit sticky top-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          {editingId ? 'Editar Ingrediente' : 'Novo Ingrediente'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Item</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ex: Leite Condensado"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preço Pago (R$)</label>
              <input
                type="number"
                step="0.01"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                required
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. Embalagem</label>
               <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="395"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Unidade da Embalagem</label>
             {/* Styling fixed to ensure text is visible */}
             <select
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-slate-800"
             >
               {Object.values(Unit).map(u => (
                 <option key={u} value={u} className="text-slate-800 bg-white">
                   {u.toUpperCase()}
                 </option>
               ))}
             </select>
          </div>

          {/* Feedback Area */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Custo Base Calculado</span>
            <div className="text-lg font-bold text-amber-600">
              {previewCost() || '---'}
            </div>
          </div>

          <div className="flex gap-2">
            {editingId && (
                <button
                    type="button"
                    onClick={cancelEdit}
                    className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 rounded-lg transition"
                >
                    Cancelar
                </button>
            )}
            <button
                type="submit"
                className={`flex-1 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2`}
            >
                {editingId ? <Edit2 size={18}/> : <Plus size={18} />} 
                {editingId ? 'Salvar Alteração' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h3 className="font-semibold text-slate-700">Estoque Cadastrado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-semibold">Nome</th>
                <th className="px-6 py-3 font-semibold">Embalagem</th>
                <th className="px-6 py-3 font-semibold">Preço Pago</th>
                <th className="px-6 py-3 font-semibold">Custo Base</th>
                <th className="px-6 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ingredients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Nenhum ingrediente cadastrado ainda.
                  </td>
                </tr>
              ) : (
                ingredients.map(ing => (
                  <tr key={ing.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium text-slate-800">{ing.name}</td>
                    <td className="px-6 py-4 text-slate-600">{ing.package_amount} {ing.package_unit}</td>
                    <td className="px-6 py-4 text-slate-600">R$ {ing.package_price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-amber-600 font-semibold">
                      {/* Fixed to 2 decimal places as requested */}
                      R$ {ing.unit_cost_base.toFixed(2)} <span className="text-xs text-slate-400">/{ing.base_unit}</span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(ing)}
                        className="text-amber-500 hover:text-amber-700 transition"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(ing.id)}
                        className="text-red-400 hover:text-red-600 transition"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};