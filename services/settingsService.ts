import { supabase } from './supabase';
import { Settings } from '../types';

export const SettingsService = {
  async get(): Promise<Settings> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (error) {
      // Se não existir, retorna um padrão seguro COM AS NOVAS TAXAS
      return {
        employees: [],
        labor_monthly_cost: 0,
        work_hours_monthly: 220,
        fixed_overhead_rate: 0,
        cost_per_minute: 0,
        estimated_monthly_revenue: 0,
        default_tax_rate: 0,
        default_card_fee: 0,
        // CORREÇÃO: Adicionando os campos obrigatórios
        card_debit_rate: 1.60,
        card_credit_rate: 4.39
      };
    }

    return {
      ...data,
      // Garante que mesmo que venha do banco, tenha valor
      card_debit_rate: data.card_debit_rate ?? 1.60,
      card_credit_rate: data.card_credit_rate ?? 4.39
    };
  },

  async update(settings: Partial<Settings>) {
    const { data, error } = await supabase
      .from('settings')
      .upsert([{ 
        id: 1, // Assume ID 1 para configuração única
        ...settings 
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async save(settings: Settings) {
    // Mesma lógica do update, mas recebendo o objeto completo
    const { data, error } = await supabase
      .from('settings')
      .upsert([{ 
        id: 1, 
        ...settings 
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};