import { supabase } from './supabase';
import { Ingredient } from '../types';
import { SettingsService } from './settingsService';
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
    // 1. Atualiza o Ingrediente
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

    // 2. Dispara a atualização automática
    if (data) {
      console.log('🔄 Iniciando atualização em cascata para:', data.name);
      // Usamos await aqui para garantir que erros sejam capturados no console
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
  // A. Verifica sessão do usuário (Necessário para RLS)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("⚠️ Usuário não autenticado. Abortando cascata.");
    return;
  }

  // B. Acha quais receitas usam esse ingrediente
  const { data: relations } = await supabase
    .from('recipe_items')
    .select('recipe_id')
    .eq('ingredient_id', ingredientId);

  if (!relations || relations.length === 0) {
    console.log("ℹ️ Nenhuma receita usa este ingrediente.");
    return;
  }

  const uniqueRecipeIds = [...new Set(relations.map((r) => r.recipe_id))];
  console.log(`📊 Encontradas ${uniqueRecipeIds.length} receitas para atualizar.`);

  // C. Carrega configurações globais
  const settings = await SettingsService.get();

  // D. Busca as receitas completas
  const { data: recipesToUpdate } = await supabase
    .from('recipes')
    .select(`
      *,
      items:recipe_items (
        *,
        ingredient:ingredients (*)
      )
    `)
    .in('id', uniqueRecipeIds);

  if (!recipesToUpdate) return;

  // E. Recalcula cada receita
  for (const recipeData of recipesToUpdate) {
    try {
      // MAPEAMENTO ROBUSTO: Garante que os números sejam números e não texto
      const items = recipeData.items
        .filter((i: any) => i.ingredient !== null) // Proteção contra ingredientes deletados
        .map((i: any) => ({
          ...i,
          // Mapeia e força conversão para número para evitar erros de cálculo
          quantity_used: Number(i.quantity), 
          quantity_input: Number(i.quantity_input || i.quantity),
          unit_input: i.unit_input || i.ingredient?.base_unit || 'un',
          ingredient_name: i.ingredient?.name,
          ingredient: {
             ...i.ingredient,
             package_price: Number(i.ingredient.package_price),
             package_amount: Number(i.ingredient.package_amount),
             unit_cost_base: Number(i.ingredient.unit_cost_base)
          }
        }));

      const ingredientsList = items.map((i: any) => i.ingredient);

      // Calcula novos custos
      const financials = calculateRecipeFinancials(
        items,
        ingredientsList,
        Number(recipeData.preparation_time_minutes || 0),
        Number(recipeData.yield_units || 1),
        settings
      );

      const oldCost = Number(recipeData.unit_cost || 0);
      const newCost = Number(financials.unit_cost || 0);
      const diff = newCost - oldCost;

      console.log(`📝 Receita: ${recipeData.name} | Antigo: ${oldCost} | Novo: ${newCost} | Diff: ${diff}`);

      // Se mudou mais que 1 centavo
      if (Math.abs(diff) > 0.01) {
        
        // 1. Cria o histórico
        await PriceHistoryService.add({
          recipe_id: recipeData.id,
          old_cost: oldCost,
          new_cost: newCost,
          old_price: Number(recipeData.selling_price || 0),
          new_price: Number(recipeData.selling_price || 0),
          change_reason: `Alteração no insumo: ${ingredientName}`,
          // user_id é injetado pelo default do banco ou RLS
        });

        // 2. Atualiza a receita
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
          
        console.log(`✅ Receita ${recipeData.name} atualizada com sucesso.`);
      } else {
        console.log(`⏸️ Sem mudança de valor significativa para ${recipeData.name}.`);
      }
    } catch (innerError) {
      console.error(`❌ Erro ao processar receita ${recipeData.id}:`, innerError);
    }
  }
}