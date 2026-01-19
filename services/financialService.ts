import { supabase } from './supabase';
import { Sale, Expense } from '../types';

export const FinancialService = {
  // === RECEITAS (VENDAS) ===
  
  async getSales() {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data as Sale[];
  },

  async addSale(sale: Omit<Sale, 'id' | 'user_id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('sales')
      .insert([sale])
      .select()
      .single();

    if (error) throw error;
    return data as Sale;
  },

  async deleteSale(id: string) {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // === DESPESAS ===

  async getExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data as Expense[];
  },

  async addExpense(expense: Omit<Expense, 'id' | 'user_id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('expenses')
      .insert([expense])
      .select()
      .single();

    if (error) throw error;
    return data as Expense;
  },

  async deleteExpense(id: string) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};