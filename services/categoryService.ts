import { supabase } from './supabase';
import { Category } from '../types';

export const CategoryService = {
  async getAll() {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as Category[];
  },

  async create(name: string) {
    const { data, error } = await supabase
      .from('product_categories')
      .insert([{ name }])
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};