import { supabase } from './supabase';
import { Recipe, RecipeItemResponse } from '../types';

export const RecipeService = {
  async getAll(): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
      *,
      items:recipe_items!recipe_items_recipe_id_fkey(*)
    `) // Especificamos que queremos o caminho pelo recipe_id
      .order('name');

    if (error) {
      console.error("Erro ao buscar receitas:", error);
      throw error;
    }

    return (data || []).map((r) => ({
      ...r,
      is_base: Boolean(r.is_base),
      items: (r.items || []).map((i: any) => ({
        ...i,
        quantity_used: i.quantity,
        quantity_input: i.quantity_input || i.quantity,
        unit_input: i.unit_input || 'un',
        ingredient_name: i.ingredient_name
      })),
    }));
  },

  async getById(id: string) {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;

    const { data: items, error: itemsError } = await supabase
      .from('recipe_items')
      .select('*, ingredient:ingredients(*)')
      .eq('recipe_id', id);

    if (itemsError) throw itemsError;

    const formattedItems = (items || []).map((i: any) => ({
      ...i,
      quantity_used: i.quantity,
      quantity_input: i.quantity_input || i.quantity,
      unit_input: i.unit_input || i.ingredient?.base_unit || 'un',
      ingredient_name: i.ingredient_name || i.ingredient?.name
    }));

    return { ...recipe, items: formattedItems } as Recipe;
  },

  async save(recipe: Recipe) {
    const { data: { user } } = await supabase.auth.getUser();

    const { items, ...recipeData } = recipe;

    const payload = {
      ...recipeData,
      yield_quantity: recipe.yield_quantity || 1, // Garante valor padrão para não quebrar
      yield_unit: recipe.yield_unit || 'un',
      id: recipeData.id || undefined,
      user_id: user?.id || (recipeData as any).user_id
    };

    delete (payload as any).created_at;

    const { data: savedRecipe, error: recipeError } = await supabase
      .from('recipes')
      .upsert(payload)
      .select()
      .single();

    if (recipeError) {
      console.error("Erro ao salvar Receita:", recipeError);
      throw recipeError;
    }

    if (items && items.length > 0) {
      await supabase.from('recipe_items').delete().eq('recipe_id', savedRecipe.id);

      const itemsToInsert = items.map((item) => ({
        recipe_id: savedRecipe.id,
        // CORREÇÃO: Se for 'recipe', manda nulo para ingredient_id para não quebrar a Foreign Key
        ingredient_id: item.item_type === 'recipe' ? null : item.ingredient_id,
        // Adicione o campo abaixo se você criou a coluna no banco, senão o ingredient_name já resolve o texto
        quantity: item.quantity_used,
        quantity_input: item.quantity_input,
        unit_input: item.unit_input,
        ingredient_name: item.ingredient_name,
        // MUITO IMPORTANTE: Salvar o tipo para o cálculo saber o que fazer depois
        item_type: item.item_type || 'ingredient'
      }));

      const { error: itemsError } = await supabase.from('recipe_items').insert(itemsToInsert);

      if (itemsError) {
        console.error("Erro ao salvar Itens:", itemsError);
        throw itemsError;
      }
    }

    return savedRecipe;
  },

  async delete(id: string) {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) throw error;
  },
};