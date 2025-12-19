import React, { useState, useEffect } from 'react';
import { Ingredient, Recipe, RecipeItem, Settings } from '../types';
import { IngredientService } from '../services/ingredientService';
import { RecipeService } from '../services/recipeService';
import { calculateRecipeFinancials } from '../utils/calculations';
import { ChefHat, Clock, Layers, Plus, Trash2, PieChart, Printer, Edit, Loader2 } from 'lucide-react';
import { RecipePrintView } from './RecipePrintView';
import { SettingsService } from '../services/settingsService';

export const RecipeForm: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('list');

  // Dados
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Começa com valores padrão seguros até o Supabase carregar
  const [settings, setSettings] = useState<Settings>({
    employees: [],
    labor_monthly_cost: 0,
    work_hours_monthly: 160,
    fixed_overhead_rate: 0,
    cost_per_minute: 0
  });

  // Estados de UI
  const [printingRecipe, setPrintingRecipe] = useState<Recipe | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulário
  const [name, setName] = useState('');
  const [yieldUnits, setYieldUnits] = useState(1);
  const [prepTime, setPrepTime] = useState(60);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);

  const [selectedIngId, setSelectedIngId] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');

  // --- CARREGAR DADOS DO SUPABASE ---
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Busca TUDO junto: Ingredientes, Receitas e Configurações
      const [allIngredients, allRecipes, mySettings] = await Promise.all([
        IngredientService.getAll(),
        RecipeService.getAll(),
        SettingsService.get()
      ]);

      setIngredients(allIngredients);
      setRecipes(allRecipes);
      setSettings(mySettings); // Atualiza o estado com as configs da nuvem

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DO FORMULÁRIO ---
  const selectedIngredientDetails = ingredients.find(i => i.id === selectedIngId);

  useEffect(() => {
    if (selectedIngredientDetails) {
      setSelectedUnit(selectedIngredientDetails.base_unit);
    }
  }, [selectedIngId]);

  const addItem = () => {
    if (!selectedIngId || !itemQuantity || !selectedUnit) return;

    const qtyInput = parseFloat(itemQuantity);
    let qtyBase = qtyInput;

    if (selectedIngredientDetails && selectedUnit !== selectedIngredientDetails.base_unit) {
      const conversion = selectedIngredientDetails.conversions?.find((c: any) => c.name === selectedUnit);
      if (conversion) {
        qtyBase = qtyInput * conversion.value;
      }
    }

    const newItem: RecipeItem = {
      id: Date.now().toString(),
      ingredient_id: selectedIngId,
      quantity_used: qtyBase,
      quantity_input: qtyInput,
      unit_input: selectedUnit
    };

    setRecipeItems([...recipeItems, newItem]);
    setSelectedIngId('');
    setItemQuantity('');
    setSelectedUnit('');
  };

  const removeItem = (id: string) => {
    setRecipeItems(recipeItems.filter(i => i.id !== id));
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setName(recipe.name);
    setYieldUnits(recipe.yield_units);
    setPrepTime(recipe.preparation_time_minutes);
    setRecipeItems(recipe.items || []);
    setActiveTab('new');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setRecipeItems([]);
    setYieldUnits(1);
    setActiveTab('list');
  };

  const handleDeleteRecipe = async (id: string) => {
    if (window.confirm("Excluir receita?")) {
      try {
        await RecipeService.delete(id);
        setRecipes(recipes.filter(r => r.id !== id));
        if (editingId === id) cancelEdit();
      } catch (e) { alert('Erro ao excluir'); }
    }
  };

  const financials = calculateRecipeFinancials(recipeItems, ingredients, prepTime, yieldUnits, settings);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || recipeItems.length === 0) return;

    try {
      setSaving(true);
      const recipeData: Recipe = {
        id: editingId || '',
        name,
        yield_units: yieldUnits,
        preparation_time_minutes: prepTime,
        items: recipeItems,
        total_cost_material: financials.total_cost_material || 0,
        total_cost_labor: financials.total_cost_labor || 0,
        total_cost_overhead: financials.total_cost_overhead || 0,
        total_cost_final: financials.total_cost_final || 0,
        unit_cost: financials.unit_cost || 0
      };

      await RecipeService.save(recipeData);
      await loadData();
      cancelEdit();
      alert("Receita salva com sucesso!");
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {printingRecipe && <RecipePrintView recipe={printingRecipe} onClose={() => setPrintingRecipe(null)} />}

      <div className="flex gap-4 border-b">
        <button onClick={() => { setActiveTab('list'); cancelEdit(); }} className={`pb-3 px-2 font-medium transition ${activeTab === 'list' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-500'}`}>Minhas Receitas</button>
        <button onClick={() => setActiveTab('new')} className={`pb-3 px-2 font-medium transition ${activeTab === 'new' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-500'}`}>{editingId ? 'Editando' : 'Nova Receita'}</button>
      </div>

      {activeTab === 'new' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">

            {/* SEÇÃO DE DETALHES */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <ChefHat className="text-amber-600" /> {editingId ? 'Editar Receita' : 'Detalhes da Receita'}
                </h2>
                {editingId && (
                  <button onClick={cancelEdit} className="text-sm text-red-500 hover:underline">Cancelar Edição</button>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Receita</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Ex: Bolo de Cenoura"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1">
                      <Clock size={16} /> Tempo de Preparo (min)
                    </label>
                    <input
                      type="number"
                      value={prepTime}
                      onChange={e => setPrepTime(parseFloat(e.target.value))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1">
                      <Layers size={16} /> Rendimento (un)
                    </label>
                    <input
                      type="number"
                      value={yieldUnits}
                      onChange={e => setYieldUnits(parseFloat(e.target.value))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO DE INGREDIENTES */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Ingredientes</h3>

              <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-slate-50 p-4 rounded-lg">
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-slate-500">Ingrediente</label>
                  <select value={selectedIngId} onChange={e => setSelectedIngId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg bg-white">
                    <option value="">Selecione...</option>
                    {ingredients.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full md:w-32">
                  <label className="text-xs font-bold text-slate-500">Qtd</label>
                  <input type="number" value={itemQuantity} onChange={e => setItemQuantity(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="0" />
                </div>
                <div className="w-full md:w-32">
                  <label className="text-xs font-bold text-slate-500">Unidade</label>
                  <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg bg-white" disabled={!selectedIngId}>
                    {selectedIngredientDetails ? (
                      <>
                        <option value={selectedIngredientDetails.base_unit}>{selectedIngredientDetails.base_unit}</option>
                        {selectedIngredientDetails.conversions?.map((c: any, idx: number) => <option key={idx} value={c.name}>{c.name}</option>)}
                      </>
                    ) : <option>-</option>}
                  </select>
                </div>
                <button onClick={addItem} disabled={!selectedIngId} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"><Plus size={20} /></button>
              </div>

              <div className="space-y-2">
                {recipeItems.map(item => {
                  const ing = ingredients.find(i => i.id === item.ingredient_id);
                  // --- CORREÇÃO: CÁLCULO DO CUSTO DO ITEM ---
                  const cost = (ing?.unit_cost_base || 0) * item.quantity_used;

                  return (
                    <div key={item.id} className="flex justify-between items-center p-3 border-b hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-800">{ing?.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.quantity_input} {item.unit_input}
                          {/* Mostra a conversão se for diferente da base */}
                          {item.unit_input !== ing?.base_unit &&
                            <span className="ml-1 text-slate-400">({item.quantity_used.toFixed(0)}{ing?.base_unit})</span>
                          }
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Exibe o Custo Calculado em R$ */}
                        <div className="text-sm font-semibold text-slate-600">
                          R$ {cost.toFixed(2)}
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                {recipeItems.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-sm">Nenhum ingrediente adicionado.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg sticky top-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PieChart size={20} className="text-amber-400" /> Custos</h3>
              <div className="space-y-2 text-sm opacity-80">
                <div className="flex justify-between"><span>Materiais</span><span>R$ {financials.total_cost_material.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Mão de Obra</span><span>R$ {financials.total_cost_labor.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Custos Fixos</span><span>R$ {financials.total_cost_overhead.toFixed(2)}</span></div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700 text-2xl font-bold text-center">
                R$ {financials.unit_cost.toFixed(2)} <span className="text-xs font-normal">/un</span>
              </div>
              <button onClick={handleSave} disabled={saving} className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold flex justify-center">
                {saving ? <Loader2 className="animate-spin" /> : 'Salvar Receita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <Loader2 className="animate-spin w-8 h-8 mx-auto text-slate-400" />
            </div>
          ) : recipes.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Nenhuma receita encontrada</h3>
              <p className="text-slate-500 mb-6">Comece criando sua primeira ficha técnica.</p>
              <button
                onClick={() => setActiveTab('new')}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
              >
                Cadastrar Nova Receita
              </button>
            </div>
          ) : (
            recipes.map(r => (
              <div key={r.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold text-lg">{r.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditRecipe(r)} className="text-slate-400 hover:text-amber-600"><Edit size={18} /></button>
                    <button onClick={() => setPrintingRecipe(r)} className="text-slate-400 hover:text-blue-600"><Printer size={18} /></button>
                    <button onClick={() => handleDeleteRecipe(r.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-semibold">Custo Unit</span>
                      <div className="text-xl font-bold text-amber-600">R$ {r.unit_cost.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};