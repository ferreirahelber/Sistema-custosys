import { supabase } from './supabase';
import { Recipe, RecipeItemResponse } from '../types';

export const RecipeService = {
  // Busca todas as receitas com seus itens
  async getAll(): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select(
        `
        *,
        items:recipe_items (
          *,
          ingredient:ingredients (*)
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Mapeia os dados do banco para o formato da tela
    return (
      data?.map((r) => ({
        ...r,
        barcode: r.barcode, // <--- GARANTE QUE O CÓDIGO SEJA LIDO AQUI
        
        items: r.items.map((i: RecipeItemResponse) => ({
          ...i,
          quantity_used: i.quantity, // Mapeia "quantity" do banco para "quantity_used" da tela
          
          // Leitura Inteligente
          quantity_input: i.quantity_input || i.quantity, 
          unit_input: i.unit_input || i.ingredient?.base_unit || 'un',
          
          // Nome Histórico
          ingredient_name: i.ingredient_name || i.ingredient?.name 
        })),
      })) || []
    );
  },

  // Salva (Cria ou Atualiza Completo)
  async save(recipe: Recipe) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Usuário não autenticado');

    // 1. Salva/Atualiza a Receita (Cabeçalho)
    const recipePayload = {
      id: recipe.id || undefined,
      user_id: user.id,
      name: recipe.name,
      barcode: recipe.barcode, // <--- CAMPO CRÍTICO: SALVA O CÓDIGO NO BANCO
      yield_units: recipe.yield_units,
      preparation_time_minutes: recipe.preparation_time_minutes,
      preparation_method: recipe.preparation_method,
      total_cost_material: recipe.total_cost_material,
      total_cost_labor: recipe.total_cost_labor,
      total_cost_overhead: recipe.total_cost_overhead,
      total_cost_final: recipe.total_cost_final,
      unit_cost: recipe.unit_cost,
      selling_price: recipe.selling_price,
    };

    const { data: savedRecipe, error: recipeError } = await supabase
      .from('recipes')
      .upsert(recipePayload)
      .select()
      .single();

    if (recipeError) throw recipeError;

    // 2. Atualiza os Itens
    if (recipe.items && recipe.items.length > 0) {
      // Remove itens antigos para regravar
      await supabase.from('recipe_items').delete().eq('recipe_id', savedRecipe.id);

      const itemsToInsert = recipe.items.map((item) => ({
        recipe_id: savedRecipe.id,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity_used,
        quantity_input: item.quantity_input,
        unit_input: item.unit_input,
        ingredient_name: item.ingredient_name 
      }));

      const { error: itemsError } = await supabase.from('recipe_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }

    return savedRecipe;
  },

  // Atualiza campo específico (Preço de Venda)
  async update(id: string, updates: Partial<Recipe>) {
    const { error } = await supabase.from('recipes').update(updates).eq('id', id);
    if (error) throw error;
  },

  // Deleta receita
  async delete(id: string) {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) throw error;
  },
};