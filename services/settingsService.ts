import { supabase } from './supabase';
import { Settings } from '../types';

export const SettingsService = {
  get: async (): Promise<Settings> => {
    try {
      const { data, error } = await supabase.from('user_settings').select('*').single();

      if (error && error.code === 'PGRST116') {
        return {
          employees: [],
          labor_monthly_cost: 0,
          work_hours_monthly: 160,
          fixed_overhead_rate: 0,
          cost_per_minute: 0,
          estimated_monthly_revenue: 0,
          default_tax_rate: 4.5, // Padrão
          default_card_fee: 3.99 // Padrão
        };
      }

      if (error) throw error;

      return {
        employees: data.employees || [],
        labor_monthly_cost: Number(data.labor_monthly_cost),
        work_hours_monthly: Number(data.work_hours_monthly),
        fixed_overhead_rate: Number(data.fixed_overhead_rate),
        cost_per_minute: Number(data.cost_per_minute),
        estimated_monthly_revenue: Number(data.estimated_monthly_revenue || 0),
        // NOVOS CAMPOS
        default_tax_rate: Number(data.default_tax_rate ?? 4.5),
        default_card_fee: Number(data.default_card_fee ?? 3.99),
      };
    } catch (err) {
      console.error(err);
      return {
        employees: [],
        labor_monthly_cost: 0,
        work_hours_monthly: 0,
        fixed_overhead_rate: 0,
        cost_per_minute: 0,
        estimated_monthly_revenue: 0,
        default_tax_rate: 4.5,
        default_card_fee: 3.99
      };
    }
  },

  save: async (settings: Settings): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const dataToSave = {
        user_id: user.id,
        employees: settings.employees,
        labor_monthly_cost: settings.labor_monthly_cost,
        work_hours_monthly: settings.work_hours_monthly,
        fixed_overhead_rate: settings.fixed_overhead_rate,
        cost_per_minute: settings.cost_per_minute,
        estimated_monthly_revenue: settings.estimated_monthly_revenue,
        // SALVAR NOVOS CAMPOS
        default_tax_rate: settings.default_tax_rate,
        default_card_fee: settings.default_card_fee,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert(dataToSave, { onConflict: 'user_id' });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },
};