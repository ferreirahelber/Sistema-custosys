import { supabase } from './supabase';
import { Recipe, RecipeItemResponse } from '../types';

export const RecipeService = {
  async getAll(): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
      *,
      production_stock:production_stock(quantity, min_quantity),
      items:recipe_items!recipe_items_recipe_id_fkey(*, ingredient:ingredients!left(*), sub_recipe:recipes!sub_recipe_id!left(*))
    `) // Especificamos que queremos o caminho pelo recipe_id
      .is('deleted_at', null)
      .order('name');

    if (error) {
      console.error("Erro ao buscar receitas:", error);
      throw error;
    }

    const recipesData = data as any[];

    return (recipesData || []).map((r) => ({
      ...r,
      is_base: Boolean(r.is_base),
      items: (r.items || []).map((i: any) => ({
        ...i,
        quantity_used: i.quantity,
        quantity_input: i.quantity_input || i.quantity,
        unit_input: i.unit_input || i.ingredient?.base_unit || i.sub_recipe?.yield_unit || 'un',
        ingredient_name: i.ingredient_name || i.ingredient?.name || i.sub_recipe?.name
      })),
      production_stock: Array.isArray(r.production_stock) ? r.production_stock[0] : r.production_stock
    }));
  },

  async getById(id: string) {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;

    // BUKA O LEFT JOIN: Em Supabase se você puxar uma Relation e o campo estiver NULL, ele mata a ROW inteira (Inner Join).
    // Como implementamos `item_type = 'recipe'` onde ingredient_id ficam preenchidos de Null para as subreceitas...
    // as duas linhas morriam juntas retornando Data vazia.
    // O recurso !left() instrui o PostgREST a trazer o Item mesmo sem pareamento no Ingredients
    // O segundo !left() traz a Sub-Receita (Base) se o item for do tipo 'recipe'
    const { data: items, error: itemsError } = await supabase
      .from('recipe_items')
      .select('*, ingredient:ingredients!left(*), sub_recipe:recipes!sub_recipe_id!left(*)') 
      .eq('recipe_id', id);

    if (itemsError) throw itemsError;

    const formattedItems = (items || []).map((i: any) => ({
      ...i,
      // FIX CRITICO: O formulário UI espera o ID neste campo genérico para localizar o dropdown
      ingredient_id: i.item_type === 'recipe' ? (i.sub_recipe_id || i.item_id) : i.ingredient_id,
      quantity_used: i.quantity,
      quantity_input: i.quantity_input || i.quantity,
      unit_input: i.unit_input || i.ingredient?.base_unit || i.sub_recipe?.yield_unit || 'un',
      ingredient_name: i.ingredient_name || i.ingredient?.name || i.sub_recipe?.name
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

    // BLOQUEIO DE PAYLOAD VAZIO EXTREMO (Para Update de Receita Baseada em Componentes)
    // Se a receita já existe (Update) e o payload diz que não tem itens:
    if (recipeData.id && (!items || items.length === 0)) {
      // Verifica no BD se ela possuía ingredientes antes. Se sim, barramos a exclusão sumária acidental.
      const { count } = await supabase.from('recipe_items').select('*', { count: 'exact', head: true }).eq('recipe_id', recipeData.id);
      if (count && count > 0) {
         throw new Error("ALERTA DE SEGURANÇA: Salvação bloqueada. O banco detectou que esta receita possui ingredientes, mas o payload recebido está VAZIO. Para evitar perda acidental de dados, a ação foi abortada.");
      }
    }

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
      // CACHE PARA ROLLBACK TRANSACIONAL APP-LEVEL
      let previousItemsBackup: any[] = [];
      if (recipeData.id) {
         const { data: oldItems } = await supabase.from('recipe_items').select('*').eq('recipe_id', savedRecipe.id);
         if (oldItems && oldItems.length > 0) {
            previousItemsBackup = oldItems;
         }
      }

      await supabase.from('recipe_items').delete().eq('recipe_id', savedRecipe.id);

      const itemsToInsert = items.map((item) => ({
        recipe_id: savedRecipe.id,
        // CORREÇÃO: Mapeia corretamente para ingredient_id ou sub_recipe_id dependendo do tipo
        ingredient_id: item.item_type === 'recipe' ? null : (item.ingredient_id || item.item_id),
        sub_recipe_id: item.item_type === 'recipe' ? (item.ingredient_id || item.item_id) : null,
        // Usa `quantity_used` se existir, caso contrário fallback pro `quantity` local
        quantity: item.quantity_used || (item as any).quantity || 0,
        // Limpando colunas virtuais do frontend que estavam causando a quebra do Insert() logo após o Delete() 
        // Não tentar inserir: quantity_input, unit_input, ingredient_name
        // MUITO IMPORTANTE: Salvar o tipo para o cálculo saber o que fazer depois
        item_type: item.item_type || 'ingredient'
      }));

      const { error: itemsError } = await supabase.from('recipe_items').insert(itemsToInsert);

      if (itemsError) {
        console.error("Erro ao salvar Itens da Receita (Schema Rejection/Network). Iniciando Rollback automático...", itemsError);
        // REINSERINDO BACKUP SE INSERT FALHAR
        if (previousItemsBackup.length > 0) {
            console.log("Restaurando os ingredientes antigos destruídos precocemente...");
            const rollbackItems = previousItemsBackup.map(old => {
               const rollbackObj = { ...old };
               delete rollbackObj.id; // supabase auto-generates
               delete rollbackObj.created_at; 
               return rollbackObj;
            });
            await supabase.from('recipe_items').insert(rollbackItems);
            console.log("Ingredientes restaurados pós-falha.");
        }
        throw new Error(`Falha crítica ao gravar os ingredientes. A receita mãe foi salva, mas os Itens falharam: ${itemsError.message}. Os dados vitais antigos (itens) foram protegidos pelo Rollback!`);
      }
    }

    return savedRecipe;
  },

  // Novo Custo/Simulador Isolado para NÃO tocar nas SubCollection de Imutabilidade
  async updateMetadata(id: string, metadata: { selling_price?: number; margin?: number; }) {
    const { error } = await supabase.from('recipes').update(metadata).eq('id', id);
    if (error) {
       console.error("Erro ao salvar metadados gerenciais da receita:", error);
       throw error;
    }
    return true;
  },

  async delete(id: string) {
    // 1. Verificar se esta receita (base) está sendo usada em outras receitas
    const { count, error: checkError } = await supabase
      .from('recipe_items')
      .select('*', { count: 'exact', head: true })
      .eq('sub_recipe_id', id);

    if (checkError) throw checkError;

    if (count && count > 0) {
      throw new Error(`Este insumo não pode ser excluído pois está sendo usado em ${count} receita(s). Remova-o antes de excluir.`);
    }

    // 2. Excluir itens destas receita
    const { error: itemsError } = await supabase
      .from('recipe_items')
      .delete()
      .eq('recipe_id', id);

    if (itemsError) throw itemsError;

    // 3. Opcional: Excluir histórico de preços vinculado
    const { error: historyError } = await supabase
      .from('price_history')
      .delete()
      .eq('recipe_id', id);

    if (historyError) console.warn("Erro ao excluir price_history, continuando...", historyError);

    // 4. Excluir a receita em si (AGORA É SOFT DELETE)
    // Opcional: Se quiser Hard Delete mesmo assim, deixe .delete()
    // Mas a opção escolhida foi a 1 + 2, então faremos Soft Delete
    const { error } = await supabase
      .from('recipes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};