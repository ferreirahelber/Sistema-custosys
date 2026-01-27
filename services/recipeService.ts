import { supabase } from './supabase';
import { Recipe, RecipeItemResponse } from '../types';

export const RecipeService = {
  async getAll(): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *, 
        items:recipe_items!recipe_items_recipe_id_fkey (
          *, 
          ingredient:ingredients (*)
        )
      `) // ADICIONADO !recipe_items_recipe_id_fkey para resolver o erro PGRST201
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((r) => ({
      ...r,
      items: (r.items || []).map((i: RecipeItemResponse) => ({
        ...i,
        quantity_used: i.quantity,
        quantity_input: i.quantity_input || i.quantity,
        unit_input: i.unit_input || i.ingredient?.base_unit || 'un',
        ingredient_name: i.ingredient_name || i.ingredient?.name 
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
        ingredient_id: item.ingredient_id,
        quantity: item.quantity_used,
        quantity_input: item.quantity_input,
        unit_input: item.unit_input,
        ingredient_name: item.ingredient_name 
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