import { supabase } from './supabase';
import { Ingredient } from '../types';

export const IngredientService = {
  // Busca todos os ingredientes/produtos
  async getAll(): Promise<Ingredient[]> {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Cria um novo item
  async create(ingredient: Omit<Ingredient, 'id'>) {
    const { data, error } = await supabase
      .from('ingredients')
      .insert([
        {
          name: ingredient.name,
          package_price: ingredient.package_price,
          package_amount: ingredient.package_amount,
          package_unit: ingredient.package_unit,
          unit_cost_base: ingredient.unit_cost_base,
          base_unit: ingredient.base_unit,
          current_stock: ingredient.current_stock,
          min_stock: ingredient.min_stock,
          conversions: ingredient.conversions,
          category: ingredient.category // <--- ESTA LINHA ESTAVA FALTANDO OU INCORRETA
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualiza um item existente
  async update(id: string, ingredient: Partial<Ingredient>) {
    const { data, error } = await supabase
      .from('ingredients')
      .update({
        name: ingredient.name,
        package_price: ingredient.package_price,
        package_amount: ingredient.package_amount,
        package_unit: ingredient.package_unit,
        unit_cost_base: ingredient.unit_cost_base,
        base_unit: ingredient.base_unit,
        current_stock: ingredient.current_stock,
        min_stock: ingredient.min_stock,
        conversions: ingredient.conversions,
        category: ingredient.category // <--- ESTA LINHA TAMBÉM PRECISA ESTAR AQUI
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Deleta um item
  async delete(id: string) {
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};