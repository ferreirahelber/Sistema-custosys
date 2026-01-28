import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Ingredient, Recipe, RecipeItem, Settings, MeasureConversion, Category } from '../types';
import { IngredientService } from '../services/ingredientService';
import { RecipeService } from '../services/recipeService';
import { SettingsService } from '../services/settingsService';
import { CategoryService } from '../services/categoryService';
import { calculateRecipeFinancials } from '../utils/calculations';
import { PriceHistoryViewer } from './PriceHistoryViewer';
import { CategoryManager } from './CategoryManager';
import {
  Clock, Layers, Plus, Trash2, Edit, Loader2, BookOpen, Save,
  ArrowLeft, AlertTriangle, History, HelpCircle, Package, Barcode, Wand2, Tag, Settings as SettingsIcon, X
} from 'lucide-react';
import { toast } from 'sonner';

export const RecipeForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Settings>({
    employees: [], labor_monthly_cost: 0, work_hours_monthly: 160, fixed_overhead_rate: 0, cost_per_minute: 0, estimated_monthly_revenue: 0, card_debit_rate: 1.99, card_credit_rate: 4.99
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Estados do Formulário
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [isBase, setIsBase] = useState(false);
  const [yieldUnits, setYieldUnits] = useState(1);
  const [prepTime, setPrepTime] = useState(60);
  const [prepMethod, setPrepMethod] = useState('');
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [currentSellingPrice, setCurrentSellingPrice] = useState(0);

  // Estados para Modal de CRIAR Categoria (+)
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Estado para Modal de GERENCIAR Categoria (Engrenagem)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  // Estados de Ingredientes
  const [selectedIngId, setSelectedIngId] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [selectedExtraId, setSelectedExtraId] = useState('');
  const [extraCost, setExtraCost] = useState(0);

  const foodIngredients = ingredients.filter(i => i.category !== 'product' && i.category !== 'packaging');
  const packagingItems = ingredients.filter(i => i.category === 'packaging');

  // Função para recarregar categorias
  const refreshCategories = async () => {
    try {
      const allCats = await CategoryService.getAll();
      setCategories(allCats || []);
    } catch (catError) {
      console.warn("Erro ao recarregar categorias.", catError);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [allIngs, mySettings] = await Promise.all([
          IngredientService.getAll(),
          SettingsService.get()
        ]);
        setIngredients(allIngs);
        setSettings(mySettings);

        await refreshCategories();

        if (id) {
          try {
            const recipeToEdit = await RecipeService.getById(id);
            if (recipeToEdit) {
              setName(recipeToEdit.name);
              setBarcode(recipeToEdit.barcode || '');
              setCategory(recipeToEdit.category || 'Geral');
              setIsBase(recipeToEdit.is_base || false);
              setYieldUnits(recipeToEdit.yield_units || 1);
              setPrepTime(recipeToEdit.preparation_time_minutes || 0);
              setPrepMethod(recipeToEdit.preparation_method || '');
              setRecipeItems(recipeToEdit.items || []);
              setCurrentSellingPrice(recipeToEdit.selling_price || 0);
            } else {
              toast.error('Receita não encontrada.');
              navigate('/recipes');
            }
          } catch (fetchError) {
            console.error(fetchError);
            toast.error('Erro ao buscar detalhes da receita.');
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar dados do sistema.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, navigate]);

  const selectedIngredientDetails = ingredients.find((i) => i.id === selectedIngId);
  useEffect(() => {
    if (selectedIngredientDetails && !selectedUnit) {
      setSelectedUnit(selectedIngredientDetails.base_unit || 'g');
    }
  }, [selectedIngId, selectedIngredientDetails, selectedUnit]);

  const selectedPackagingDetails = ingredients.find((i) => i.id === selectedExtraId);
  useEffect(() => {
    if (selectedPackagingDetails) setExtraCost(selectedPackagingDetails.unit_cost_base || 0);
  }, [selectedExtraId, selectedPackagingDetails]);

  const generateCode = () => {
    setBarcode(Math.floor(10000000 + Math.random() * 90000000).toString());
    toast.success('Código gerado!');
  };

  // --- FUNÇÃO SALVAR NOVA CATEGORIA (Botão +) ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      const newCat = await CategoryService.create(newCategoryName);
      setCategories([...categories, newCat]);
      setCategory(newCat.name); // Já seleciona a nova categoria
      toast.success(`Categoria "${newCat.name}" criada!`);
      setShowCategoryModal(false);
      setNewCategoryName('');
    } catch (error) {
      toast.error('Erro ao criar categoria.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const addIngredientItem = () => {
    if (!selectedIngId || !itemQuantity || !selectedUnit) return;
    const qtyInput = parseFloat(itemQuantity);
    let qtyBase = qtyInput;
    if (selectedIngredientDetails && selectedUnit !== selectedIngredientDetails.base_unit) {
      const conversion = selectedIngredientDetails.conversions?.find((c: MeasureConversion) => c.name === selectedUnit);
      if (conversion) qtyBase = qtyInput * conversion.value;
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
    setSelectedIngId(''); setItemQuantity(''); setSelectedUnit('');
  };

  const addPackagingItem = () => {
    if (!selectedExtraId || extraCost <= 0) return;
    const newItem: RecipeItem = {
      id: Date.now().toString(),
      ingredient_id: selectedExtraId,
      quantity_used: extraCost,
      quantity_input: 1,
      unit_input: 'unit',
      ingredient_name: selectedPackagingDetails?.name
    };
    setRecipeItems([...recipeItems, newItem]);
    setSelectedExtraId(''); setExtraCost(0);
  };

  const removeItem = (itemId: string) => {
    setRecipeItems(recipeItems.filter((i) => i.id !== itemId));
  };

  const handleEditItem = (item: RecipeItem) => {
    const ingredient = ingredients.find(i => i.id === item.ingredient_id);

    if (!ingredient) {
      removeItem(item.id);
      toast.info("Item inválido removido.");
      return;
    }

    if (ingredient.category === 'packaging') {
      setSelectedExtraId(item.ingredient_id);
      setExtraCost(item.quantity_used || 0);
      toast.info('Embalagem movida para edição.');
    } else {
      setSelectedIngId(item.ingredient_id);
      setItemQuantity(item.quantity_input?.toString() || '');
      setSelectedUnit(item.unit_input || '');
      toast.info('Ingrediente movido para edição.');
    }

    removeItem(item.id);
  };

  const financials = calculateRecipeFinancials(recipeItems, ingredients, prepTime, yieldUnits, settings);
  const packagingCost = recipeItems.reduce((acc, item) => {
    const ing = ingredients.find(i => i.id === item.ingredient_id);
    return ing?.category === 'packaging' ? acc + ((ing.unit_cost_base || 0) * item.quantity_used) : acc;
  }, 0);
  const materialsCostOnly = financials.total_cost_material - packagingCost;
  const totalFixedExpensesApprox = (settings.estimated_monthly_revenue * settings.fixed_overhead_rate) / 100;
  const showDetailedTooltip = settings.estimated_monthly_revenue > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.warning('Dê um nome para a receita.'); return; }
    if (recipeItems.length === 0) { toast.warning('Adicione itens à receita.'); return; }

    try {
      setSaving(true);
      const itemsWithNames = recipeItems.map(item => {
        const ing = ingredients.find(i => i.id === item.ingredient_id);
        return {
          ...item,
          ingredient_name: ing ? ing.name : (item.ingredient_name || 'Excluído')
        };
      });

      const recipeData: Recipe = {
        id: id || '',
        name,
        barcode,
        category: category || 'Geral',
        is_base: isBase,
        yield_units: yieldUnits,
        preparation_time_minutes: prepTime,
        preparation_method: prepMethod,
        items: itemsWithNames,
        total_cost_material: financials.total_cost_material,
        total_cost_labor: financials.total_cost_labor,
        total_cost_overhead: financials.total_cost_overhead,
        total_cost_final: financials.total_cost_final,
        unit_cost: financials.unit_cost,
        selling_price: currentSellingPrice,
      };
      await RecipeService.save(recipeData);
      toast.success('Receita salva!');
      navigate('/recipes');
    } catch (error) {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-amber-600 w-8 h-8" /></div>;

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/recipes" className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500"><ArrowLeft size={24} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{isEditing ? 'Editar Receita' : 'Nova Receita'}</h1>
          <p className="text-slate-500">Ficha técnica e precificação</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Receita</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Ex: Bolo de Cenoura"
                  autoFocus={!isEditing}
                />
              </div>

              {/* SELETOR DE CATEGORIA + BOTÕES (+ e Engrenagem) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Tag size={14} /> Categoria</label>
                <div className="flex gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  >
                    <option value="">Selecione...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>

                  {/* Botão ADICIONAR (Modal Rápido) */}
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:bg-green-100 hover:text-green-700 hover:border-green-300 transition"
                    title="Nova Categoria"
                  >
                    <Plus size={20} />
                  </button>

                  {/* Botão GERENCIAR (Lista Completa) */}
                  <button
                    type="button"
                    onClick={() => setIsCategoryManagerOpen(true)}
                    className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-200 transition"
                    title="Gerenciar Categorias"
                  >
                    <SettingsIcon size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1"><Barcode size={16} /> Código</label>
                <div className="flex gap-1">
                  <input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full px-2 py-2 border rounded-l-lg outline-none text-sm focus:ring-2 focus:ring-amber-500"
                    placeholder="SKU"
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="bg-slate-100 border border-l-0 rounded-r-lg px-2 hover:bg-slate-200 text-slate-600 transition"
                  >
                    <Wand2 size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1"><Clock size={16} /> Tempo (min)</label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1"><Layers size={16} /> Rendimento</label>
                <input
                  type="number"
                  value={yieldUnits}
                  onChange={(e) => setYieldUnits(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            {/* CONFIGURAÇÃO DE RECEITA BASE - ADIÇÃO VISUAL */}
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100 mt-4">
              <input
                type="checkbox"
                id="is_base"
                checked={isBase}
                onChange={(e) => setIsBase(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="is_base" className="flex flex-col cursor-pointer">
                <span className="text-sm font-bold text-slate-800">Receita Base (Uso Interno)</span>
                <span className="text-xs text-slate-500">Se marcado, esta receita não aparecerá no PDV para venda.</span>
              </label>
            </div>
          </div>

          {/* Ingredientes */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Ingredientes</h3>
            <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-slate-50 p-4 rounded-lg">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-slate-500 uppercase">Ingrediente</label>
                <select
                  value={selectedIngId}
                  onChange={(e) => setSelectedIngId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  {foodIngredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="w-full md:w-24">
                <label className="text-xs font-bold text-slate-500 uppercase">Qtd</label>
                <input
                  type="number"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div className="w-full md:w-24">
                <label className="text-xs font-bold text-slate-500 uppercase">Unidade</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  disabled={!selectedIngId}
                >
                  {selectedIngredientDetails ? (
                    <>
                      <option value={selectedIngredientDetails.base_unit}>{selectedIngredientDetails.base_unit}</option>
                      {selectedIngredientDetails.conversions?.map((c: any, idx: number) => <option key={idx} value={c.name}>{c.name}</option>)}
                    </>
                  ) : <option>-</option>}
                </select>
              </div>
              <button
                onClick={addIngredientItem}
                disabled={!selectedIngId}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition font-bold"
              >
                <Plus size={20} />
              </button>
            </div>

            {recipeItems.filter(i => ingredients.find(ing => ing.id === i.ingredient_id)?.category !== 'packaging').length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">Nenhum ingrediente adicionado.</div>
            ) : (
              <div className="space-y-2">
                {recipeItems.filter(i => ingredients.find(ing => ing.id === i.ingredient_id)?.category !== 'packaging').map((item) => {
                  const ing = ingredients.find(i => i.id === item.ingredient_id);
                  const cost = (ing?.unit_cost_base || 0) * item.quantity_used;
                  return (
                    <div key={item.id} className={`flex justify-between items-center p-3 border-b hover:bg-slate-50 transition ${!ing ? 'bg-amber-50 border-amber-100' : ''}`}>
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          {ing?.name || item.ingredient_name}
                          {!ing && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200"><AlertTriangle size={10} /> Excluído</span>}
                        </div>
                        <span className="text-xs text-slate-500">{item.quantity_input} {item.unit_input}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-slate-600">{ing ? `R$ ${cost.toFixed(2)}` : '--'}</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditItem(item)} className="text-slate-400 hover:text-amber-600 transition"><Edit size={16} /></button>
                          <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Embalagens */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-amber-600">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
              <Package size={20} className="text-amber-600" />
              Embalagens
            </h3>
            <p className="text-xs text-slate-400 mb-4">Itens não comestíveis necessários para a venda.</p>

            <div className="flex gap-2 mb-4">
              <select
                className="flex-1 p-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                value={selectedExtraId}
                onChange={(e) => {
                  const item = ingredients.find(i => i.id === e.target.value);
                  setSelectedExtraId(e.target.value);
                  if (item) setExtraCost(item.unit_cost_base || 0);
                }}
              >
                <option value="">Selecione uma embalagem...</option>
                {packagingItems.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (R$ {(ing.unit_cost_base || 0).toFixed(2)})
                  </option>
                ))}
              </select>
              <button
                onClick={addPackagingItem}
                disabled={!selectedExtraId}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition font-bold"
              >
                <Plus size={20} />
              </button>
            </div>

            {recipeItems.filter(i => ingredients.find(ing => ing.id === i.ingredient_id)?.category === 'packaging').length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">Nenhuma embalagem adicionada.</div>
            ) : (
              <div className="space-y-2">
                {recipeItems.filter(i => ingredients.find(ing => ing.id === i.ingredient_id)?.category === 'packaging').map((item) => {
                  const ing = ingredients.find(i => i.id === item.ingredient_id);
                  return (
                    <div key={item.id} className="flex justify-between items-center p-3 border-b hover:bg-slate-50 transition">
                      <div>
                        <div className="font-bold text-slate-800">{ing?.name || item.ingredient_name}</div>
                        <span className="text-xs text-slate-500">1 unidade</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-slate-600">R$ {item.quantity_used.toFixed(2)}</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditItem(item)} className="text-slate-400 hover:text-amber-600 transition"><Edit size={16} /></button>
                          <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><BookOpen size={20} className="text-amber-600" /> Modo de Preparo</h3>
            <textarea
              value={prepMethod}
              onChange={(e) => setPrepMethod(e.target.value)}
              placeholder="Descreva o passo a passo da sua receita..."
              className="w-full px-4 py-3 border rounded-lg outline-none h-40 resize-y text-slate-700 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* COLUNA DIREITA (RESUMO) */}
        <div className="space-y-6">
          <div className="sticky top-6 bg-slate-800 text-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock size={20} className="text-amber-400" /> Custos Calculados</h3>
            <div className="space-y-2 text-sm opacity-80">
              <div className="flex justify-between">
                <span>Materiais</span>
                <span>R$ {materialsCostOnly.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-blue-200">
                <span className="flex items-center gap-1">Embalagens <Package size={12} /></span>
                <span>R$ {packagingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Mão de Obra</span>
                <span>R$ {financials.total_cost_labor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  Custos Fixos
                  <div className="group relative cursor-help">
                    <HelpCircle size={12} className="text-amber-400 opacity-70 hover:opacity-100" />
                    <div className="absolute right-0 w-64 p-3 bg-white text-slate-600 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 bottom-full mb-2 -mr-2 border border-slate-100">
                      {showDetailedTooltip ? (
                        <>
                          <div className="font-bold text-amber-600 border-b border-amber-100 pb-2 mb-2">
                            Taxa de {settings.fixed_overhead_rate}%:
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Despesas Fixas:</span>
                              <strong>R$ {totalFixedExpensesApprox.toFixed(2)}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Faturamento Estimado:</span>
                              <strong>R$ {settings.estimated_monthly_revenue.toFixed(2)}</strong>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p>Taxa de <strong>{settings.fixed_overhead_rate}%</strong> definida nas configurações.</p>
                      )}
                      <div className="absolute bottom-[-5px] right-3 w-3 h-3 bg-white border-b border-r border-slate-100 transform rotate-45"></div>
                    </div>
                  </div>
                </span>
                <span>R$ {financials.total_cost_overhead.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 mt-2 border-t border-slate-600 font-bold text-amber-400">
                <span>Total</span>
                <span>R$ {financials.total_cost_final.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 text-2xl font-bold text-center">
              R$ {financials.unit_cost.toFixed(2)} <span className="text-xs font-normal">/un</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold flex justify-center items-center gap-2 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Receita</>}
            </button>
          </div>
          {isEditing && (
            <button
              onClick={() => setShowHistory(true)}
              className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-50 transition"
            >
              <History size={18} /> Ver Histórico
            </button>
          )}
          {showHistory && id && <PriceHistoryViewer recipeId={id} onClose={() => setShowHistory(false)} />}
        </div>
      </div>

      {/* MODAL DE GERENCIAMENTO DE CATEGORIAS (ENGRENAGEM) */}
      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => {
          setIsCategoryManagerOpen(false);
          refreshCategories();
        }}
        onUpdate={refreshCategories}
      />

      {/* MODAL DE CRIAÇÃO RÁPIDA DE CATEGORIA (BOTÃO +) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-0 overflow-hidden animate-in zoom-in-95">

            {/* Header do Modal */}
            <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg text-white">
                  <Tag size={20} />
                </div>
                <h3 className="font-bold text-lg text-white">Nova Categoria</h3>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-white/70 hover:text-white transition p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <form onSubmit={handleSaveCategory} className="p-6">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Nome da Categoria</label>
              <input
                autoFocus
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 mb-6 text-slate-800"
                placeholder="Ex: Tortas, Salgados, Bolos..."
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
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creatingCategory ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>Plus {newCategoryName.trim() ? `"${newCategoryName}"` : 'Categoria'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};