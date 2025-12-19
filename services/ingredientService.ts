import { supabase } from './supabase';
import { Ingredient } from '../types';

export const IngredientService = {
  // Buscar todos
  getAll: async (): Promise<Ingredient[]> => {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Criar novo
  create: async (ingredient: Omit<Ingredient, 'id'>) => {
    // Removemos ID (o banco gera) e garantimos que conversions seja enviado
    const { data, error } = await supabase
      .from('ingredients')
      .insert([{
        name: ingredient.name,
        package_price: ingredient.package_price,
        package_amount: ingredient.package_amount,
        package_unit: ingredient.package_unit,
        base_unit: ingredient.base_unit,
        unit_cost_base: ingredient.unit_cost_base,
        current_stock: ingredient.current_stock || 0,
        conversions: ingredient.conversions || [] // Aqui está a correção do item 6.1
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Excluir
  delete: async (id: string) => {
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};