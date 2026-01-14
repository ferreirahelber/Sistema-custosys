import { supabase } from './supabase';
import { Ingredient, Recipe, Settings } from '../types';

export interface BackupData {
  version: string;
  timestamp: string;
  source: 'custosys';
  data: {
    ingredients: Ingredient[];
    recipes: Recipe[];
    recipe_items: any[];
    settings: Settings | null;
  };
}

export const BackupService = {
  // --- EXPORTAR (CRIAR BACKUP) ---
  async createBackup(): Promise<BackupData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');

    // Busca dados com tratamento de erro
    const { data: ingredients, error: ingError } = await supabase.from('ingredients').select('*');
    if (ingError) throw new Error('Erro ao exportar ingredientes: ' + ingError.message);

    const { data: recipes, error: recError } = await supabase.from('recipes').select('*');
    if (recError) throw new Error('Erro ao exportar receitas: ' + recError.message);

    const { data: recipeItems, error: itemsError } = await supabase.from('recipe_items').select('*');
    if (itemsError) throw new Error('Erro ao exportar itens: ' + itemsError.message);

    const { data: settings } = await supabase.from('user_settings').select('*').single();

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      source: 'custosys',
      data: {
        ingredients: ingredients || [],
        recipes: recipes || [],
        recipe_items: recipeItems || [],
        settings: settings || null,
      },
    };
  },

  // --- IMPORTAR (RESTAURAR DADOS) ---
  async restoreBackup(backup: BackupData): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');

    if (backup.source !== 'custosys' || !backup.data) {
      throw new Error('Ficheiro de backup inválido (Formato incorreto).');
    }

    // 1. Restaurar Configurações (CORREÇÃO AQUI)
    if (backup.data.settings) {
      const { id, ...settingsData } = backup.data.settings as any;
      
      // Importante: onConflict garante que atualizamos a linha deste usuário
      const { error } = await supabase.from('user_settings').upsert(
        { ...settingsData, user_id: user.id }, 
        { onConflict: 'user_id' }
      );
      
      if (error) throw new Error(`Erro Configurações: ${error.message}`);
    }

    // 2. Restaurar Ingredientes
    if (backup.data.ingredients?.length > 0) {
      const ingredientsPayload = backup.data.ingredients.map(ing => ({
        ...ing,
        user_id: user.id
      }));
      const { error } = await supabase.from('ingredients').upsert(ingredientsPayload);
      if (error) throw new Error(`Erro Ingredientes: ${error.message}`);
    }

    // 3. Restaurar Receitas
    if (backup.data.recipes?.length > 0) {
      const recipesPayload = backup.data.recipes.map(rec => {
        const { items, ...recipeData } = rec as any; 
        return { ...recipeData, user_id: user.id };
      });
      const { error } = await supabase.from('recipes').upsert(recipesPayload);
      if (error) throw new Error(`Erro Receitas: ${error.message}`);
    }

    // 4. Restaurar Itens das Receitas
    if (backup.data.recipe_items?.length > 0) {
      // Removemos campos virtuais que possam ter vindo no JSON (como ingredient_name se foi injetado)
      // para evitar erro de "coluna não existe"
      const itemsPayload = backup.data.recipe_items.map((item: any) => {
        const { ingredient, ...cleanItem } = item;
        return cleanItem;
      });

      const { error } = await supabase.from('recipe_items').upsert(itemsPayload);
      if (error) throw new Error(`Erro Itens: ${error.message}`);
    }
  }
};