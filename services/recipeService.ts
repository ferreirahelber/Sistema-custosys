import { supabase } from './supabase';
import { Recipe } from '../types';

export const RecipeService = {
  // Buscar todas as receitas
  getAll: async (): Promise<Recipe[]> => {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        items:recipe_items (
          id,
          ingredient_id,
          quantity, 
          ingredient:ingredients (
            name,
            base_unit,
            unit_cost_base
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Mapeamento Inteligente (Banco -> Frontend)
    return data?.map((r: any) => ({
      ...r,
      items: r.items?.map((item: any) => ({
        id: item.id,
        ingredient_id: item.ingredient_id,
        
        // TRADUÇÃO: O banco chama de 'quantity', mas o sistema usa 'quantity_used'
        quantity_used: item.quantity, 
        
        // Se você salvou quantity_input no banco, use aqui. 
        // Se não, usamos a própria quantidade base como fallback visual
        quantity_input: item.quantity, 
        unit_input: item.ingredient?.base_unit,

        // Garante que o nome venha do banco
        name: item.ingredient?.name || 'Ingrediente não encontrado',
        unit: item.ingredient?.base_unit,
        price: item.ingredient?.unit_cost_base
      })) || []
    })) || [];
  },

  // Salvar Receita
  save: async (recipe: Recipe) => {
    const { items, id, ...recipeData } = recipe;
    const { data: { user } } = await supabase.auth.getUser();

    // Removemos campos calculados (total_cost_*, unit_cost) do objeto principal
    // para não dar erro se a tabela recipes não tiver essas colunas exatas ainda,
    // mas se tiver, você pode mantê-los. Aqui assumo que o foco é corrigir o erro de itens.
    const { 
      total_cost_material, total_cost_labor, total_cost_overhead, total_cost_final, unit_cost, 
      ...cleanData 
    } = recipeData as any;

    // 1. Salva/Atualiza a Capa da Receita
    const { data: savedRecipe, error: recipeError } = await supabase
      .from('recipes')
      .upsert({
        id: id || undefined,
        user_id: user?.id,
        name: cleanData.name,
        yield_units: cleanData.yield_units,
        preparation_time_minutes: cleanData.preparation_time_minutes,
        preparation_method: cleanData.preparation_method,
        
        // Salvamos os custos (Certifique-se que essas colunas existem na tabela recipes)
        total_cost_material: Number(recipe.total_cost_material) || 0,
        total_cost_labor: Number(recipe.total_cost_labor) || 0,
        total_cost_overhead: Number(recipe.total_cost_overhead) || 0,
        total_cost_final: Number(recipe.total_cost_final) || 0,
        unit_cost: Number(recipe.unit_cost) || 0
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // 2. Salva os Itens (CORREÇÃO AQUI)
    if (items && items.length > 0) {
      // Limpa itens antigos para evitar duplicidade na edição
      await supabase.from('recipe_items').delete().eq('recipe_id', savedRecipe.id);

      const itemsToSave = items.map(item => ({
        recipe_id: savedRecipe.id,
        ingredient_id: item.ingredient_id,
        
        // CORREÇÃO CRÍTICA:
        // Pegamos o valor de 'quantity_used' do sistema e mandamos para 'quantity' do banco
        quantity: item.quantity_used || 0
      }));

      const { error: itemsError } = await supabase.from('recipe_items').insert(itemsToSave);
      
      if (itemsError) throw itemsError;
    } else if (savedRecipe.id) {
       // Se salvou uma receita sem itens, limpa tudo
       await supabase.from('recipe_items').delete().eq('recipe_id', savedRecipe.id);
    }

    return savedRecipe;
  },

  // Excluir
  delete: async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) throw error;
  }
};