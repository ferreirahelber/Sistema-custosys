import React, { useState, useEffect } from 'react';
import { Ingredient, Recipe, RecipeItem, Settings } from '../types';
import { StorageService } from '../services/storage';
import { calculateRecipeFinancials } from '../utils/calculations';
import { ChefHat, Clock, Layers, Plus, Trash2, PieChart, AlertTriangle, BoxSelect, CheckCircle, Printer, Edit } from 'lucide-react';
import { RecipePrintView } from './RecipePrintView';

export const RecipeForm: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('list');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [settings, setSettings] = useState<Settings>(StorageService.getSettings());
  const [recipes, setRecipes] = useState<Recipe[]>(StorageService.getRecipes());
  
  // Impressão
  const [printingRecipe, setPrintingRecipe] = useState<Recipe | null>(null);

  // Edição
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [yieldUnits, setYieldUnits] = useState(1);
  const [prepTime, setPrepTime] = useState(60);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  
  const [selectedIngId, setSelectedIngId] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');

  const [productionMsg, setProductionMsg] = useState('');

  useEffect(() => {
    setIngredients(StorageService.getIngredients());
    setSettings(StorageService.getSettings());
    setRecipes(StorageService.getRecipes());
  }, [activeTab]);

  const selectedIngredientDetails = ingredients.find(i => i.id === selectedIngId);

  useEffect(() => {
    if (selectedIngredientDetails) {
        setSelectedUnit(selectedIngredientDetails.base_unit);
    }
  }, [selectedIngId]);

  // --- LÓGICA DE EDIÇÃO ---
  const handleEditRecipe = (recipe: Recipe) => {
      setEditingId(recipe.id);
      setName(recipe.name);
      setYieldUnits(recipe.yield_units);
      setPrepTime(recipe.preparation_time_minutes);
      setRecipeItems(recipe.items);
      setActiveTab('new'); // Leva para a aba de formulário
  };

  const cancelEdit = () => {
      setEditingId(null);
      setName('');
      setYieldUnits(1);
      setPrepTime(60);
      setRecipeItems([]);
      setActiveTab('list');
  };
  // ------------------------

  const addItem = () => {
    if (!selectedIngId || !itemQuantity || !selectedUnit) return;
    
    const qtyInput = parseFloat(itemQuantity);
    let qtyBase = qtyInput;

    if (selectedIngredientDetails && selectedUnit !== selectedIngredientDetails.base_unit) {
        const conversion = selectedIngredientDetails.conversions?.find(c => c.name === selectedUnit);
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

  const handleDeleteRecipe = (id: string) => {
    if(window.confirm("Excluir esta receita permanentemente?")) {
        const updated = StorageService.deleteRecipe(id);
        setRecipes(updated);
        // Se estiver editando a receita que foi excluída, cancela a edição
        if (editingId === id) {
            cancelEdit();
        }
    }
  };

  const handleProduce = (recipe: Recipe) => {
      const batches = prompt(`Quantos lotes de "${recipe.name}" você vai produzir?`, "1");
      if (batches) {
          const qty = parseFloat(batches);
          if (qty > 0) {
              StorageService.processProductionBatch(recipe.items, qty);
              setProductionMsg(`Sucesso! Estoque atualizado para ${qty} lote(s) de ${recipe.name}.`);
              setTimeout(() => setProductionMsg(''), 4000);
          }
      }
  };

  const financials = calculateRecipeFinancials(
    recipeItems, 
    ingredients, 
    prepTime, 
    yieldUnits, 
    settings
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || recipeItems.length === 0) return;

    const newRecipe: Recipe = {
      id: editingId || Date.now().toString(), // Mantém ID se editando, cria novo se não
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

    const updated = StorageService.saveRecipe(newRecipe);
    setRecipes(updated);
    
    // Limpeza após salvar
    setEditingId(null);
    setName('');
    setRecipeItems([]);
    setYieldUnits(1);
    setActiveTab('list');
  };

  const isMissingSettings = settings.cost_per_minute === 0;

  return (
    <div className="space-y-6">
      {/* Modal de Impressão */}
      {printingRecipe && (
          <RecipePrintView 
            recipe={printingRecipe} 
            onClose={() => setPrintingRecipe(null)} 
          />
      )}

      <div className="flex gap-4 border-b">
        <button 
          onClick={() => { setActiveTab('list'); cancelEdit(); }}
          className={`pb-3 px-2 font-medium transition ${activeTab === 'list' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-500'}`}
        >
          Minhas Receitas
        </button>
        <button 
          onClick={() => setActiveTab('new')}
          className={`pb-3 px-2 font-medium transition ${activeTab === 'new' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-500'}`}
        >
          {editingId ? 'Editando Receita' : 'Nova Receita'}
        </button>
      </div>

      {productionMsg && (
          <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 animate-pulse">
              <CheckCircle size={20} /> {productionMsg}
          </div>
      )}

      {activeTab === 'new' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <ChefHat className="text-amber-600" /> {editingId ? 'Editar Receita' : 'Detalhes da Receita'}
                  </h2>
                  {editingId && (
                      <button 
                        onClick={cancelEdit}
                        className="text-sm text-red-500 hover:text-red-700 underline"
                      >
                          Cancelar Edição
                      </button>
                  )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Receita</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Ex: Bolo de Cenoura com Chocolate"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1">
                      <Clock size={16} /> Tempo Preparo (min)
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
                      <Layers size={16} /> Rendimento (unidades)
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

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
               <h3 className="text-lg font-bold text-slate-800 mb-4">Composição (Ingredientes)</h3>
               
               <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-slate-50 p-4 rounded-lg">
                  <div className="flex-1 w-full">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Ingrediente</label>
                    <select
                      value={selectedIngId}
                      onChange={e => setSelectedIngId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-slate-800"
                    >
                      <option value="" className="text-slate-400">Selecione...</option>
                      {ingredients.map(i => (
                        <option key={i.id} value={i.id} className="text-slate-800">
                           {i.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full md:w-40">
                    <label className="text-xs font-semibold text-slate-500 uppercase">
                      Medida
                    </label>
                    <select
                      value={selectedUnit}
                      onChange={e => setSelectedUnit(e.target.value)}
                      disabled={!selectedIngId}
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-slate-800 disabled:bg-slate-100"
                    >
                        {selectedIngredientDetails ? (
                            <>
                                <option value={selectedIngredientDetails.base_unit}>
                                    {selectedIngredientDetails.base_unit === 'g' ? 'Gramas (g)' : 
                                     selectedIngredientDetails.base_unit === 'ml' ? 'Mililitros (ml)' : 'Unidade (un)'}
                                </option>
                                {selectedIngredientDetails.conversions?.map((c, idx) => (
                                    <option key={idx} value={c.name}>{c.name}</option>
                                ))}
                            </>
                        ) : (
                            <option value="">-</option>
                        )}
                    </select>
                  </div>

                  <div className="w-full md:w-32">
                    <label className="text-xs font-semibold text-slate-500 uppercase">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      value={itemQuantity}
                      onChange={e => setItemQuantity(e.target.value)}
                      placeholder="0"
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <button 
                    onClick={addItem}
                    disabled={!selectedIngId || !itemQuantity}
                    className="w-full md:w-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                  </button>
               </div>

               <div className="space-y-2">
                 {recipeItems.map((item, idx) => {
                   const ing = ingredients.find(i => i.id === item.ingredient_id);
                   const cost = (ing?.unit_cost_base || 0) * item.quantity_used;
                   
                   const displayQty = item.quantity_input || item.quantity_used;
                   const displayUnit = item.unit_input || ing?.base_unit;

                   return (
                     <div key={item.id} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-slate-50 transition">
                       <div>
                         <div className="font-medium text-slate-800">{ing?.name}</div>
                         <div className="text-xs text-slate-500">
                            {displayQty} {displayUnit} 
                            {displayUnit !== ing?.base_unit && (
                                <span className="ml-1 text-slate-400">({item.quantity_used} {ing?.base_unit})</span>
                            )}
                         </div>
                       </div>
                       <div className="flex items-center gap-4">
                         <div className="text-sm font-semibold text-slate-600">R$ {cost.toFixed(2)}</div>
                         <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                           <Trash2 size={16} />
                         </button>
                       </div>
                     </div>
                   );
                 })}
                 {recipeItems.length === 0 && (
                   <p className="text-center text-slate-400 py-4 italic">Nenhum ingrediente adicionado.</p>
                 )}
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg sticky top-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <PieChart size={20} className="text-amber-400"/> {editingId ? 'Custos (Editando)' : 'Custos do Lote'}
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <span className="opacity-80">Matéria Prima</span>
                  <span className="font-mono">R$ {(financials.total_cost_material || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <span className="opacity-80">Mão de Obra ({prepTime}min)</span>
                  <span className="font-mono">R$ {(financials.total_cost_labor || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <span className="opacity-80">Custos Fixos ({settings.fixed_overhead_rate || 0}%)</span>
                  <span className="font-mono">R$ {(financials.total_cost_overhead || 0).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center pt-2 text-lg font-bold text-amber-400">
                  <span>Total</span>
                  <span>R$ {(financials.total_cost_final || 0).toFixed(2)}</span>
                </div>
              </div>

              {isMissingSettings && (
                  <div className="mt-4 p-3 bg-red-900/40 border border-red-700 rounded text-xs text-red-200 flex gap-2">
                      <AlertTriangle size={16} className="shrink-0" />
                      <p>
                        <b>Atenção:</b> Mão de obra e Custos fixos estão zerados porque você ainda não salvou as <span className="underline cursor-pointer" onClick={() => window.location.hash = 'settings'}>Configurações</span>.
                      </p>
                  </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-700">
                 <div className="text-xs uppercase tracking-widest opacity-60 mb-1">Custo Unitário</div>
                 <div className="text-3xl font-bold">R$ {(financials.unit_cost || 0).toFixed(2)}</div>
                 <div className="text-xs opacity-60">Baseado em {yieldUnits} unidades</div>
              </div>

              <button 
                onClick={handleSave}
                disabled={recipeItems.length === 0 || !name}
                className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? 'Salvar Alterações' : 'Salvar Receita'}
              </button>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhuma receita salva.</p>
              <button onClick={() => setActiveTab('new')} className="mt-4 text-amber-600 hover:underline">
                  Criar minha primeira receita
              </button>
            </div>
          ) : (
            recipes.map(recipe => (
              <div key={recipe.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition group relative">
                 <div className="flex justify-between items-start mb-3">
                   <h3 className="font-bold text-slate-800 text-lg leading-tight">{recipe.name}</h3>
                   <div className="flex gap-1">
                     <button 
                        onClick={() => handleEditRecipe(recipe)}
                        className="text-slate-400 hover:text-amber-600 transition p-1"
                        title="Editar Receita"
                     >
                        <Edit size={18} />
                     </button>
                     <button 
                        onClick={() => setPrintingRecipe(recipe)}
                        className="text-slate-400 hover:text-blue-600 transition p-1"
                        title="Imprimir Ficha Técnica"
                     >
                        <Printer size={18} />
                     </button>
                     <button 
                        onClick={() => handleProduce(recipe)}
                        className="text-slate-400 hover:text-green-600 transition p-1"
                        title="Produzir Lote (Baixar Estoque)"
                     >
                        <BoxSelect size={18} />
                     </button>
                     <button 
                        onClick={() => handleDeleteRecipe(recipe.id)}
                        className="text-slate-300 hover:text-red-500 transition p-1"
                        title="Excluir"
                     >
                        <Trash2 size={18} />
                     </button>
                   </div>
                 </div>
                 
                 <div className="flex gap-4 text-xs text-slate-500 mb-4">
                   <span className="flex items-center gap-1"><Clock size={12}/> {recipe.preparation_time_minutes} min</span>
                   <span className="flex items-center gap-1"><Layers size={12}/> {recipe.yield_units} un</span>
                 </div>

                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <div className="flex justify-between items-end">
                     <div>
                       <span className="text-xs text-slate-400 uppercase font-semibold">Custo Unitário</span>
                       <div className="text-xl font-bold text-amber-600">R$ {recipe.unit_cost.toFixed(2)}</div>
                     </div>
                     <div className="text-right">
                        <span className="text-xs text-slate-400 uppercase font-semibold">Total Lote</span>
                        <div className="text-sm font-medium text-slate-600">R$ {recipe.total_cost_final.toFixed(2)}</div>
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