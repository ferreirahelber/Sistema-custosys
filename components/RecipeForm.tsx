import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, SaveAll, Trash2
} from 'lucide-react';
import { useRecipeForm } from '../hooks/useRecipeForm';
import { PriceHistoryViewer } from './PriceHistoryViewer';
import { CategoryManager } from './CategoryManager';
import { RecipeGeneralSettings } from './recipes/RecipeGeneralSettings';
import { RecipePreparation } from './recipes/RecipePreparation';
import { RecipeFinancials } from './recipes/RecipeFinancials';
import { RecipeIngredientsList } from './recipes/RecipeIngredientsList';

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
      <div className="sticky top-0 z-50 bg-slate-50 pt-4 pb-4 border-b border-slate-200 mb-6 flex justify-between items-center px-4 md:px-0">
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

          {/* Conteúdo Sequencial (Sem Abas) */}
          <div className="space-y-6">
            <div className="space-y-6">
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
            </div>

            <div className="border-t border-slate-200 mt-8 pt-8">
              <RecipeIngredientsList
                ingredients={ingredients}
                baseRecipes={baseRecipes}
                recipeItems={recipeItems}
                onAddItem={addIngredientItem}
                onRemoveItem={removeItem}
              />
            </div>
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