import { supabase } from './supabase';
import { Ingredient } from '../types';

export const IngredientService = {
  getAll: async (): Promise<Ingredient[]> => {
    const { data, error } = await supabase.from('ingredients').select('*').order('name');

    if (error) throw error;
    return data || [];
  },

  create: async (ingredient: Omit<Ingredient, 'id'>) => {
    const { data, error } = await supabase
      .from('ingredients')
      .insert([
        {
          name: ingredient.name,
          package_price: ingredient.package_price,
          package_amount: ingredient.package_amount,
          package_unit: ingredient.package_unit,
          base_unit: ingredient.base_unit,
          unit_cost_base: ingredient.unit_cost_base,
          current_stock: ingredient.current_stock || 0,
          min_stock: ingredient.min_stock || 10, // Salva o mínimo definido
          conversions: ingredient.conversions || [],
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id: string, ingredient: Partial<Ingredient>) => {
    const { data, error } = await supabase
      .from('ingredients')
      .update({
        name: ingredient.name,
        package_price: ingredient.package_price,
        package_amount: ingredient.package_amount,
        package_unit: ingredient.package_unit,
        base_unit: ingredient.base_unit,
        unit_cost_base: ingredient.unit_cost_base,
        current_stock: ingredient.current_stock,
        min_stock: ingredient.min_stock, // Atualiza o mínimo
        conversions: ingredient.conversions,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) throw error;
  },
};
