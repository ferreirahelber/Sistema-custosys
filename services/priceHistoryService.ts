import { supabase } from './supabase';
import { PriceHistory } from '../types';

export const PriceHistoryService = {
  // Busca histórico de uma receita
  async getByRecipeId(recipeId: string): Promise<PriceHistory[]> {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // CORREÇÃO: Método 'add' necessário para a automação
  async add(history: Omit<PriceHistory, 'id' | 'changed_at'>) {
    const { error } = await supabase
      .from('price_history')
      .insert([history]); // O banco gera 'id' e 'changed_at' automaticamente

    if (error) throw error;
  }
};