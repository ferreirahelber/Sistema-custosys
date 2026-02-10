import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Recipe, RecipeItem, MeasureConversion } from '../types';
import { useRecipeMutations, useRecipe } from './useRecipes';
import { useIngredients } from './useIngredients';
import { useRecipes } from './useRecipes';
import { useSettings, useCategories } from './useSystem';
import { calculateRecipeFinancials } from '../utils/calculations';

export const useRecipeForm = (recipeId?: string) => {
    const navigate = useNavigate();
    const { data: recipeData, isLoading: isLoadingRecipe } = useRecipe(recipeId);
    const { ingredients, loading: isLoadingIngs } = useIngredients();
    const { data: allRecipes = [], isLoading: isLoadingRecipes } = useRecipes();
    const { data: settings, isLoading: isLoadingSettings } = useSettings();
    const { data: categories = [], isLoading: isLoadingCats } = useCategories();

    const { createRecipe, updateRecipe } = useRecipeMutations();

    // Form State
    const [name, setName] = useState('');
    const [barcode, setBarcode] = useState('');
    const [category, setCategory] = useState('');
    const [isBase, setIsBase] = useState(false);
    const [yieldUnits, setYieldUnits] = useState(1);
    const [yieldQuantity, setYieldQuantity] = useState(1);
    const [yieldUnit, setYieldUnit] = useState<'g' | 'ml' | 'un'>('un');
    const [prepTime, setPrepTime] = useState(60);
    const [prepMethod, setPrepMethod] = useState('');
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
    const [currentSellingPrice, setCurrentSellingPrice] = useState(0);

    // Sync Input Logic
    const [selectedIngId, setSelectedIngId] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [itemQuantity, setItemQuantity] = useState('');
    const [baseQuantity, setBaseQuantity] = useState('');
    const [draftLoaded, setDraftLoaded] = useState(false);

    const baseRecipes = allRecipes.filter(r => r.is_base && r.id !== recipeId);
    const isLoading = isLoadingRecipe || isLoadingIngs || isLoadingRecipes || isLoadingSettings || isLoadingCats;

    const draftKey = recipeId ? `recipe_draft_${recipeId}` : 'recipe_draft_new';

    // Initialize Form (Load from DB + Restore Draft if exists)
    useEffect(() => {
        if (recipeData) {
            // 1. Load from DB
            setName(recipeData.name);
            setBarcode(recipeData.barcode || '');
            setCategory(recipeData.category || 'Geral');
            setIsBase(recipeData.is_base || false);
            setYieldUnits(recipeData.yield_units || 1);
            setYieldQuantity(recipeData.yield_quantity || 1);
            setYieldUnit(recipeData.yield_unit || 'un');
            setPrepTime(recipeData.preparation_time_minutes || 0);
            setPrepMethod(recipeData.preparation_method || '');
            setRecipeItems(recipeData.items || []);
            setCurrentSellingPrice(recipeData.selling_price || 0);

            // 2. Override with Draft if exists
            const draft = localStorage.getItem(draftKey);
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    // Override fields if they exist in draft
                    if (parsed.name !== undefined) setName(parsed.name);
                    if (parsed.barcode !== undefined) setBarcode(parsed.barcode);
                    if (parsed.category !== undefined) setCategory(parsed.category);
                    if (parsed.isBase !== undefined) setIsBase(parsed.isBase);
                    if (parsed.yieldUnits !== undefined) setYieldUnits(parsed.yieldUnits);
                    if (parsed.yieldQuantity !== undefined) setYieldQuantity(parsed.yieldQuantity);
                    if (parsed.yieldUnit !== undefined) setYieldUnit(parsed.yieldUnit);
                    if (parsed.prepTime !== undefined) setPrepTime(parsed.prepTime);
                    if (parsed.prepMethod !== undefined) setPrepMethod(parsed.prepMethod);
                    if (parsed.recipeItems !== undefined) setRecipeItems(parsed.recipeItems);
                    if (parsed.currentSellingPrice !== undefined) setCurrentSellingPrice(parsed.currentSellingPrice);

                    setDraftLoaded(true);
                    toast.info("Rascunho não salvo restaurado!", {
                        action: {
                            label: 'Descartar',
                            onClick: () => discardDraft()
                        },
                        duration: 5000
                    });
                } catch (e) {
                    console.error("Erro ao ler rascunho", e);
                }
            }
        } else if (!recipeId && !isLoadingRecipe) {
            // New Recipe Mode - Check for draft
            const draft = localStorage.getItem(draftKey);
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    if (parsed.name !== undefined) setName(parsed.name);
                    if (parsed.barcode !== undefined) setBarcode(parsed.barcode);
                    if (parsed.category !== undefined) setCategory(parsed.category);
                    if (parsed.isBase !== undefined) setIsBase(parsed.isBase);
                    if (parsed.yieldUnits !== undefined) setYieldUnits(parsed.yieldUnits);
                    if (parsed.yieldQuantity !== undefined) setYieldQuantity(parsed.yieldQuantity);
                    if (parsed.yieldUnit !== undefined) setYieldUnit(parsed.yieldUnit);
                    if (parsed.prepTime !== undefined) setPrepTime(parsed.prepTime);
                    if (parsed.prepMethod !== undefined) setPrepMethod(parsed.prepMethod);
                    if (parsed.recipeItems !== undefined) setRecipeItems(parsed.recipeItems);
                    if (parsed.currentSellingPrice !== undefined) setCurrentSellingPrice(parsed.currentSellingPrice);

                    setDraftLoaded(true);
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
        // Don't save if loading or empty states (unless it's a new recipe that user started typing)
        if (isLoading) return;

        const draft = {
            name, barcode, category, isBase,
            yieldUnits, yieldQuantity, yieldUnit,
            prepTime, prepMethod, recipeItems,
            currentSellingPrice,
            updatedAt: Date.now()
        };

        // Only save if there's some data
        if (name || recipeItems.length > 0 || prepMethod) {
            localStorage.setItem(draftKey, JSON.stringify(draft));
        }
    }, [name, barcode, category, isBase, yieldUnits, yieldQuantity, yieldUnit, prepTime, prepMethod, recipeItems, currentSellingPrice, draftKey, isLoading]);

    const discardDraft = () => {
        localStorage.removeItem(draftKey);
        window.location.reload();
    };

    const addIngredientItem = (overrideId?: string, overrideQty?: string, overrideUnit?: string) => {
        const idToUse = overrideId || selectedIngId;
        const qtyToUse = overrideQty || (idToUse.startsWith('recipe:') ? baseQuantity : itemQuantity);
        const unitToUse = overrideUnit || selectedUnit;

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

        setRecipeItems([...recipeItems, newItem]);

        // Reset states if they were used (optional, keeping for backward compatibility if needed)
        if (!overrideId) {
            setSelectedIngId('');
            setItemQuantity('');
            setBaseQuantity('');
            setSelectedUnit('');
        }
    };

    const removeItem = (id: string) => {
        setRecipeItems(recipeItems.filter(i => i.id !== id));
    };

    const financials = calculateRecipeFinancials(
        recipeItems,
        ingredients,
        baseRecipes,
        prepTime,
        yieldUnits,
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
        if (!name.trim()) return;

        const payload: Recipe = {
            id: recipeId || '',
            name,
            barcode,
            category,
            is_base: isBase,
            yield_units: yieldUnits,
            yield_quantity: yieldQuantity,
            yield_unit: yieldUnit,
            preparation_time_minutes: prepTime,
            preparation_method: prepMethod,
            items: recipeItems,
            total_cost_material: financials.total_cost_material,
            total_cost_labor: financials.total_cost_labor,
            total_cost_overhead: financials.total_cost_overhead,
            total_cost_final: financials.total_cost_final,
            unit_cost: financials.unit_cost,
            selling_price: currentSellingPrice
        };

        if (recipeId) {
            await updateRecipe.mutateAsync(payload);
            localStorage.removeItem(draftKey); // Clear draft on success
        } else {
            await createRecipe.mutateAsync(payload);
            localStorage.removeItem(draftKey); // Clear draft on success
        }

        navigate(isBase ? '/production-bases' : '/recipes');
    };

    return {
        // Data
        ingredients,
        baseRecipes,
        categories,
        settings,
        isLoading,

        // Form State
        name, setName,
        barcode, setBarcode,
        category, setCategory,
        isBase, setIsBase,
        yieldUnits, setYieldUnits,
        yieldQuantity, setYieldQuantity,
        yieldUnit, setYieldUnit,
        prepTime, setPrepTime,
        prepMethod, setPrepMethod,
        recipeItems,
        currentSellingPrice, setCurrentSellingPrice,

        // Input Logic State
        selectedIngId, setSelectedIngId,
        selectedUnit, setSelectedUnit,
        itemQuantity, setItemQuantity,
        baseQuantity, setBaseQuantity,

        // Actions
        addIngredientItem,
        removeItem,
        save,
        isSaving: createRecipe.isPending || updateRecipe.isPending,
        financials,
        discardDraft,
        draftLoaded
    };
};
