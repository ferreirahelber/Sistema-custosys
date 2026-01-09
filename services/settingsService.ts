import { supabase } from './supabase';
import { Settings } from '../types';

export const SettingsService = {
  // Buscar configurações
  get: async (): Promise<Settings> => {
    try {
      const { data, error } = await supabase.from('user_settings').select('*').single();

      // Se o erro for "não encontrado" (primeiro acesso), retorna padrão
      if (error && error.code === 'PGRST116') {
        return {
          employees: [],
          labor_monthly_cost: 0,
          work_hours_monthly: 160,
          fixed_overhead_rate: 0,
          cost_per_minute: 0,
        };
      }

      if (error) {
        console.error('Erro ao buscar configs:', error);
        throw error;
      }

      // Se retornou dados, formata e devolve
      return {
        // Se employees vier nulo do banco, garante que seja um array vazio
        employees: data.employees || [],
        labor_monthly_cost: Number(data.labor_monthly_cost),
        work_hours_monthly: Number(data.work_hours_monthly),
        fixed_overhead_rate: Number(data.fixed_overhead_rate),
        cost_per_minute: Number(data.cost_per_minute),
      };
    } catch (err) {
      console.error('Erro fatal no get:', err);
      // Retorna objeto zerado para não travar a tela
      return {
        employees: [],
        labor_monthly_cost: 0,
        work_hours_monthly: 0,
        fixed_overhead_rate: 0,
        cost_per_minute: 0,
      };
    }
  },

  // Salvar ou Atualizar (CORREÇÃO DO BUG 409)
  save: async (settings: Settings): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error('Usuário não autenticado');
        return false;
      }

      // Prepara o objeto APENAS com os dados que queremos salvar
      // NÃO enviamos o 'id' (chave primária) para evitar conflitos
      const dataToSave = {
        user_id: user.id, // Esta é a chave de verificação
        employees: settings.employees,
        labor_monthly_cost: settings.labor_monthly_cost,
        work_hours_monthly: settings.work_hours_monthly,
        fixed_overhead_rate: settings.fixed_overhead_rate,
        cost_per_minute: settings.cost_per_minute,
        updated_at: new Date().toISOString(),
      };

      // O segredo está aqui: onConflict: 'user_id'
      // Isso diz ao Supabase: "Se já existir esse user_id, atualize o resto. Se não, crie."
      const { error } = await supabase
        .from('user_settings')
        .upsert(dataToSave, { onConflict: 'user_id' });

      if (error) {
        console.error('Erro do Supabase ao salvar:', error);
        alert(`Erro ao salvar: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro geral ao salvar:', error);
      return false;
    }
  },
};
