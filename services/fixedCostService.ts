import { supabase } from './supabase';

export interface FixedCost {
  id?: string;
  name: string;
  value: number;
}

export const FixedCostService = {
  // Buscar todas as contas
  getAll: async () => {
    const { data, error } = await supabase
      .from('fixed_costs')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Adicionar conta
  add: async (cost: FixedCost) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não logado");

    const { error } = await supabase
      .from('fixed_costs')
      .insert({
        user_id: user.id,
        name: cost.name,
        value: cost.value
      });
    
    if (error) throw error;
  },

  // Remover conta
  delete: async (id: string) => {
    const { error } = await supabase
      .from('fixed_costs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};