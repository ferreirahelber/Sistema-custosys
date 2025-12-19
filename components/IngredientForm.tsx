import React, { useState, useEffect } from 'react';
import { Ingredient, Unit, MeasureConversion } from '../types';
import { calculateBaseCost } from '../utils/calculations';
import { IngredientService } from '../services/ingredientService';
import { Plus, Trash2, Package, Scale, AlertCircle, Loader2 } from 'lucide-react';

export const IngredientForm: React.FC = () => {
  // --- ESTADOS ---
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estado do Formulário Principal
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    amount: '',
    unit: Unit.G,
    current_stock: ''
  });

  // Estado das Conversões (Medidas Caseiras)
  const [conversions, setConversions] = useState<MeasureConversion[]>([]);
  const [newConvName, setNewConvName] = useState('Xícara (chá)');
  const [newConvValue, setNewConvValue] = useState('');

  const commonMeasures = ['Xícara (chá)', 'Colher (sopa)', 'Colher (chá)', 'Copo Americano', 'Pitada'];

  // --- CARREGAMENTO INICIAL ---
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
      alert('Erro ao carregar ingredientes. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = parseFloat(formData.price);
    const amount = parseFloat(formData.amount);
    const stock = parseFloat(formData.current_stock) || 0;

    if (!formData.name || isNaN(price) || isNaN(amount)) return;

    try {
      setSaving(true);
      const { baseCost, baseUnit } = calculateBaseCost(price, amount, formData.unit);

      // Objeto pronto para o Supabase
      const newIngredient = {
        name: formData.name,
        package_price: price,
        package_amount: amount,
        package_unit: formData.unit,
        unit_cost_base: baseCost,
        base_unit: baseUnit,
        current_stock: stock,
        conversions: conversions 
      };

      await IngredientService.create(newIngredient);
      
      await loadIngredients();
      clearForm();
      alert('Ingrediente salvo com sucesso!');

    } catch (error: any) {
      console.error('ERRO REAL:', error);
      // AQUI ESTÁ O CÓDIGO QUE VAI TE MOSTRAR O ERRO REAL
      alert(`O erro real foi: ${error.message || error.error_description || JSON.stringify(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este ingrediente?')) {
      try {
        await IngredientService.delete(id);
        setIngredients(ingredients.filter(i => i.id !== id));
      } catch (error) {
        alert('Erro ao excluir.');
      }
    }
  };

  const clearForm = () => {
    setFormData({ name: '', price: '', amount: '', unit: Unit.G, current_stock: '' });
    setConversions([]);
    setNewConvValue('');
  };

  const previewCost = () => {
    const price = parseFloat(formData.price);
    const amount = parseFloat(formData.amount);
    if (isNaN(price) || isNaN(amount) || amount === 0) return null;
    const { baseCost, baseUnit } = calculateBaseCost(price, amount, formData.unit);
    return `R$ ${baseCost.toFixed(4)} / ${baseUnit}`;
  };

  const currentBaseUnit = calculateBaseCost(0, 1, formData.unit).baseUnit;

  // --- RENDERIZAÇÃO ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* COLUNA DA ESQUERDA: FORMULÁRIO */}
      <div className="lg:col-span-1 space-y-6 sticky top-6 h-fit">
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            Novo Ingrediente
          </h3>
          
          <form id="ing-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Item</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Ex: Farinha de Trigo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label>
                <input
                  type="number" step="0.01" name="price"
                  value={formData.price} onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00" required
                />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Qtd Embalagem</label>
                 <input
                  type="number" name="amount"
                  value={formData.amount} onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="1000" required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                    <select
                        name="unit"
                        value={formData.unit}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                        {Object.values(Unit).map(u => (
                            <option key={u} value={u}>{u.toUpperCase()}</option>
                        ))}
                    </select>
                </div>
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Atual</label>
                     <input
                      type="number" name="current_stock"
                      value={formData.current_stock} onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg border-green-200 bg-green-50/30"
                      placeholder="0"
                    />
                </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Custo Base</span>
              <div className="text-lg font-bold text-amber-600">
                {previewCost() || '---'}
              </div>
            </div>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
             <Scale className="w-4 h-4 text-amber-600" /> Medidas Caseiras
           </h4>
           
           <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <select 
                  value={newConvName}
                  onChange={e => setNewConvName(e.target.value)}
                  className="w-full px-2 py-2 text-sm border rounded-lg bg-white"
                >
                  {commonMeasures.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="w-20 relative">
                 <input 
                  type="number"
                  value={newConvValue}
                  onChange={e => setNewConvValue(e.target.value)}
                  placeholder="0"
                  className="w-full px-2 py-2 text-sm border rounded-lg"
                 />
                 <span className="absolute right-1 top-2 text-xs text-slate-400">{currentBaseUnit}</span>
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
                  <div key={idx} className="flex justify-between items-center text-sm p-1 border-b border-slate-200 last:border-0">
                    <span className="text-slate-700">1 {conv.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-700">{conv.value} {currentBaseUnit}</span>
                      <button onClick={() => removeConversion(idx)} className="text-slate-400 hover:text-red-500">
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
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
            {saving ? <Loader2 className="animate-spin" /> : <Plus size={18} />} 
            Salvar Ingrediente
        </button>
      </div>

      {/* COLUNA DA DIREITA: LISTAGEM */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">Base de Ingredientes (Supabase)</h3>
          {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-semibold">Nome</th>
                <th className="px-6 py-3 font-semibold">Preço/Emb.</th>
                <th className="px-6 py-3 font-semibold">Custo Base</th>
                <th className="px-6 py-3 font-semibold">Estoque</th>
                <th className="px-6 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ingredients.map(ing => (
                <tr key={ing.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{ing.name}</div>
                    {ing.conversions && Array.isArray(ing.conversions) && ing.conversions.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                            {ing.conversions.map((c: any, i: number) => (
                                <span key={i} className="text-[10px] bg-amber-50 text-amber-700 px-1 rounded border border-amber-100">
                                    1{c.name}={c.value}{ing.base_unit}
                                </span>
                            ))}
                        </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    R$ {ing.package_price.toFixed(2)} <span className="text-xs">({ing.package_amount}{ing.package_unit})</span>
                  </td>
                  <td className="px-6 py-4 text-amber-600 font-semibold">
                    R$ {ing.unit_cost_base.toFixed(2)} <span className="text-xs text-slate-400">/{ing.base_unit}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className={`font-bold ${(!ing.current_stock || ing.current_stock < 100) ? 'text-red-500' : 'text-green-600'}`}>
                            {ing.current_stock || 0} {ing.base_unit}
                        </span>
                        {(!ing.current_stock || ing.current_stock < 100) && <AlertCircle size={14} className="text-red-400"/>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(ing.id)} className="text-red-400 hover:text-red-600 transition">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && ingredients.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
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