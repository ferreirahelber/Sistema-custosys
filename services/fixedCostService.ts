import { supabase } from './supabase';
import { FixedCost } from '../types';

export const FixedCostService = {
  // Buscar todas as contas
  getAll: async () => {
    const { data, error } = await supabase
      .from('fixed_costs')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as FixedCost[];
  },

  // Adicionar conta
  add: async (cost: FixedCost) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não logado');

    const { error } = await supabase.from('fixed_costs').insert({
      user_id: user.id,
      name: cost.name,
      value: cost.value,
    });

    if (error) throw error;
  },

  // --- NOVO: Atualizar conta ---
  update: async (id: string, cost: Partial<FixedCost>) => {
    const { error } = await supabase
      .from('fixed_costs')
      .update({
        name: cost.name,
        value: cost.value,
      })
      .eq('id', id);

    if (error) throw error;
  },

  // Remover conta
  delete: async (id: string) => {
    const { error } = await supabase.from('fixed_costs').delete().eq('id', id);

    if (error) throw error;
  },
};
