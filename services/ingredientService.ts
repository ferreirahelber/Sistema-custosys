import { supabase } from './supabase';
import { Ingredient, Recipe } from '../types';
import { SettingsService } from './settingsService';
import { RecipeService } from './recipeService'; // IMPORTANTE: Adicionado para buscar as bases
import { PriceHistoryService } from './priceHistoryService';
import { calculateRecipeFinancials } from '../utils/calculations';

export const IngredientService = {
  // Busca todos os ingredientes
  async getAll(): Promise<Ingredient[]> {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Cria um novo item
  async create(ingredient: Omit<Ingredient, 'id'>) {
    const { data, error } = await supabase
      .from('ingredients')
      .insert([{
        name: ingredient.name,
        package_price: ingredient.package_price,
        package_amount: ingredient.package_amount,
        package_unit: ingredient.package_unit,
        unit_cost_base: ingredient.unit_cost_base,
        base_unit: ingredient.base_unit,
        current_stock: ingredient.current_stock,
        min_stock: ingredient.min_stock,
        conversions: ingredient.conversions,
        category: ingredient.category
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualiza um item + GATILHO DE CASCATA
  async update(id: string, ingredient: Partial<Ingredient>) {
    const { data, error } = await supabase
      .from('ingredients')
      .update({
        name: ingredient.name,
        package_price: ingredient.package_price,
        package_amount: ingredient.package_amount,
        package_unit: ingredient.package_unit,
        unit_cost_base: ingredient.unit_cost_base,
        base_unit: ingredient.base_unit,
        current_stock: ingredient.current_stock,
        min_stock: ingredient.min_stock,
        conversions: ingredient.conversions,
        category: ingredient.category
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (data) {
      console.log('🔄 Iniciando atualização em cascata para:', data.name);
      try {
        await cascadeUpdateRecipes(data.id, data.name);
      } catch (err) {
        console.error("❌ Erro CRÍTICO na atualização em cascata:", err);
      }
    }

    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) throw error;
  }
};

/**
 * FUNÇÃO DE AUTOMAÇÃO (Lógica de Cascata)
 */
async function cascadeUpdateRecipes(ingredientId: string, ingredientName: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: relations } = await supabase
    .from('recipe_items')
    .select('recipe_id')
    .eq('ingredient_id', ingredientId);

  if (!relations || relations.length === 0) return;

  const uniqueRecipeIds = [...new Set(relations.map((r) => r.recipe_id))];

  // BUSCA DE DADOS NECESSÁRIOS PARA O CÁLCULO (6 ARGUMENTOS)
  const [settings, allRecipes] = await Promise.all([
    SettingsService.get(),
    RecipeService.getAll() // Buscamos todas para filtrar as bases
  ]);

  const baseRecipes = allRecipes.filter(r => r.is_base);

  // Busca as receitas que precisam ser atualizadas
  // Ajustado o join (!) para evitar erro PGRST201
  const { data: recipesToUpdate } = await supabase
    .from('recipes')
    .select(`
      *,
      items:recipe_items!recipe_items_recipe_id_fkey (
        *,
        ingredient:ingredients (*)
      )
    `)
    .in('id', uniqueRecipeIds);

  if (!recipesToUpdate) return;

  for (const recipeData of recipesToUpdate) {
    try {
      const items = recipeData.items.map((i: any) => ({
        ...i,
        quantity_used: Number(i.quantity),
        quantity_input: Number(i.quantity_input || i.quantity),
        unit_input: i.unit_input || i.ingredient?.base_unit || 'un',
        ingredient_name: i.ingredient?.name,
        item_type: i.item_type || 'ingredient'
      }));

      // CORREÇÃO TS2554: Agora enviamos os 6 argumentos corretos
      const financials = calculateRecipeFinancials(
        items,
        [], // ingredientsList (o cálculo interno buscará pelos IDs se vazio)
        baseRecipes, // 3º argumento: Lista de bases
        Number(recipeData.preparation_time_minutes || 0), // 4º argumento
        Number(recipeData.yield_units || 1), // 5º argumento
        settings // 6º argumento: Configurações
      );

      const oldCost = Number(recipeData.unit_cost || 0);
      const newCost = Number(financials.unit_cost || 0);

      if (Math.abs(newCost - oldCost) > 0.01) {
        await PriceHistoryService.addEntry({
          recipe_id: recipeData.id,
          old_cost: oldCost,
          new_cost: newCost,
          old_price: Number(recipeData.selling_price || 0),
          new_price: Number(recipeData.selling_price || 0),
          change_reason: `Alteração no insumo: ${ingredientName}`
        });

        await supabase
          .from('recipes')
          .update({
            total_cost_material: financials.total_cost_material,
            total_cost_labor: financials.total_cost_labor,
            total_cost_overhead: financials.total_cost_overhead,
            total_cost_final: financials.total_cost_final,
            unit_cost: financials.unit_cost,
          })
          .eq('id', recipeData.id);
      }
    } catch (innerError) {
      console.error(`❌ Erro ao processar receita ${recipeData.id}:`, innerError);
    }
  }
}