import React, { useState, useEffect } from 'react';
import { IngredientService } from '../services/ingredientService';
import { Ingredient } from '../types';
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit,
  Save,
  AlertTriangle,
  Loader2,
  Scale,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  TrendingDown,
  Box
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  type: 'ingredient' | 'product';
}

// --- UTILITÁRIOS ---
const formatCurrency = (value: number) => {
  if (!value) return 'R$ 0,00';
  if (value < 0.01) return `R$ ${value.toFixed(4).replace('.', ',')}`;
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

const normalizeText = (text: string) => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const IngredientForm: React.FC<Props> = ({ type }) => {
  const isProduct = type === 'product';
  const title = isProduct ? 'Produtos & Embalagens' : 'Ingredientes Culinários';
  const itemLabel = isProduct ? 'Produto' : 'Ingrediente';
  const iconColor = isProduct ? 'text-purple-600' : 'text-amber-600';
  const buttonColor = isProduct ? 'bg-purple-600 hover:bg-purple-700' : 'bg-amber-600 hover:bg-amber-700';
  const bgLight = isProduct ? 'bg-purple-50' : 'bg-amber-50';
  const borderLight = isProduct ? 'border-purple-200' : 'border-amber-200';
  
  // --- ESTADOS ---
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- FORMULÁRIO ---
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [packageAmount, setPackageAmount] = useState('');
  const [packageUnit, setPackageUnit] = useState('kg');
  const [baseUnit, setBaseUnit] = useState('g');
  const [weightPerUnit, setWeightPerUnit] = useState(''); 
  const [currentStock, setCurrentStock] = useState('');
  const [minStock, setMinStock] = useState('100');

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null; name: string }>({
    isOpen: false,
    id: null,
    name: ''
  });

  useEffect(() => {
    loadIngredients();
    setMode('idle');
    resetForm();
  }, [type]);

  const loadIngredients = async () => {
    setLoading(true);
    try {
      const data = await IngredientService.getAll();
      const filtered = data.filter(item => {
        const itemCategory = item.category || 'ingredient';
        return itemCategory === type;
      });
      setIngredients(filtered);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const calculateBaseCost = () => {
    const price = parseFloat(packagePrice) || 0;
    const amount = parseFloat(packageAmount) || 0;
    
    if (packageUnit === 'un') {
      if (baseUnit === 'un') {
        return amount > 0 ? price / amount : 0;
      }
      const weight = parseFloat(weightPerUnit) || 0;
      if (weight > 0 && amount > 0) return price / (amount * weight);
      return 0;
    }

    let multiplier = 1;
    if ((packageUnit === 'kg' && baseUnit === 'g') || (packageUnit === 'l' && baseUnit === 'ml')) {
      multiplier = 1000;
    }

    const totalBaseUnits = amount * multiplier;
    return totalBaseUnits > 0 ? price / totalBaseUnits : 0;
  };

  const handleNew = () => {
    resetForm();
    setMode('create');
  };

  const handleCancel = () => {
    resetForm();
    setMode('idle');
  }

  const handleSelect = (ing: Ingredient) => {
    setMode('edit');
    setCurrentId(ing.id);
    setName(ing.name);
    setPackagePrice(ing.package_price.toString());
    setPackageAmount(ing.package_amount.toString());
    setPackageUnit(ing.package_unit);
    setBaseUnit(ing.base_unit);
    setCurrentStock(ing.current_stock?.toString() || '0');
    setMinStock(ing.min_stock?.toString() || '10');
    
    if (ing.package_unit === 'un' && ing.conversions && ing.conversions.length > 0) {
      setWeightPerUnit(ing.conversions[0].value.toString());
    } else {
      setWeightPerUnit('');
    }
  };

  const resetForm = () => {
    setCurrentId(null);
    setName('');
    setPackagePrice('');
    setPackageAmount('');
    setPackageUnit(isProduct ? 'un' : 'kg');
    setBaseUnit(isProduct ? 'un' : 'g');
    setWeightPerUnit('');
    setCurrentStock('');
    setMinStock('10');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !packagePrice || !packageAmount) {
      toast.warning('Preencha os campos obrigatórios');
      return;
    }

    const inputNameNormalized = normalizeText(name);
    const isDuplicate = ingredients.some(ing => {
      const existingNameNormalized = normalizeText(ing.name);
      const namesMatch = existingNameNormalized === inputNameNormalized;
      if (mode === 'edit' && currentId) {
        return namesMatch && ing.id !== currentId;
      }
      return namesMatch;
    });

    if (isDuplicate) {
      toast.error(`${itemLabel} já cadastrado (nome similar encontrado)!`);
      return;
    }

    const calculatedBaseCost = calculateBaseCost();

    const payload = {
      name,
      package_price: parseFloat(packagePrice),
      package_amount: parseFloat(packageAmount),
      package_unit: packageUnit,
      base_unit: baseUnit,
      unit_cost_base: calculatedBaseCost,
      current_stock: parseFloat(currentStock) || 0,
      min_stock: parseFloat(minStock) || 0,
      category: type,
      conversions: (packageUnit === 'un' && baseUnit !== 'un' && weightPerUnit) 
        ? [{ name: 'Peso Unitário', value: parseFloat(weightPerUnit) }] 
        : []
    };

    try {
      if (mode === 'edit' && currentId) {
        await IngredientService.update(currentId, payload);
        toast.success(`${itemLabel} atualizado!`);
      } else {
        await IngredientService.create(payload);
        toast.success(`${itemLabel} criado!`);
      }
      resetForm();
      setMode('idle');
      loadIngredients();
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const confirmDelete = (e: React.MouseEvent, ing: Ingredient) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, id: ing.id!, name: ing.name });
  };

  const executeDelete = async () => {
    if (!deleteConfirmation.id) return;
    try {
      await IngredientService.delete(deleteConfirmation.id);
      toast.success('Item excluído!');
      if (currentId === deleteConfirmation.id) {
        setMode('idle');
        resetForm();
      }
      setDeleteConfirmation({ isOpen: false, id: null, name: '' });
      loadIngredients();
    } catch (error: any) {
      if (error.code === '23503') {
        toast.error('Este item está em uso numa receita e não pode ser excluído.');
      } else {
        toast.error(`Erro: ${error.message || 'Não foi possível excluir'}`);
      }
      setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    }
  };

  const filteredIngredients = ingredients.filter(i => 
    normalizeText(i.name).includes(normalizeText(searchTerm))
  );

  const costKPI = calculateBaseCost();

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-[600px]">
      
      {/* 🟧 PAINEL DE EDIÇÃO */}
      <div className="lg:w-1/3 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden">
        <div className={`p-4 border-b flex justify-between items-center ${mode === 'create' ? bgLight : mode === 'edit' ? 'bg-blue-50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 font-bold text-slate-700">
            {mode === 'create' && <><Plus size={20} className={iconColor}/> Novo {itemLabel}</>}
            {mode === 'edit' && <><Edit size={20} className="text-blue-600"/> Editando Item</>}
            {mode === 'idle' && <><LayoutGrid size={20} className="text-slate-400"/> Painel de Detalhes</>}
          </div>
          {mode !== 'idle' && (
            <button onClick={handleCancel} className="text-xs text-slate-500 hover:text-red-500 underline">Cancelar</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
          {mode === 'idle' ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
              {isProduct ? <Box size={64} strokeWidth={1}/> : <Package size={64} strokeWidth={1} />}
              <p className="text-center text-sm max-w-[200px]">
                Selecione um item na lista ou clique em "Novo".
              </p>
              <button onClick={handleNew} className={`mt-4 px-6 py-2 text-white rounded-full font-bold shadow-lg transition ${buttonColor}`}>
                Criar Novo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5 animate-in slide-in-from-left-4 fade-in duration-300">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
                  <TrendingDown size={48} />
                </div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Custo Base</label>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-3xl font-black tracking-tight ${isProduct ? 'text-purple-400' : 'text-amber-400'}`}>
                    {formatCurrency(costKPI)}
                  </span>
                  <span className="text-lg font-bold text-slate-500/80">/ {baseUnit}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Calculado automaticamente</div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                <input 
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={isProduct ? "Ex: Caixa 20cm" : "Ex: Farinha de Trigo"}
                  className="w-full mt-1 px-3 py-3 border rounded-lg focus:ring-2 focus:ring-slate-500 outline-none font-medium text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Preço Pago (R$)</label>
                  <input 
                    type="number" step="0.01"
                    value={packagePrice}
                    onChange={e => setPackagePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 outline-none"
                  />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Qtd. Embalagem</label>
                   <div className="flex mt-1">
                    <input 
                      type="number" step="0.001"
                      value={packageAmount}
                      onChange={e => setPackageAmount(e.target.value)}
                      className="w-full px-3 py-2 border-l border-t border-b rounded-l-lg focus:ring-2 focus:ring-slate-500 outline-none"
                    />
                    <select 
                      value={packageUnit}
                      onChange={e => setPackageUnit(e.target.value)}
                      className="px-2 border rounded-r-lg bg-slate-100 text-slate-700 outline-none text-sm font-bold"
                    >
                      <option value="un">un</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">L</option>
                      <option value="ml">ml</option>
                    </select>
                   </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Usar em Receitas como:</label>
                <div className="flex gap-2 mt-1">
                  {['un', 'g', 'ml'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setBaseUnit(u)}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg border transition ${baseUnit === u ? `${bgLight} ${borderLight} ${isProduct ? 'text-purple-800' : 'text-amber-800'}` : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {packageUnit === 'un' && baseUnit !== 'un' && (
                <div className={`${bgLight} p-3 rounded-lg border ${borderLight} animate-in slide-in-from-top-2`}>
                   <label className={`text-xs font-bold uppercase flex items-center gap-1 ${isProduct ? 'text-purple-800' : 'text-amber-800'}`}>
                      <Scale size={12}/> Peso da Unidade ({baseUnit})
                   </label>
                   <div className="flex gap-2 items-center mt-1">
                     <input 
                       type="number"
                       value={weightPerUnit}
                       onChange={e => setWeightPerUnit(e.target.value)}
                       placeholder="Ex: 395"
                       className={`flex-1 px-3 py-2 border rounded bg-white text-sm outline-none ${isProduct ? 'border-purple-300 focus:ring-purple-500' : 'border-amber-300 focus:ring-amber-500'}`}
                     />
                     <span className={`text-[10px] font-bold max-w-[120px] leading-tight ${isProduct ? 'text-purple-700' : 'text-amber-700'}`}>
                       Obrigatório para conversão
                     </span>
                   </div>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Package size={14}/> Controle de Estoque
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Atual ({baseUnit})</label>
                    <input 
                      type="number"
                      value={currentStock}
                      onChange={e => setCurrentStock(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 border rounded bg-white text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Mínimo ({baseUnit})</label>
                    <input 
                      type="number"
                      value={minStock}
                      onChange={e => setMinStock(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 border rounded bg-white text-sm"
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-2">
                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition w-full justify-between">
                  CONFIGURAÇÕES AVANÇADAS
                  {showAdvanced ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-3 animate-in slide-in-from-top-2">
                    <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg">
                      Conversão automática de medidas caseiras ativada.
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className={`w-full py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 ${buttonColor}`}>
                <Save size={20} />
                {mode === 'edit' ? 'Atualizar Dados' : 'Cadastrar Item'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 🟦 LISTA (HIERARQUIA VISUAL APRIMORADA) */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-white z-20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              placeholder={`Buscar ${itemLabel.toLowerCase()}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm outline-none focus:border-slate-500 bg-slate-50 focus:bg-white transition"
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
                  <th className="p-4 border-b whitespace-nowrap">{itemLabel}</th>
                  <th className="p-4 border-b whitespace-nowrap">Compra</th>
                  <th className="p-4 border-b whitespace-nowrap">Custo Base</th>
                  <th className="p-4 border-b text-center whitespace-nowrap">Estoque</th>
                  <th className="p-4 border-b text-right whitespace-nowrap">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredIngredients.map(ing => (
                  <tr 
                    key={ing.id} 
                    onClick={() => handleSelect(ing)}
                    className={`
                      group cursor-pointer transition-colors duration-150
                      odd:bg-white even:bg-slate-50/50 
                      ${isProduct ? 'hover:bg-purple-50' : 'hover:bg-amber-50'}
                      ${currentId === ing.id && mode === 'edit' ? (isProduct ? 'bg-purple-100 ring-1 ring-inset ring-purple-300' : 'bg-amber-100 ring-1 ring-inset ring-amber-300') : ''}
                    `}
                  >
                    <td className="p-4 font-bold text-slate-700 whitespace-nowrap">
                      {ing.name}
                      {currentId === ing.id && mode === 'edit' && <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${isProduct ? 'bg-purple-200 text-purple-800' : 'bg-amber-200 text-amber-800'}`}>EDITANDO</span>}
                    </td>
                    
                    {/* --- COLUNA COMPRA MELHORADA --- */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">R$ {Number(ing.package_price).toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          por {ing.package_amount} {ing.package_unit}
                        </span>
                      </div>
                    </td>

                    {/* --- COLUNA CUSTO BASE MELHORADA --- */}
                    <td className="p-4 whitespace-nowrap">
                      <div className={`flex flex-col ${isProduct ? 'text-purple-700' : 'text-amber-700'}`}>
                        <span className="font-bold">{formatCurrency(ing.unit_cost_base)}</span>
                        <span className="text-[10px] text-slate-400 font-medium">/ {ing.base_unit}</span>
                      </div>
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                       <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                         (ing.current_stock || 0) <= (ing.min_stock || 0) 
                         ? 'bg-red-100 text-red-700' 
                         : 'bg-green-100 text-green-700'
                       }`}>
                         {ing.current_stock || 0} {ing.base_unit}
                       </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button 
                        onClick={(e) => confirmDelete(e, ing)}
                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-white rounded-full transition relative z-10"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredIngredients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Nenhum {itemLabel.toLowerCase()} encontrado nesta categoria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Excluir Item?</h3>
                <p className="text-sm text-slate-500">
                  Isso removerá <span className="font-bold text-slate-800">"{deleteConfirmation.name}"</span> da base.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};