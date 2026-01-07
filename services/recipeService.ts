import { supabase } from './supabase';
import { Recipe } from '../types';

export const RecipeService = {
  // Busca todas as receitas com seus itens
  async getAll(): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        items:recipe_items (
          *,
          ingredient:ingredients (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Mapeia para garantir compatibilidade de tipos se necessário
    return data?.map(r => ({
        ...r,
        items: r.items.map((i: any) => ({
            ...i,
            quantity_used: i.quantity // Mapeia do banco (quantity) para o frontend (quantity_used)
        }))
    })) || [];
  },

  // Salva (Cria ou Atualiza Completo)
  async save(recipe: Recipe) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Usuário não autenticado");

    // 1. Salva/Atualiza a Receita (Cabeçalho)
    const recipePayload = {
        id: recipe.id || undefined, // undefined faz o Supabase criar novo ID
        user_id: user.id,
        name: recipe.name,
        yield_units: recipe.yield_units,
        preparation_time_minutes: recipe.preparation_time_minutes,
        preparation_method: recipe.preparation_method,
        total_cost_material: recipe.total_cost_material,
        total_cost_labor: recipe.total_cost_labor,
        total_cost_overhead: recipe.total_cost_overhead,
        total_cost_final: recipe.total_cost_final,
        unit_cost: recipe.unit_cost,
        selling_price: recipe.selling_price
    };

    const { data: savedRecipe, error: recipeError } = await supabase
      .from('recipes')
      .upsert(recipePayload)
      .select()
      .single();

    if (recipeError) throw recipeError;

    // 2. Atualiza os Itens (Remove todos antigos e insere novos - estratégia simples)
    if (recipe.items && recipe.items.length > 0) {
       // Deleta itens antigos dessa receita
       await supabase.from('recipe_items').delete().eq('recipe_id', savedRecipe.id);

       // Prepara novos itens
       const itemsToInsert = recipe.items.map(item => ({
         recipe_id: savedRecipe.id,
         ingredient_id: item.ingredient_id,
         quantity: item.quantity_used || item.quantity_input // Usa a quantidade calculada
       }));

       const { error: itemsError } = await supabase.from('recipe_items').insert(itemsToInsert);
       if (itemsError) throw itemsError;
    }

    return savedRecipe;
  },

  // --- NOVA FUNÇÃO (A QUE FALTAVA) ---
  async update(id: string, updates: Partial<Recipe>) {
    const { error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  // Deleta receita
  async delete(id: string) {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};