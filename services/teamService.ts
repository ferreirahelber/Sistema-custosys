import { supabase } from './supabase';

export interface TeamMember {
  id?: string;
  name: string;
  salary: number;
  hours_monthly: number;
}

export const TeamService = {
  // Buscar todos
  getAll: async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Adicionar
  add: async (member: TeamMember) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não logado");

    const { error } = await supabase
      .from('team_members')
      .insert({
        user_id: user.id,
        name: member.name,
        salary: member.salary,
        hours_monthly: member.hours_monthly
      });
    
    if (error) throw error;
  },

  // --- NOVA FUNÇÃO: ATUALIZAR ---
  update: async (id: string, member: Partial<TeamMember>) => {
    const { error } = await supabase
      .from('team_members')
      .update({
        name: member.name,
        salary: member.salary,
        hours_monthly: member.hours_monthly
      })
      .eq('id', id);

    if (error) throw error;
  },

  // Remover
  delete: async (id: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};