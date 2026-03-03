import { supabase } from './supabase';
import { Settings } from '../types';

export const SettingsService = {
  // Função auxiliar para pegar o usuário atual
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async get(): Promise<Settings> {
    // Buscamos a primeira linha da tabela, independente de quem criou
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .order('updated_at', { ascending: false }) // Pega a última atualização
      .limit(1)
      .maybeSingle(); // Usamos maybeSingle para evitar erro se estiver vazio

    if (error) {
      console.error('Erro crítico ao buscar settings no Supabase:', error);
    }

    // Se não houver dados, aí sim retornamos o default
    if (!data) {
      console.warn('Nenhuma configuração encontrada no banco. Usando padrão.');
      return this.getDefaultSettings();
    }

    return {
      ...data,
      card_debit_rate: Number(data.card_debit_rate ?? 1.60),
      card_credit_rate: Number(data.card_credit_rate ?? 4.39),
      default_tax_rate: Number(data.default_tax_rate ?? 0),
      default_card_fee: Number(data.default_card_fee ?? 0),
      pix_key: data.pix_key || ''
    };
  },

  // Valores padrão para quando não existir configuração
  getDefaultSettings(): Settings {
    return {
      employees: [],
      labor_monthly_cost: 0,
      work_hours_monthly: 220,
      fixed_overhead_rate: 0,
      cost_per_minute: 0,
      estimated_monthly_revenue: 0,
      default_tax_rate: 0,
      default_card_fee: 0,
      card_debit_rate: 1.60,
      card_credit_rate: 4.39,
      pix_key: ''
    };
  },

  async update(settings: Partial<Settings>) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado");

    // O Upsert agora usa o ID do usuário para garantir unicidade
    const { data, error } = await supabase
      .from('user_settings')
      .upsert([{
        user_id: user.id, // VÍNCULO OBRIGATÓRIO
        ...settings
      }], { onConflict: 'user_id' }) // Garante que atualiza se o user_id já existir
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async save(settings: Settings) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado");

    const payload = {
      user_id: user.id, // VÍNCULO OBRIGATÓRIO
      labor_monthly_cost: settings.labor_monthly_cost,
      work_hours_monthly: settings.work_hours_monthly,
      fixed_overhead_rate: settings.fixed_overhead_rate,
      cost_per_minute: settings.cost_per_minute,
      estimated_monthly_revenue: settings.estimated_monthly_revenue,
      default_tax_rate: settings.default_tax_rate,
      default_card_fee: settings.default_card_fee,
      card_debit_rate: settings.card_debit_rate,
      card_credit_rate: settings.card_credit_rate,
      pix_key: settings.pix_key || null,
    };

    const { data, error } = await supabase
      .from('user_settings')
      .upsert([payload], { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return [];
    }
    return data || [];
  }
};