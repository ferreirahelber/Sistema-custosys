import { supabase } from './supabase';
import { Ingredient, IngredientPurchase } from '../types';

export const IngredientService = {
  // Busca todos os ingredientes
  async getAll(): Promise<Ingredient[]> {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },
  
  // Busca histórico de compras de um ingrediente
  async getPurchases(ingredientId: string): Promise<IngredientPurchase[]> {
    const { data, error } = await supabase
      .from('ingredient_purchases')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .order('purchase_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Adiciona nova compra e atualiza estoque e custo
  async addPurchase(purchase: Omit<IngredientPurchase, 'id' | 'created_at'>) {
    if (purchase.quantity <= 0) {
      throw new Error("A quantidade comprada deve ser maior que zero.");
    }

    // 1. Buscar ingrediente atual para pegar o estoque atual
    const { data: ingredient, error: fetchError } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', purchase.ingredient_id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Inserir a compra
    const { data: newPurchase, error: purchaseError } = await supabase
      .from('ingredient_purchases')
      .insert([purchase])
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // 3. Calcular novo estoque e custo base
    const newStock = (ingredient.current_stock || 0) + purchase.quantity;
    const newUnitCostBase = purchase.price / purchase.quantity;

    // 4. Atualizar o ingrediente principal no banco
    const { error: updateError } = await supabase
      .from('ingredients')
      .update({
        current_stock: newStock,
        unit_cost_base: newUnitCostBase,
        package_price: purchase.price,
        package_amount: purchase.quantity,
        package_unit: purchase.unit
      })
      .eq('id', purchase.ingredient_id);

    if (updateError) throw updateError;

    return newPurchase;
  },

  // Renomeia uma marca em todos os registros
  async renameBrand(oldBrand: string, newBrand: string) {
    const { error } = await supabase
      .from('ingredient_purchases')
      .update({ brand: newBrand })
      .eq('brand', oldBrand);
    
    if (error) throw error;
  },

  // Renomeia um fornecedor em todos os registros
  async renameSupplier(oldSupplier: string, newSupplier: string) {
    const { error } = await supabase
      .from('ingredient_purchases')
      .update({ supplier: newSupplier })
      .eq('supplier', oldSupplier);
    
    if (error) throw error;
  },

  // Cria um novo item
  async create(ingredient: Omit<Ingredient, 'id'>) {
    const { data, error } = await supabase
      .from('ingredients')
      .insert([{
        name: ingredient.name,
        package_price: ingredient.package_price,
        package_amount: ingredient.package_amount,
        package_unit: ingredient.package_unit,
        unit_cost_base: ingredient.unit_cost_base,
        base_unit: ingredient.base_unit,
        current_stock: ingredient.current_stock,
        min_stock: ingredient.min_stock,
        conversions: ingredient.conversions,
        category: ingredient.category
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualiza um item (Cascata agora é via Trigger SQL)
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
        category: ingredient.category
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) throw error;
  }
};
