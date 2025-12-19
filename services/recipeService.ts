import { supabase } from './supabase';
import { Recipe } from '../types';

export const RecipeService = {
  // Buscar todas
  getAll: async (): Promise<Recipe[]> => {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        items:recipe_items (
          id,
          ingredient_id,
          quantity_used,
          quantity_input,
          unit_input
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map((r: any) => ({ ...r, items: r.items || [] })) || [];
  },

  // Salvar
  save: async (recipe: Recipe) => {
    // 1. Salva o cabeçalho da receita
    const { items, id, ...recipeData } = recipe;
    
    // Pega o ID do usuário atual para garantir
    const { data: { user } } = await supabase.auth.getUser();

    const { data: savedRecipe, error: recipeError } = await supabase
      .from('recipes')
      .upsert({
        id: id || undefined,
        ...recipeData,
        user_id: user?.id
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // 2. Salva os itens (Remove os antigos e insere os novos)
    if (items.length > 0) {
      await supabase.from('recipe_items').delete().eq('recipe_id', savedRecipe.id);

      const itemsToSave = items.map(item => ({
        recipe_id: savedRecipe.id,
        ingredient_id: item.ingredient_id,
        quantity_used: item.quantity_used,
        quantity_input: item.quantity_input,
        unit_input: item.unit_input
      }));

      const { error: itemsError } = await supabase.from('recipe_items').insert(itemsToSave);
      if (itemsError) throw itemsError;
    }

    return savedRecipe;
  },

  // Excluir
  delete: async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) throw error;
  }
};