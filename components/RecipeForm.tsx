import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Ingredient, Recipe, RecipeItem, Settings, MeasureConversion } from '../types';
import { IngredientService } from '../services/ingredientService';
import { RecipeService } from '../services/recipeService';
import { SettingsService } from '../services/settingsService';
import { calculateRecipeFinancials } from '../utils/calculations';
// IMPORT NOVO:
import { PriceHistoryViewer } from './PriceHistoryViewer';
import {
  Clock,
  Layers,
  Plus,
  Trash2,
  PieChart,
  Edit,
  Loader2,
  BookOpen,
  Save,
  ArrowLeft,
  AlertTriangle,
  History, // Import Novo
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const RecipeForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  // Estados de Dados
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [settings, setSettings] = useState<Settings>({
    employees: [],
    labor_monthly_cost: 0,
    work_hours_monthly: 160,
    fixed_overhead_rate: 0,
    cost_per_minute: 0,
    estimated_monthly_revenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // NOVO ESTADO: Controla visibilidade do histórico
  const [showHistory, setShowHistory] = useState(false);

  // Estados do Formulário
  const [name, setName] = useState('');
  const [yieldUnits, setYieldUnits] = useState(1);
  const [prepTime, setPrepTime] = useState(60);
  const [prepMethod, setPrepMethod] = useState('');
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [currentSellingPrice, setCurrentSellingPrice] = useState(0);

  // Inputs temporários (Adicionar Item)
  const [selectedIngId, setSelectedIngId] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [allIngs, mySettings] = await Promise.all([
          IngredientService.getAll(),
          SettingsService.get(),
        ]);
        setIngredients(allIngs);
        setSettings(mySettings);

        if (id) {
          const allRecipes = await RecipeService.getAll();
          const recipeToEdit = allRecipes.find(r => r.id === id);

          if (recipeToEdit) {
            setName(recipeToEdit.name);
            setYieldUnits(recipeToEdit.yield_units || 1);
            setPrepTime(recipeToEdit.preparation_time_minutes || 0);
            setPrepMethod(recipeToEdit.preparation_method || '');
            setRecipeItems(recipeToEdit.items || []);
            setCurrentSellingPrice(recipeToEdit.selling_price || 0);
          } else {
            toast.error('Receita não encontrada.');
            navigate('/recipes');
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, navigate]);

  // --- LÓGICA DE ITENS ---
  const selectedIngredientDetails = ingredients.find((i) => i.id === selectedIngId);

  useEffect(() => {
    if (selectedIngredientDetails && !selectedUnit) {
      setSelectedUnit(selectedIngredientDetails.base_unit);
    }
  }, [selectedIngId, selectedIngredientDetails, selectedUnit]);

  const addItem = () => {
    if (!selectedIngId || !itemQuantity || !selectedUnit) return;

    const qtyInput = parseFloat(itemQuantity);
    let qtyBase = qtyInput;

    if (selectedIngredientDetails && selectedUnit !== selectedIngredientDetails.base_unit) {
      const conversion = selectedIngredientDetails.conversions?.find(
        (c: MeasureConversion) => c.name === selectedUnit
      );
      if (conversion) {
        qtyBase = qtyInput * conversion.value;
      }
    }

    const newItem: RecipeItem = {
      id: Date.now().toString(),
      ingredient_id: selectedIngId,
      quantity_used: qtyBase,
      quantity_input: qtyInput,
      unit_input: selectedUnit,
      ingredient_name: selectedIngredientDetails?.name
    };

    setRecipeItems([...recipeItems, newItem]);
    setSelectedIngId('');
    setItemQuantity('');
    setSelectedUnit('');
  };

  const removeItem = (itemId: string) => {
    setRecipeItems(recipeItems.filter((i) => i.id !== itemId));
  };

  const handleEditItem = (item: RecipeItem) => {
    const exists = ingredients.find(i => i.id === item.ingredient_id);

    if (!exists) {
      if (confirm(`O ingrediente original "${item.ingredient_name || 'Desconhecido'}" foi excluído da base. Deseja remover este item da receita?`)) {
        removeItem(item.id);
      }
      return;
    }

    setSelectedIngId(item.ingredient_id);
    setItemQuantity(item.quantity_input?.toString() || '');
    setSelectedUnit(item.unit_input || '');
    removeItem(item.id);
    toast.info('Item movido para edição.');
  };

  // --- CÁLCULOS ---
  const financials = calculateRecipeFinancials(
    recipeItems,
    ingredients,
    prepTime,
    yieldUnits,
    settings
  );

  // --- SALVAR ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Por favor, dê um nome para a receita.');
      return;
    }
    if (recipeItems.length === 0) {
      toast.warning('Adicione pelo menos um ingrediente.');
      return;
    }

    try {
      setSaving(true);

      const itemsWithNames = recipeItems.map(item => {
        const ing = ingredients.find(i => i.id === item.ingredient_id);
        return {
          ...item,
          ingredient_name: ing ? ing.name : (item.ingredient_name || 'Item Excluído')
        };
      });

      const recipeData: Recipe = {
        id: id || '',
        name,
        yield_units: yieldUnits,
        preparation_time_minutes: prepTime,
        preparation_method: prepMethod,
        items: itemsWithNames,
        total_cost_material: financials.total_cost_material || 0,
        total_cost_labor: financials.total_cost_labor || 0,
        total_cost_overhead: financials.total_cost_overhead || 0,
        total_cost_final: financials.total_cost_final || 0,
        unit_cost: financials.unit_cost || 0,
        selling_price: currentSellingPrice,
      };

      await RecipeService.save(recipeData);
      toast.success('Receita salva com sucesso!');
      navigate('/recipes');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar receita.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-amber-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/recipes" className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isEditing ? 'Editar Receita' : 'Nova Receita'}
          </h1>
          <p className="text-slate-500">Preencha os dados da ficha técnica</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Coluna Esquerda: Formulário */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome da Receita
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Ex: Bolo de Cenoura"
                  autoFocus={!isEditing}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1">
                    <Clock size={16} /> Tempo (min)
                  </label>
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(parseFloat(e.target.value))}
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
                    onChange={(e) => setYieldUnits(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Ingredientes</h3>

            {/* Input de Ingredientes */}
            <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-slate-50 p-4 rounded-lg">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-slate-500">Ingrediente</label>
                <select
                  value={selectedIngId}
                  onChange={(e) => setSelectedIngId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="">Selecione...</option>
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-32">
                <label className="text-xs font-bold text-slate-500">Qtd</label>
                <input
                  type="number"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  placeholder="0"
                />
              </div>
              <div className="w-full md:w-32">
                <label className="text-xs font-bold text-slate-500">Unidade</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-white"
                  disabled={!selectedIngId}
                >
                  {selectedIngredientDetails ? (
                    <>
                      <option value={selectedIngredientDetails.base_unit}>
                        {selectedIngredientDetails.base_unit}
                      </option>
                      {selectedIngredientDetails.conversions?.map((c: any, idx: number) => (
                        <option key={idx} value={c.name}>{c.name}</option>
                      ))}
                    </>
                  ) : (
                    <option>-</option>
                  )}
                </select>
              </div>
              <button
                onClick={addItem}
                disabled={!selectedIngId}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {recipeItems.map((item) => {
                const ing = ingredients.find((i) => i.id === item.ingredient_id);
                const displayName = ing ? ing.name : (item.ingredient_name || '(Ingrediente Desconhecido)');
                const cost = (ing?.unit_cost_base || 0) * item.quantity_used;

                return (
                  <div key={item.id} className={`flex justify-between items-center p-3 border-b hover:bg-slate-50 ${!ing ? 'bg-amber-50 border-amber-100' : ''}`}>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {displayName}
                        {!ing && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                            <AlertTriangle size={10} /> Excluído da Base
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.quantity_input} {item.unit_input}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-semibold text-slate-600">
                        {ing ? `R$ ${cost.toFixed(2)}` : <span className="text-slate-400 italic">--</span>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditItem(item)}
                          className={`text-slate-400 ${ing ? 'hover:text-amber-600' : 'opacity-30 cursor-not-allowed'}`}
                        >
                          <Edit size={16} />
                        </button>
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {recipeItems.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Nenhum ingrediente adicionado.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-amber-600" /> Modo de Preparo
            </h3>
            <textarea
              value={prepMethod}
              onChange={(e) => setPrepMethod(e.target.value)}
              placeholder="Descreva o passo a passo..."
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none h-40 resize-y text-slate-700"
            />
          </div>
        </div>

        {/* Coluna Direita: Resumo */}
        <div className="space-y-6">
          <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg sticky top-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-amber-400" /> Custos Calculados
            </h3>
            <div className="space-y-2 text-sm opacity-80">
              <div className="flex justify-between">
                <span>Materiais</span>
                <span>R$ {financials.total_cost_material.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Mão de Obra</span>
                <span>R$ {financials.total_cost_labor.toFixed(2)}</span>
              </div>
              {/* BLOCO ATUALIZADO NO RESUMO (COLUNA DIREITA) */}
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  Custos Fixos
                  <div className="group relative cursor-help">
                    <HelpCircle size={12} className="text-amber-400 opacity-70 hover:opacity-100" />
                    <div className="absolute right-0 w-48 p-2 bg-white text-slate-700 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 -mt-16 mr-[-10px]">
                      Taxa de rateio ({settings.fixed_overhead_rate}%) aplicada sobre Materiais + Mão de Obra.
                    </div>
                  </div>
                </span>
                <span>R$ {financials.total_cost_overhead.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 mt-2 border-t border-slate-600 font-bold text-amber-400">
                <span>Total Receita</span>
                <span>R$ {financials.total_cost_final.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700 text-2xl font-bold text-center">
              R$ {financials.unit_cost.toFixed(2)} <span className="text-xs font-normal">/un</span>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold flex justify-center items-center gap-2 transition"
            >
              {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Receita</>}
            </button>
          </div>

          {/* NOVO BLOCO: Botão de Histórico (Só aparece se estiver editando) */}
          {isEditing && (
            <>
              {!showHistory ? (
                <button
                  onClick={() => setShowHistory(true)}
                  className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-50 transition shadow-sm"
                >
                  <History size={18} /> Ver Histórico de Preços
                </button>
              ) : (
                // Aqui renderizamos o componente de histórico
                <PriceHistoryViewer recipeId={id!} onClose={() => setShowHistory(false)} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};