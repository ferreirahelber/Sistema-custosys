import { supabase } from './supabase';
import { PriceHistory } from '../types';

export const PriceHistoryService = {
  async getByRecipeId(recipeId: string): Promise<PriceHistory[]> {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};