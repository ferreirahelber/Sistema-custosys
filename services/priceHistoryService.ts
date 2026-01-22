import { supabase } from './supabase';
import { PriceHistory } from '../types';

export const PriceHistoryService = {
  // Busca histórico
  async getByRecipeId(recipeId: string): Promise<PriceHistory[]> {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Adiciona entrada e atualiza receita
  async addEntry(entry: Omit<PriceHistory, 'id' | 'changed_at'>) {
    // 1. Grava histórico
    const { error: histError } = await supabase
      .from('price_history')
      .insert([entry]);

    if (histError) {
      throw new Error(`Erro SQL Histórico: ${histError.message}`);
    }

    // 2. Atualiza Receita
    const { error: recipeError } = await supabase
      .from('recipes')
      .update({ selling_price: entry.new_price })
      .eq('id', entry.recipe_id);

    if (recipeError) {
      throw new Error(`Erro SQL Receita: ${recipeError.message}`);
    }
  }
};