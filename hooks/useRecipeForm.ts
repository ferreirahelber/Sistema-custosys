import { useEffect, useReducer, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Recipe, RecipeItem, MeasureConversion } from '../types';
import { useRecipeMutations, useRecipe } from './useRecipes';
import { useIngredients } from './useIngredients';
import { useRecipes } from './useRecipes';
import { useSettings, useCategories } from './useSystem';
import { calculateRecipeFinancials } from '../utils/calculations';
import {
    recipeFormReducer,
    initialRecipeFormState,
    RecipeFormState
} from '../reducers/recipeFormReducer';

export const useRecipeForm = (recipeId?: string) => {
    const navigate = useNavigate();
    const { data: recipeData, isLoading: isLoadingRecipe } = useRecipe(recipeId);
    const { ingredients, loading: isLoadingIngs } = useIngredients();
    const { data: allRecipes = [], isLoading: isLoadingRecipes } = useRecipes();
    const { data: settings, isLoading: isLoadingSettings } = useSettings();
    const { data: categories = [], isLoading: isLoadingCats } = useCategories();

    const { createRecipe, updateRecipe } = useRecipeMutations();

    // Reducer State
    const [state, dispatch] = useReducer(recipeFormReducer, initialRecipeFormState);

    const baseRecipes = allRecipes.filter(r => r.is_base && r.id !== recipeId);
    const isLoading = isLoadingRecipe || isLoadingIngs || isLoadingRecipes || isLoadingSettings || isLoadingCats;

    const draftKey = recipeId ? `recipe_draft_${recipeId}` : 'recipe_draft_new';

    // Initialize Form (Load from DB + Restore Draft if exists)
    useEffect(() => {
        if (recipeData) {
            const dbData: Partial<RecipeFormState> = {
                name: recipeData.name,
                barcode: recipeData.barcode || '',
                category: recipeData.category || 'Geral',
                isBase: recipeData.is_base || false,
                yieldUnits: recipeData.yield_units || 1,
                yieldQuantity: recipeData.yield_quantity || 1,
                yieldUnit: recipeData.yield_unit || 'un',
                prepTime: recipeData.preparation_time_minutes || 0,
                prepMethod: recipeData.preparation_method || '',
                recipeItems: recipeData.items || [],
                currentSellingPrice: recipeData.selling_price || 0
            };

            // 2. Override with Draft if exists
            const draft = localStorage.getItem(draftKey);
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    const mergedData = { ...dbData, ...parsed };

                    dispatch({ type: 'LOAD_DATA', data: mergedData, isDraft: true });

                    toast.info("Rascunho não salvo restaurado!", {
                        action: {
                            label: 'Descartar',
                            onClick: () => discardDraft()
                        },
                        duration: 5000
                    });
                } catch (e) {
                    console.error("Erro ao ler rascunho", e);
                    dispatch({ type: 'LOAD_DATA', data: dbData });
                }
            } else {
                dispatch({ type: 'LOAD_DATA', data: dbData });
            }
        } else if (!recipeId && !isLoadingRecipe) {
            // New Recipe Mode - Check for draft
            const draft = localStorage.getItem(draftKey);
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    dispatch({ type: 'LOAD_DATA', data: parsed, isDraft: true });

                    toast.info("Rascunho de nova receita restaurado!", {
                        action: {
                            label: 'Descartar',
                            onClick: () => discardDraft()
                        },
                        duration: 5000
                    });
                } catch (e) {
                    console.error("Erro ao ler rascunho de nova receita", e);
                }
            }
        }
    }, [recipeData, recipeId, isLoadingRecipe]);

    // Save Draft on Change
    useEffect(() => {
        if (isLoading) return;

        const draft = {
            name: state.name,
            barcode: state.barcode,
            category: state.category,
            isBase: state.isBase,
            yieldUnits: state.yieldUnits,
            yieldQuantity: state.yieldQuantity,
            yieldUnit: state.yieldUnit,
            prepTime: state.prepTime,
            prepMethod: state.prepMethod,
            recipeItems: state.recipeItems,
            currentSellingPrice: state.currentSellingPrice,
            updatedAt: Date.now()
        };

        if (state.name || state.recipeItems.length > 0 || state.prepMethod) {
            localStorage.setItem(draftKey, JSON.stringify(draft));
        }
    }, [state, draftKey, isLoading]);

    const discardDraft = useCallback(() => {
        localStorage.removeItem(draftKey);
        window.location.reload();
    }, [draftKey]);

    const addIngredientItem = (overrideId?: string, overrideQty?: string, overrideUnit?: string) => {
        const idToUse = overrideId || state.selectedIngId;
        const qtyToUse = overrideQty || (idToUse.startsWith('recipe:') ? state.baseQuantity : state.itemQuantity);
        const unitToUse = overrideUnit || state.selectedUnit;

        const [type, realId] = idToUse.split(':');

        if (!realId || !qtyToUse) {
            toast.warning("Selecione um item e informe a quantidade.");
            return;
        }

        const qtyInput = parseFloat(qtyToUse);
        if (isNaN(qtyInput) || qtyInput <= 0) return;

        let newItem: RecipeItem;

        if (type === 'ingredient') {
            const ing = ingredients.find(i => i.id === realId);
            if (!ing) return;

            let qtyBase = qtyInput;
            if (ing.conversions && unitToUse !== ing.base_unit) {
                const conv = ing.conversions.find((c: MeasureConversion) => c.name === unitToUse);
                if (conv) qtyBase = qtyInput * conv.value;
            }

            newItem = {
                id: Date.now().toString(),
                ingredient_id: realId,
                item_type: 'ingredient',
                quantity_used: qtyBase,
                quantity_input: qtyInput,
                unit_input: unitToUse || ing.base_unit,
                ingredient_name: ing.name
            };
        } else {
            const base = baseRecipes.find(r => r.id === realId);
            if (!base) return;

            newItem = {
                id: Date.now().toString(),
                ingredient_id: realId,
                item_type: 'recipe',
                quantity_used: qtyInput,
                quantity_input: qtyInput,
                unit_input: unitToUse || 'un',
                ingredient_name: base.name
            };
        }

        dispatch({
            type: 'ADD_ITEM',
            item: newItem,
            clearInputs: !overrideId // Only clear inputs if adding from the main form inputs
        });
    };

    const removeItem = (id: string) => {
        dispatch({ type: 'REMOVE_ITEM', id });
    };

    const financials = calculateRecipeFinancials(
        state.recipeItems,
        ingredients,
        baseRecipes,
        state.prepTime,
        state.yieldUnits,
        settings || {
            employees: [],
            labor_monthly_cost: 0,
            work_hours_monthly: 160,
            fixed_overhead_rate: 0,
            cost_per_minute: 0,
            estimated_monthly_revenue: 0,
            card_debit_rate: 1.99,
            card_credit_rate: 4.99
        }
    );

    const save = async () => {
        if (!state.name.trim()) return;

        const payload: Recipe = {
            id: recipeId || '',
            name: state.name,
            barcode: state.barcode,
            category: state.category,
            is_base: state.isBase,
            yield_units: state.yieldUnits,
            yield_quantity: state.yieldQuantity,
            yield_unit: state.yieldUnit,
            preparation_time_minutes: state.prepTime,
            preparation_method: state.prepMethod,
            items: state.recipeItems,
            total_cost_material: financials.total_cost_material,
            total_cost_labor: financials.total_cost_labor,
            total_cost_overhead: financials.total_cost_overhead,
            total_cost_final: financials.total_cost_final,
            unit_cost: financials.unit_cost,
            selling_price: state.currentSellingPrice
        };

        if (recipeId) {
            await updateRecipe.mutateAsync(payload);
            localStorage.removeItem(draftKey);
        } else {
            await createRecipe.mutateAsync(payload);
            localStorage.removeItem(draftKey);
        }

        navigate(state.isBase ? '/production-bases' : '/recipes');
    };

    // Generic Setter Dispatchers
    const setField = <K extends keyof RecipeFormState>(field: K) => (value: RecipeFormState[K]) => dispatch({ type: 'SET_FIELD', field, value });

    return {
        // Data
        ingredients,
        baseRecipes,
        categories,
        settings,
        isLoading,

        // Form State (Mapped to State)
        name: state.name, setName: setField('name'),
        barcode: state.barcode, setBarcode: setField('barcode'),
        category: state.category, setCategory: setField('category'),
        isBase: state.isBase, setIsBase: setField('isBase'),
        yieldUnits: state.yieldUnits, setYieldUnits: setField('yieldUnits'),
        yieldQuantity: state.yieldQuantity, setYieldQuantity: setField('yieldQuantity'),
        yieldUnit: state.yieldUnit, setYieldUnit: setField('yieldUnit'),
        prepTime: state.prepTime, setPrepTime: setField('prepTime'),
        prepMethod: state.prepMethod, setPrepMethod: setField('prepMethod'),
        recipeItems: state.recipeItems,
        currentSellingPrice: state.currentSellingPrice, setCurrentSellingPrice: setField('currentSellingPrice'),

        // Input Logic State
        selectedIngId: state.selectedIngId, setSelectedIngId: setField('selectedIngId'),
        selectedUnit: state.selectedUnit, setSelectedUnit: setField('selectedUnit'),
        itemQuantity: state.itemQuantity, setItemQuantity: setField('itemQuantity'),
        baseQuantity: state.baseQuantity, setBaseQuantity: setField('baseQuantity'),

        // Actions
        addIngredientItem,
        removeItem,
        save,
        isSaving: createRecipe.isPending || updateRecipe.isPending,
        financials,
        discardDraft,
        draftLoaded: state.draftLoaded
    };
};
