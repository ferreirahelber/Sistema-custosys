import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CategoryService } from '../services/categoryService'; // Importando serviço de categorias
import { Category } from '../types'; // Importando tipo
import {
  ShoppingBag,
  Plus,
  Search,
  Trash2,
  Edit,
  Save,
  LayoutGrid,
  TrendingUp,
  Loader2,
  Package,
  Calculator,
  Barcode,
  Tag,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  package_price?: number;
  package_amount?: number;
  barcode?: string;
  category?: string; // NOVO CAMPO
  type: string;
}

const formatCurrency = (value: number) => {
  if (!value || isNaN(value)) return 'R$ 0,00';
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

export function ResaleProductsView() {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // Estado de categorias
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  
  const [currentId, setCurrentId] = useState<string | null>(null);
  
  // Estados para Modal de Categoria
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: '', // NOVO CAMPO NO FORM
    packagePrice: '',
    packageAmount: '1',
    sellingPrice: ''
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
      // Carrega Produtos e Categorias em paralelo
      const [productsResponse, categoriesData] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('type', 'resale')
          .order('name'),
        CategoryService.getAll().catch(() => []) // Se falhar categoria, não trava tudo
      ]);

      if (productsResponse.error) throw productsResponse.error;
      
      setItems(productsResponse.data || []);
      setCategories(categoriesData || []);

    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentId(null);
    setFormData({
      name: '',
      barcode: '',
      category: '',
      packagePrice: '',
      packageAmount: '1',
      sellingPrice: ''
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

  const handleSelect = (item: Product) => {
    setMode('edit');
    setCurrentId(item.id);
    setFormData({
      name: item.name,
      barcode: item.barcode || '',
      category: item.category || 'Geral', // Carrega categoria
      packagePrice: item.package_price?.toString() || item.cost_price?.toString() || '0',
      packageAmount: item.package_amount?.toString() || '1',
      sellingPrice: item.price?.toString() || '0'
    });
  };

  const calculateUnitCost = () => {
    const pkgPrice = parseFloat(formData.packagePrice) || 0;
    const pkgAmount = parseFloat(formData.packageAmount) || 1;
    return pkgAmount > 0 ? pkgPrice / pkgAmount : 0;
  };

  const calculateMargin = () => {
    const cost = calculateUnitCost();
    const sell = parseFloat(formData.sellingPrice) || 0;
    return sell - cost;
  };
  
  const unitCostKPI = calculateUnitCost();
  const marginKPI = calculateMargin();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sellingPrice) {
      toast.warning('Nome e Preço de Venda são obrigatórios');
      return;
    }

    const costCalculated = calculateUnitCost();

    const payload = {
      name: formData.name,
      barcode: formData.barcode,
      category: formData.category || 'Geral', // Salva categoria
      price: parseFloat(formData.sellingPrice) || 0,
      cost_price: costCalculated,
      package_price: parseFloat(formData.packagePrice) || 0,
      package_amount: parseFloat(formData.packageAmount) || 1,
      type: 'resale',
      profit_margin: marginKPI
    };

    try {
      if (mode === 'edit' && currentId) {
        const { error } = await supabase.from('products').update(payload).eq('id', currentId);
        if (error) throw error;
        toast.success('Produto atualizado!');
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        toast.success('Produto criado!');
      }
      resetForm();
      setMode('idle');
      loadItems();
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  // --- LÓGICA DE CRIAR CATEGORIA ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      const newCat = await CategoryService.create(newCategoryName);
      setCategories([...categories, newCat]);
      setFormData({ ...formData, category: newCat.name }); // Seleciona a nova categoria
      toast.success(`Categoria "${newCat.name}" criada!`);
      setShowCategoryModal(false);
      setNewCategoryName('');
    } catch (error) {
      toast.error('Erro ao criar categoria.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const confirmDelete = (e: React.MouseEvent, item: Product) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, id: item.id, name: item.name });
  };

  const executeDelete = async () => {
    if (!deleteConfirmation.id) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', deleteConfirmation.id);
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

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.barcode && i.barcode.includes(searchTerm))
  );

  const theme = {
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
    selected: 'bg-emerald-100 ring-1 ring-inset ring-emerald-300'
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-[600px] animate-fade-in">
      
      {/* 🟩 PAINEL DE EDIÇÃO */}
      <div className="lg:w-1/3 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden">
        <div className={`p-4 border-b flex justify-between items-center ${mode === 'create' ? theme.bg : mode === 'edit' ? 'bg-amber-50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 font-bold text-slate-700">
            {mode === 'create' && <><Plus size={20} className={theme.text}/> Novo Produto</>}
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
              <ShoppingBag size={64} strokeWidth={1} />
              <p className="text-center text-sm max-w-[200px]">
                Selecione um produto ou clique em "Novo".
              </p>
              <button onClick={handleNew} className={`mt-4 px-6 py-2 text-white rounded-full font-bold shadow-lg transition ${theme.btn}`}>
                Criar Novo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5 animate-in slide-in-from-left-4 fade-in duration-300">
              
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
                  <TrendingUp size={48} />
                </div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Lucro Estimado / Un</label>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-3xl font-black tracking-tight ${marginKPI > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {formatCurrency(marginKPI)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                   <span>Venda: {formatCurrency(parseFloat(formData.sellingPrice) || 0)}</span>
                   <span>Custo: {formatCurrency(unitCostKPI)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome do Produto</label>
                <input 
                  autoFocus
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Coca-Cola Lata 350ml"
                  className="w-full mt-1 px-3 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700"
                />
              </div>

              {/* SELETOR DE CATEGORIA (NOVO) */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Tag size={14} /> Categoria</label>
                <div className="flex gap-2 mt-1">
                  <select 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="flex-1 px-3 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-700"
                  >
                    <option value="">Selecione...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => setShowCategoryModal(true)}
                    className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300 transition"
                    title="Criar nova categoria"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Barcode size={14} /> Código de Barras (Opcional)</label>
                <input 
                  value={formData.barcode}
                  onChange={e => setFormData({...formData, barcode: e.target.value})}
                  placeholder="Bipe ou digite o código..."
                  className="w-full mt-1 px-3 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 relative">
                <div className="absolute top-3 right-3 text-slate-300">
                    <Calculator size={16} />
                </div>
                <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Package size={14}/> Dados de Compra (Fardo/Pacote)
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Valor Pago (Fardo)</label>
                    <input 
                        type="number" step="0.01"
                        value={formData.packagePrice}
                        onChange={e => setFormData({...formData, packagePrice: e.target.value})}
                        placeholder="Ex: 30.00"
                        className="w-full mt-1 px-2 py-2 border rounded bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    </div>
                    <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Qtd no Pacote</label>
                    <input 
                        type="number"
                        value={formData.packageAmount}
                        onChange={e => setFormData({...formData, packageAmount: e.target.value})}
                        placeholder="Ex: 12"
                        className="w-full mt-1 px-2 py-2 border rounded bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    </div>
                </div>
                
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold">Custo Unitário Calculado:</span>
                    <span className="text-sm font-black text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                        {formatCurrency(unitCostKPI)}
                    </span>
                </div>
              </div>

              <div>
                   <label className="text-xs font-bold text-emerald-700 uppercase">Preço de Venda Unitário (R$)</label>
                   <input 
                     type="number" step="0.01"
                     value={formData.sellingPrice}
                     onChange={e => setFormData({...formData, sellingPrice: e.target.value})}
                     placeholder="0.00"
                     className="w-full mt-1 px-3 py-3 border border-emerald-300 bg-emerald-50 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-800 text-lg"
                   />
              </div>

              <button type="submit" className={`w-full py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 ${theme.btn}`}>
                <Save size={20} />
                {mode === 'edit' ? 'Atualizar Produto' : 'Cadastrar Produto'}
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
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500 bg-slate-50 focus:bg-white transition"
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
                  <th className="p-4 border-b whitespace-nowrap">Produto</th>
                  <th className="p-4 border-b whitespace-nowrap">Categoria</th>
                  <th className="p-4 border-b whitespace-nowrap">Custo Unit.</th>
                  <th className="p-4 border-b whitespace-nowrap">Venda</th>
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
                      odd:bg-white even:bg-slate-50/50 hover:bg-emerald-50
                      ${currentId === item.id && mode === 'edit' ? theme.selected : ''}
                    `}
                  >
                    <td className="p-4 font-bold text-slate-700 whitespace-nowrap">
                      <div>{item.name}</div>
                      {item.barcode && <div className="text-[10px] text-slate-400 flex items-center gap-1"><Barcode size={10}/> {item.barcode}</div>}
                      {currentId === item.id && mode === 'edit' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800 mt-1 inline-block">EDITANDO</span>}
                    </td>

                    <td className="p-4 whitespace-nowrap">
                       <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                         {item.category || 'Geral'}
                       </span>
                    </td>
                    
                    <td className="p-4 whitespace-nowrap text-slate-500">
                       {formatCurrency(item.cost_price)}
                    </td>

                    <td className="p-4 whitespace-nowrap font-bold text-emerald-600">
                       {formatCurrency(item.price)}
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
            <h3 className="font-bold text-lg text-slate-800 mb-2">Excluir Produto?</h3>
            <p className="text-sm text-slate-500 mb-6">Confirma a exclusão de "{deleteConfirmation.name}"?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVA CATEGORIA */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-0 overflow-hidden animate-in zoom-in-95">
              
              <div className="p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg text-white"><Tag size={20} /></div>
                    <h3 className="font-bold text-lg text-white">Nova Categoria</h3>
                 </div>
                 <button onClick={() => setShowCategoryModal(false)} className="text-white/70 hover:text-white transition p-1"><X size={20} /></button>
              </div>

              <form onSubmit={handleSaveCategory} className="p-6">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Nome da Categoria</label>
                <input 
                   autoFocus
                   type="text" 
                   value={newCategoryName} 
                   onChange={e => setNewCategoryName(e.target.value)}
                   className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-6 text-slate-800"
                   placeholder="Ex: Bebidas, Bomboniere..." 
                />
                
                <div className="flex justify-end gap-3">
                   <button 
                      type="button"
                      onClick={() => setShowCategoryModal(false)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
                   >
                      Cancelar
                   </button>
                   <button 
                      type="submit"
                      disabled={!newCategoryName.trim() || creatingCategory}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                   >
                      {creatingCategory ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Categoria'}
                   </button>
                </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}