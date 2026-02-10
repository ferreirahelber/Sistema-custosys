import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Save, ArrowLeft, Loader2, SaveAll, Clock, HelpCircle, Package, History,
  Tag, Plus, Settings as SettingsIcon, Barcode, Wand2, Layers, ShoppingCart,
  BookOpen, Trash2, Edit, X, ChefHat
} from 'lucide-react';
import { useRecipeForm } from '../hooks/useRecipeForm';
import { toast } from 'sonner';
import { PriceHistoryViewer } from './PriceHistoryViewer';
import { CategoryManager } from './CategoryManager';
import { Category, Ingredient, Recipe, RecipeItem, Settings } from '../types';

// --- SUBCOMPONENTS DEFINED INLINE TO ENSURE STABILITY ---

const RecipeGeneralSettings: React.FC<any> = ({
  name, setName, barcode, setBarcode, category, setCategory,
  prepTime, setPrepTime, yieldUnits, setYieldUnits,
  isBase, setIsBase, yieldQuantity, setYieldQuantity, yieldUnit, setYieldUnit,
  categories, isEditing, onOpenCategoryModal, onOpenCategoryManager, onGenerateCode
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Receita</label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-4 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="Ex: Bolo de Chocolate"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Selecione...</option>
              {categories.map((c: Category) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={onOpenCategoryManager}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
              title="Gerenciar Categorias"
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Código / Barras</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-slate-400"><Barcode size={16} /></span>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="EAN / ID"
              />
            </div>
            <button
              onClick={onGenerateCode}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              title="Gerar código"
            >
              <Wand2 size={18} />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Tempo de Prep. (min)</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400"><Clock size={16} /></span>
            <input
              type="number"
              value={prepTime}
              onChange={(e) => setPrepTime(Number(e.target.value))}
              className="w-full pl-9 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Rendimento</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={yieldQuantity}
              onChange={(e) => setYieldQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Qtd"
            />
            <select
              value={yieldUnit}
              onChange={(e: any) => setYieldUnit(e.target.value)}
              className="w-24 px-2 py-2 border rounded-lg bg-white outline-none"
            >
              <option value="un">un</option>
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="is_base"
          checked={isBase}
          onChange={(e) => setIsBase(e.target.checked)}
          className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
        />
        <label htmlFor="is_base" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
          Esta receita é uma <strong>Base/Insumo</strong> (será usada em outras receitas)
        </label>
      </div>
    </div>
  );
};

const RecipePreparation: React.FC<any> = ({ method, setMethod }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <BookOpen size={20} className="text-amber-600" /> Modo de Preparo
      </h3>
      <textarea
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        placeholder="Descreva o passo a passo da sua receita..."
        className="w-full px-4 py-3 border rounded-lg outline-none h-40 resize-y text-slate-700 focus:ring-2 focus:ring-amber-500"
      />
    </div>
  );
};

const RecipeFinancials: React.FC<any> = ({
  financials, settings, onSave, isSaving, isEditing, onShowHistory, packagingCost = 0, isSummaryMode = false
}) => {
  // Cálculo seguro para evitar NaN
  const materialsCost = financials?.total_cost_material || 0;
  const laborCost = financials?.total_cost_labor || 0;
  const overheadCost = financials?.total_cost_overhead || 0;
  const finalCost = financials?.total_cost_final || 0;
  const unitCost = financials?.unit_cost || 0;

  const materialsCostOnly = materialsCost - packagingCost;
  const totalFixedExpensesApprox = (settings.estimated_monthly_revenue * settings.fixed_overhead_rate) / 100;
  const showDetailedTooltip = settings.estimated_monthly_revenue > 0;

  if (isSummaryMode) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Resumo de Custos</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Materiais</span>
            <span className="font-semibold">R$ {materialsCostOnly.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Embalagens</span>
            <span className="font-semibold text-purple-600">R$ {packagingCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Mão de Obra</span>
            <span className="font-semibold">R$ {laborCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Custos Fixos</span>
            <span className="font-semibold">R$ {overheadCost.toFixed(2)}</span>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className="font-bold text-slate-800">Custo Total</span>
            <span className="font-bold text-xl text-emerald-600">R$ {finalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
            <span className="font-bold text-slate-600">Custo Unitário</span>
            <span className="font-bold text-lg text-slate-800">R$ {unitCost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg">
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
            <span>R$ {laborCost.toFixed(2)}</span>
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
            <span>R$ {overheadCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 mt-2 border-t border-slate-600 font-bold text-amber-400">
            <span>Total</span>
            <span>R$ {finalCost.toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700 text-2xl font-bold text-center">
          R$ {unitCost.toFixed(2)} <span className="text-xs font-normal">/un</span>
        </div>
      </div>
      {isEditing && (
        <button
          onClick={onShowHistory}
          className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-50 transition"
        >
          <History size={18} /> Ver Histórico
        </button>
      )}
    </div>
  );
};

const RecipeIngredientsList: React.FC<any> = ({
  ingredients, baseRecipes, recipeItems,
  onAddItem, onRemoveItem
}) => {
  // 1. Ingredientes
  const [ingId, setIngId] = useState('');
  const [ingQty, setIngQty] = useState('');
  const [ingUnit, setIngUnit] = useState('');

  // 2. Bases
  const [baseId, setBaseId] = useState('');
  const [baseQty, setBaseQty] = useState('');
  const [baseUnit, setBaseUnit] = useState('');

  // 3. Embalagens
  const [packId, setPackId] = useState('');
  const [packQty, setPackQty] = useState('');

  const foodIngredients = ingredients.filter((i: any) => i.category !== 'product' && i.category !== 'packaging');
  const packagingIngredients = ingredients.filter((i: any) => i.category === 'packaging');

  // Helpers para adicionar zerando os inputs locais
  const handleAddIngredient = () => {
    onAddItem(ingId, ingQty, ingUnit);
    setIngId('');
    setIngQty('');
    setIngUnit('');
  };

  const handleAddBase = () => {
    onAddItem(baseId, baseQty, baseUnit);
    setBaseId('');
    setBaseQty('');
    setBaseUnit('');
  };

  const handleAddPackaging = () => {
    onAddItem(packId, packQty, 'un');
    setPackId('');
    setPackQty('');
  };

  const handleEditItem = (item: any) => {
    // 1. Identify type and populate state
    if (item.item_type === 'recipe') {
      // Base
      setBaseId(`recipe:${item.ingredient_id}`);
      setBaseQty(item.quantity_input?.toString() || item.quantity_used.toString());
      setBaseUnit(item.unit_input || 'un');
    } else {
      // Ingredient or Packaging
      const ing = ingredients.find((i: any) => i.id === item.ingredient_id);
      if (ing?.category === 'packaging') {
        setPackId(`ingredient:${item.ingredient_id}`);
        setPackQty(item.quantity_input?.toString() || item.quantity_used.toString());
      } else {
        setIngId(`ingredient:${item.ingredient_id}`);
        setIngQty(item.quantity_input?.toString() || item.quantity_used.toString());
        setIngUnit(item.unit_input || ing?.base_unit || 'g');
      }
    }
    // 2. Remove from list (effectively "moving" to edit)
    onRemoveItem(item.id);
  };

  const selectedIngDetails = ingId ? ingredients.find((i: any) => i.id === ingId.split(':')[1]) : null;

  return (
    <div className="space-y-6">
      {/* 1. Ingredientes Comuns */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-amber-600">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><ShoppingCart size={20} className="text-amber-600" /> Ingredientes</h3>
        <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-slate-50 p-4 rounded-lg">
          <div className="flex-1 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase">Ingrediente</label>
            <select
              value={ingId}
              onChange={(e) => setIngId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
            >
              <option value="">Selecione...</option>
              {foodIngredients.map((i: any) => (
                <option key={i.id} value={`ingredient:${i.id}`}>{i.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-24">
            <label className="text-xs font-bold text-slate-500 uppercase">Qtd</label>
            <input
              type="number"
              value={ingQty}
              onChange={(e) => setIngQty(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg outline-none"
              placeholder="0"
            />
          </div>
          <div className="w-full md:w-24">
            <label className="text-xs font-bold text-slate-500 uppercase">Unidade</label>
            <select
              value={ingUnit}
              onChange={(e) => setIngUnit(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
              disabled={!ingId}
            >
              <option value="">-</option>
              {selectedIngDetails ? (
                <>
                  <option value={selectedIngDetails.base_unit}>{selectedIngDetails.base_unit}</option>
                  {selectedIngDetails.conversions?.map((c: any, idx: number) => (
                    <option key={idx} value={c.name}>{c.name}</option>
                  ))}
                </>
              ) : null}
            </select>
          </div>
          <button
            onClick={handleAddIngredient}
            disabled={!ingId || !ingQty}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition font-bold"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {recipeItems.filter((i: any) => (i.item_type === 'ingredient' || !i.item_type) && ingredients.find((ing: any) => ing.id === i.ingredient_id)?.category !== 'packaging').map((item: any) => {
            const ing = ingredients.find((i: any) => i.id === item.ingredient_id);
            const cost = (ing?.unit_cost_base || 0) * item.quantity_used;
            return (
              <div key={item.id} className="flex justify-between items-center p-3 border-b hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-slate-800">{ing?.name || item.ingredient_name}</div>
                  <span className="text-xs text-slate-500">{item.quantity_input} {item.unit_input}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-600">{ing ? `R$ ${cost.toFixed(2)}` : '--'}</span>
                  <button onClick={() => handleEditItem(item)} className="text-slate-400 hover:text-amber-600 mr-2"><Edit size={16} /></button>
                  <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Bases Produzidas */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-blue-600">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
          <Layers size={20} className="text-blue-600" /> Insumos Produzidos (Bases)
        </h3>

        <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-blue-50 p-4 rounded-lg">
          <div className="flex-1 w-full">
            <select
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
            >
              <option value="">Selecione uma base...</option>
              {baseRecipes.map((r: any) => (
                <option key={r.id} value={`recipe:${r.id}`}>
                  {r.name} (Custo: R$ {(r.unit_cost || 0).toFixed(2)} / {r.yield_unit})
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-32">
            <label className="text-xs font-bold text-slate-500 uppercase">Qtd</label>
            <input
              type="number"
              value={baseQty}
              onChange={(e) => setBaseQty(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg outline-none"
              placeholder="Qtd"
            />
          </div>
          <div className="w-full md:w-24">
            <label className="text-xs font-bold text-slate-500 uppercase">Unidade</label>
            <select
              value={baseUnit}
              onChange={(e) => setBaseUnit(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
            >
              <option value="un">un</option>
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
            </select>
          </div>
          <button
            onClick={handleAddBase}
            disabled={!baseId || !baseQty}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {recipeItems.filter((i: any) => i.item_type === 'recipe').map((item: any) => {
            const base = baseRecipes.find((r: any) => r.id === item.ingredient_id);
            let cost = 0;
            if (base) {
              cost = (base.unit_cost || 0) * item.quantity_used;
            }

            return (
              <div key={item.id} className="flex justify-between items-center p-3 border-b hover:bg-blue-50/30 transition">
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-2"><Layers size={14} /> {item.ingredient_name}</div>
                  <span className="text-xs text-slate-500">{item.quantity_input} {item.unit_input}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-600">{base ? `R$ ${cost.toFixed(2)}` : '--'}</span>
                  <button onClick={() => handleEditItem(item)} className="text-slate-400 hover:text-blue-600 mr-2"><Edit size={16} /></button>
                  <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Embalagens */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-purple-600">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
          <Package size={20} className="text-purple-600" /> Embalagens
        </h3>

        <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-purple-50 p-4 rounded-lg">
          <div className="flex-1 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase">Embalagem</label>
            <select
              value={packId}
              onChange={(e) => setPackId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
            >
              <option value="">Selecione...</option>
              {packagingIngredients.map((i: any) => (
                <option key={i.id} value={`ingredient:${i.id}`}>{i.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-32">
            <label className="text-xs font-bold text-slate-500 uppercase">Qtd</label>
            <input
              type="number"
              value={packQty}
              onChange={(e) => setPackQty(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg outline-none"
              placeholder="Qtd"
            />
          </div>
          <button
            onClick={handleAddPackaging}
            disabled={!packId || !packQty}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-bold"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {recipeItems.filter((i: any) => i.item_type === 'ingredient' && ingredients.find((ing: any) => ing.id === i.ingredient_id)?.category === 'packaging').map((item: any) => {
            const ing = ingredients.find((i: any) => i.id === item.ingredient_id);
            const cost = (ing?.unit_cost_base || 0) * item.quantity_used;

            return (
              <div key={item.id} className="flex justify-between items-center p-3 border-b hover:bg-purple-50/30 transition">
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-2"><Package size={14} /> {ing?.name || item.ingredient_name}</div>
                  <span className="text-xs text-slate-500">{item.quantity_input} {item.unit_input}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-600">{ing ? `R$ ${cost.toFixed(2)}` : '--'}</span>
                  <button onClick={() => handleEditItem(item)} className="text-slate-400 hover:text-purple-600 mr-2"><Edit size={16} /></button>
                  <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

export const RecipeForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    // Data
    categories, settings, isLoading, baseRecipes, ingredients,
    // Form State
    name, setName, barcode, setBarcode, category, setCategory,
    isBase, setIsBase,
    yieldUnits, setYieldUnits, yieldQuantity, setYieldQuantity, yieldUnit, setYieldUnit,
    prepTime, setPrepTime, prepMethod, setPrepMethod,
    recipeItems,
    // Actions
    addIngredientItem, removeItem, save, isSaving, financials, discardDraft, draftLoaded
  } = useRecipeForm(id);

  const [activeTab, setActiveTab] = useState<'info' | 'ingredients' | 'financials'>('info');
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Calcula custo de embalagens para passar pro Financials
  const packagingCost = recipeItems
    .filter((item: any) => {
      if (item.item_type !== 'ingredient') return false;
      const ing = ingredients.find((i: any) => i.id === item.ingredient_id);
      return ing?.category === 'packaging';
    })
    .reduce((acc: number, item: any) => {
      const ing = ingredients.find((i: any) => i.id === item.ingredient_id);
      return acc + ((ing?.unit_cost_base || 0) * item.quantity_used);
    }, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50/50">
        <Loader2 className="animate-spin text-amber-500" size={48} />
      </div>
    );
  }

  return (
    <div className="pb-24 animate-fade-in relative max-w-7xl mx-auto">

      {/* Header Fixo/Sticky */}
      <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-sm pt-4 pb-4 border-b border-slate-200 mb-6 flex justify-between items-center px-4 md:px-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              {id ? 'Editar Receita' : 'Nova Receita'}
            </h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              {id ? `Editando: ${name}` : 'Criando nova ficha técnica'}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {draftLoaded && (
            <button
              onClick={discardDraft}
              className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-bold flex items-center gap-2"
              title="Descartar alterações locais e recarregar dados originais"
            >
              <Trash2 size={16} /> Descartar Rascunho
            </button>
          )}
          <button
            onClick={() => save()}
            disabled={isSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <SaveAll size={20} />}
            <span className="hidden md:inline">Salvar Ficha</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-0">

        {/* Coluna Esquerda: Conteúdo Principal (Abas) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Navegação de Abas */}
          <div className="bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm flex gap-1 sticky top-24 z-30">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex justify-center items-center gap-2 ${activeTab === 'info' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              Informações
            </button>
            <button
              onClick={() => setActiveTab('ingredients')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex justify-center items-center gap-2 ${activeTab === 'ingredients' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              Ingredientes
            </button>

          </div>

          {/* Conteúdo das Abas */}
          <div className="min-h-[500px] space-y-6">
            {activeTab === 'info' && (
              <>
                <RecipeGeneralSettings
                  name={name} setName={setName}
                  category={category} setCategory={setCategory}
                  barcode={barcode} setBarcode={setBarcode}
                  categories={categories}
                  onOpenCategoryModal={() => setIsCategoryManagerOpen(true)}
                  onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                  isBase={isBase} setIsBase={setIsBase}
                  prepTime={prepTime} setPrepTime={setPrepTime}
                  yieldUnits={yieldUnits} setYieldUnits={setYieldUnits}
                  yieldQuantity={yieldQuantity} setYieldQuantity={setYieldQuantity}
                  yieldUnit={yieldUnit} setYieldUnit={setYieldUnit}
                  isEditing={!!id}
                  onGenerateCode={() => setBarcode(Date.now().toString().slice(-8))}
                />
                <RecipePreparation
                  method={prepMethod}
                  setMethod={setPrepMethod}
                />
              </>
            )}

            {activeTab === 'ingredients' && (
              <RecipeIngredientsList
                ingredients={ingredients}
                baseRecipes={baseRecipes}
                recipeItems={recipeItems}
                onAddItem={addIngredientItem}
                onRemoveItem={removeItem}
              />
            )}


          </div>
        </div>

        {/* Coluna Direita: Resumo Financeiro Fixo */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <RecipeFinancials
              financials={financials}
              settings={settings}
              packagingCost={packagingCost}
              isEditing={!!id} // Enable history button in sidebar if editing
              onShowHistory={() => setIsHistoryOpen(true)}
            />
          </div>
        </div>

      </div>

      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
      />

      {isHistoryOpen && id && (
        <PriceHistoryViewer
          recipeId={id}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
    </div>
  );
};