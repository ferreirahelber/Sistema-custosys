import { supabase } from './supabase';
import { Customer } from '../types';

export const CustomerService = {
  async getAll() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as Customer[];
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(5);
    if (error) throw error;
    return data as Customer[];
  },

  async create(customer: Omit<Customer, 'id'>) {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  }
};