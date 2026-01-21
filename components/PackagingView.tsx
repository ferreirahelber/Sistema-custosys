import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Ingredient } from '../types'; // Reusamos o tipo Ingredient
import {
  Box,
  Plus,
  Search,
  Trash2,
  Edit,
  Save,
  LayoutGrid,
  TrendingDown,
  Loader2,
  AlertTriangle,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value: number) => {
  if (!value || isNaN(value)) return 'R$ 0,00';
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

export function PackagingView() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    packagePrice: '',
    packageAmount: '',
    packageUnit: 'un', // Embalagem geralmente é Unidade
    baseUnit: 'un',
    currentStock: '',
    minStock: '10'
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null; name: string }>({
    isOpen: false, id: null, name: ''
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('category', 'packaging') // FILTRO: Só Embalagens
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      toast.error('Erro ao carregar embalagens');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentId(null);
    setFormData({
      name: '',
      packagePrice: '',
      packageAmount: '',
      packageUnit: 'un',
      baseUnit: 'un',
      currentStock: '',
      minStock: '10'
    });
  };

  const handleNew = () => {
    resetForm();
    setMode('create');
  };

  const handleCancel = () => {
    resetForm();
    setMode('idle');
  }

  const handleSelect = (item: Ingredient) => {
    setMode('edit');
    setCurrentId(item.id);
    setFormData({
      name: item.name,
      packagePrice: item.package_price?.toString() || item.price.toString() || '0',
      packageAmount: item.package_amount?.toString() || '1',
      packageUnit: item.package_unit || item.unit || 'un',
      baseUnit: item.base_unit || item.unit || 'un',
      currentStock: item.current_stock?.toString() || '0',
      minStock: item.min_stock?.toString() || '10'
    });
  };

  const calculateUnitCost = () => {
    const price = parseFloat(formData.packagePrice) || 0;
    const amount = parseFloat(formData.packageAmount) || 0;
    
    if (amount === 0) return 0;
    
    // Lógica simplificada para embalagens (geralmente Unidade)
    if (formData.packageUnit === 'un') {
      return price / amount;
    }
    
    // Se for fita (metros)
    let multiplier = 1;
    if (formData.packageUnit === 'm' && formData.baseUnit === 'cm') multiplier = 100;

    const totalBase = amount * multiplier;
    return totalBase > 0 ? price / totalBase : 0;
  };

  const costKPI = calculateUnitCost();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.packagePrice || !formData.packageAmount) {
      toast.warning('Preencha os campos obrigatórios');
      return;
    }

    const unitCost = calculateUnitCost();

    const payload = {
      name: formData.name,
      package_price: parseFloat(formData.packagePrice) || 0,
      package_amount: parseFloat(formData.packageAmount) || 0,
      package_unit: formData.packageUnit,
      base_unit: formData.baseUnit,
      price: unitCost,
      unit: formData.baseUnit,
      unit_cost_base: unitCost,
      current_stock: parseFloat(formData.currentStock) || 0,
      min_stock: parseFloat(formData.minStock) || 0,
      category: 'packaging' // FORÇA CATEGORIA EMBALAGEM
    };

    try {
      if (mode === 'edit' && currentId) {
        const { error } = await supabase.from('ingredients').update(payload).eq('id', currentId);
        if (error) throw error;
        toast.success('Embalagem atualizada!');
      } else {
        const { error } = await supabase.from('ingredients').insert([payload]);
        if (error) throw error;
        toast.success('Embalagem criada!');
      }
      resetForm();
      setMode('idle');
      loadItems();
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const confirmDelete = (e: React.MouseEvent, item: Ingredient) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, id: item.id!, name: item.name });
  };

  const executeDelete = async () => {
    if (!deleteConfirmation.id) return;
    try {
      const { error } = await supabase.from('ingredients').delete().eq('id', deleteConfirmation.id);
      if (error) throw error;
      toast.success('Item excluído!');
      if (currentId === deleteConfirmation.id) {
        setMode('idle');
        resetForm();
      }
      setDeleteConfirmation({ isOpen: false, id: null, name: '' });
      loadItems();
    } catch (error) {
      toast.error('Erro ao excluir');
      setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    }
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Theme Blue for Packaging
  const theme = {
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    btn: 'bg-blue-600 hover:bg-blue-700',
    selected: 'bg-blue-100 ring-1 ring-inset ring-blue-300'
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-[600px] animate-fade-in">
      
      {/* 🟦 PAINEL DE EDIÇÃO */}
      <div className="lg:w-1/3 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden">
        <div className={`p-4 border-b flex justify-between items-center ${mode === 'create' ? theme.bg : mode === 'edit' ? 'bg-amber-50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 font-bold text-slate-700">
            {mode === 'create' && <><Plus size={20} className={theme.text}/> Nova Embalagem</>}
            {mode === 'edit' && <><Edit size={20} className="text-amber-600"/> Editando Item</>}
            {mode === 'idle' && <><LayoutGrid size={20} className="text-slate-400"/> Painel de Detalhes</>}
          </div>
          {mode !== 'idle' && (
            <button onClick={handleCancel} className="text-xs text-slate-500 hover:text-red-500 underline">Cancelar</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
          {mode === 'idle' ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
              <Box size={64} strokeWidth={1} />
              <p className="text-center text-sm max-w-[200px]">
                Selecione uma embalagem ou clique em "Novo".
              </p>
              <button onClick={handleNew} className={`mt-4 px-6 py-2 text-white rounded-full font-bold shadow-lg transition ${theme.btn}`}>
                Criar Nova
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5 animate-in slide-in-from-left-4 fade-in duration-300">
              
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
                  <TrendingDown size={48} />
                </div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Custo Unitário</label>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black tracking-tight text-blue-400">
                    {formatCurrency(costKPI)}
                  </span>
                  <span className="text-lg font-bold text-slate-500/80">/ {formData.baseUnit}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome do Item</label>
                <input 
                  autoFocus
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Caixa de Bolo 20cm"
                  className="w-full mt-1 px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Preço Pacote (R$)</label>
                  <input 
                    type="number" step="0.01"
                    value={formData.packagePrice}
                    onChange={e => setFormData({...formData, packagePrice: e.target.value})}
                    placeholder="0.00"
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Qtd. no Pacote</label>
                   <div className="flex mt-1">
                    <input 
                      type="number" step="0.001"
                      value={formData.packageAmount}
                      onChange={e => setFormData({...formData, packageAmount: e.target.value})}
                      className="w-full px-3 py-2 border-l border-t border-b rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <select 
                      value={formData.packageUnit}
                      onChange={e => setFormData({...formData, packageUnit: e.target.value})}
                      className="px-2 border rounded-r-lg bg-slate-100 text-slate-700 outline-none text-sm font-bold"
                    >
                      <option value="un">un</option>
                      <option value="pct">pct</option>
                      <option value="m">m</option>
                    </select>
                   </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Unidade de Uso:</label>
                <div className="flex gap-2 mt-1">
                  {['un', 'cm'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setFormData({...formData, baseUnit: u})}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg border transition ${formData.baseUnit === u ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Package size={14}/> Estoque
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Atual</label>
                    <input 
                      type="number"
                      value={formData.currentStock}
                      onChange={e => setFormData({...formData, currentStock: e.target.value})}
                      className="w-full mt-1 px-2 py-1.5 border rounded bg-white text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Mínimo</label>
                    <input 
                      type="number"
                      value={formData.minStock}
                      onChange={e => setFormData({...formData, minStock: e.target.value})}
                      className="w-full mt-1 px-2 py-1.5 border rounded bg-white text-sm"
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className={`w-full py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 ${theme.btn}`}>
                <Save size={20} />
                {mode === 'edit' ? 'Atualizar' : 'Cadastrar'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 📋 LISTA */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-white z-20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              placeholder="Buscar embalagem..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition"
            />
          </div>
          <button onClick={handleNew} className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition flex items-center gap-2">
            <Plus size={16} /> Novo
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-600"/></div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead className="sticky top-0 z-30 bg-white shadow-sm text-slate-500 font-bold uppercase text-xs">
                <tr>
                  <th className="p-4 border-b whitespace-nowrap">Item</th>
                  <th className="p-4 border-b whitespace-nowrap">Custo Unit.</th>
                  <th className="p-4 border-b text-center whitespace-nowrap">Estoque</th>
                  <th className="p-4 border-b text-right whitespace-nowrap">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map(item => (
                  <tr 
                    key={item.id} 
                    onClick={() => handleSelect(item)}
                    className={`
                      group cursor-pointer transition-colors duration-150
                      odd:bg-white even:bg-slate-50/50 hover:bg-blue-50
                      ${currentId === item.id && mode === 'edit' ? theme.selected : ''}
                    `}
                  >
                    <td className="p-4 font-bold text-slate-700 whitespace-nowrap">
                      {item.name}
                      {currentId === item.id && mode === 'edit' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-800">EDITANDO</span>}
                    </td>
                    
                    <td className="p-4 whitespace-nowrap">
                      <div className={`flex flex-col text-blue-700`}>
                        <span className="font-bold">{formatCurrency(item.unit_cost_base)}</span>
                        <span className="text-[10px] text-slate-400 font-medium">/ {item.base_unit}</span>
                      </div>
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          (item.current_stock || 0) <= (item.min_stock || 0) 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                        }`}>
                          {item.current_stock || 0} {item.base_unit}
                        </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button 
                        onClick={(e) => confirmDelete(e, item)}
                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-white rounded-full transition relative z-10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className="font-bold text-lg text-slate-800 mb-2">Excluir Embalagem?</h3>
            <p className="text-sm text-slate-500 mb-6">Confirma a exclusão de "{deleteConfirmation.name}"?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}