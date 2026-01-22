import React, { useState, useEffect } from 'react';
import { RecipeService } from '../services/recipeService';
import { Recipe } from '../types';
import { DollarSign, Save, Loader2, Search, Calculator } from 'lucide-react';
import { toast } from 'sonner';

export function CostingView() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await RecipeService.getAll();
      setRecipes(data || []);
    } catch (e) {
      toast.error('Erro ao carregar receitas');
    } finally {
      setLoading(false);
    }
  }

  const handleSelect = (recipe: Recipe) => {
    setSelectedId(recipe.id);
    setNewPrice(recipe.selling_price?.toString() || '');
  };

  const handleUpdatePrice = async () => {
    if (!selectedId || !newPrice) return;
    const recipe = recipes.find(r => r.id === selectedId);
    if (!recipe) return;

    setSaving(true);
    try {
      // CORREÇÃO AQUI: Usamos .save em vez de .update
      await RecipeService.save({
        ...recipe,
        selling_price: parseFloat(newPrice)
      });
      
      toast.success('Preço atualizado!');
      loadData();
    } catch (e) {
      toast.error('Erro ao atualizar preço');
    } finally {
      setSaving(false);
    }
  };

  const filtered = recipes.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="text-amber-600" /> Simulador Rápido
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lista Lateral */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-[500px] flex flex-col">
           <div className="relative mb-4">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
             <input 
               className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:border-amber-500" 
               placeholder="Buscar receita..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="flex-1 overflow-y-auto space-y-2">
             {loading ? <Loader2 className="animate-spin mx-auto text-slate-400"/> : filtered.map(r => (
               <div 
                 key={r.id} 
                 onClick={() => handleSelect(r)}
                 className={`p-3 rounded-lg cursor-pointer border transition ${selectedId === r.id ? 'bg-amber-50 border-amber-500' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}
               >
                 <div className="font-bold text-slate-700">{r.name}</div>
                 <div className="text-xs text-slate-500">Atual: R$ {r.selling_price?.toFixed(2)}</div>
               </div>
             ))}
           </div>
        </div>

        {/* Painel de Edição */}
        <div className="md:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
           {selectedId ? (
             <div className="w-full max-w-sm space-y-6">
                <h2 className="text-xl font-bold text-slate-800">Alterar Preço de Venda</h2>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                   <label className="block text-sm font-bold text-slate-500 mb-2 uppercase">Novo Preço</label>
                   <div className="flex items-center bg-white border-2 border-amber-500 rounded-xl overflow-hidden shadow-sm">
                      <div className="pl-4 pr-2 text-amber-600 font-bold"><DollarSign size={20}/></div>
                      <input 
                        type="number" 
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        className="w-full py-4 pr-4 outline-none text-2xl font-bold text-slate-700"
                        placeholder="0.00"
                      />
                   </div>
                </div>

                <button 
                  onClick={handleUpdatePrice}
                  disabled={saving}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 transition flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin"/> : <><Save size={20}/> Salvar Alteração</>}
                </button>
             </div>
           ) : (
             <div className="text-slate-400">Selecione uma receita ao lado para editar o preço.</div>
           )}
        </div>
      </div>
    </div>
  );
}