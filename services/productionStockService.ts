import { supabase } from './supabase';
import { ProductionStock, LossReason, InventoryLoss } from '../types';

export interface MissingItem {
  name: string;
  needed: number;
  available: number;
}

export interface ProductionBatchResponse {
  success: boolean;
  missing_items?: MissingItem[];
}

export const ProductionStockService = {
  /**
   * Registra a produção de um lote de uma receita, 
   * disparando a conversão e baixa de ingredientes via RPC.
   * 
   * @param recipeId ID da receita sendo produzida
   * @param quantityProduced Quantidade física que foi produzida
   * @param originalYield Rendimento original constante no cadastro da receita
   * @param yieldUnit Unidade de medida (ex: 'g', 'un')
   * @returns Resposta indicando erro (com itens faltantes) ou sucesso.
   */
  async registerBatch(
    recipeId: string,
    quantityProduced: number,
    originalYield: number,
    yieldUnit: string
  ): Promise<ProductionBatchResponse> {
    
    // Verificação de segurança (Impede NaN e Infinity)
    if (originalYield <= 0) {
      throw new Error("O rendimento configurado na receita é inválido (zero).");
    }

    const { data, error } = await supabase.rpc('register_production_batch', {
      p_recipe_id: recipeId,
      p_quantity_produced: quantityProduced,
      p_original_yield: originalYield,
      p_yield_unit: yieldUnit
    });

    if (error) {
       console.error("Erro RPC register_production_batch:", error);
       throw error;
    }

    return data as ProductionBatchResponse;
  },

  /**
   * Busca o estoque de um produto formatado
   */
  async getStock(recipeId: string): Promise<ProductionStock | null> {
    const { data, error } = await supabase
      .from('production_stock')
      .select('*')
      .eq('recipe_id', recipeId)
      .maybeSingle();

    if (error) throw error;
    return data as ProductionStock | null;
  },

  /**
   * Busca todo o estoque de produção, com dados da receita (nome, unidade)
   */
  async getAllStock(): Promise<Array<ProductionStock & { recipes: { name: string, category: string } }>> {
    const { data, error } = await supabase
      .from('production_stock')
      .select(`
        *,
        recipes:recipe_id (name, category)
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as any;
  },

  /**
   * Busca todas as razões de perda cadastradas
   */
  async getLossReasons(): Promise<LossReason[]> {
    const { data, error } = await supabase
      .from('loss_reasons')
      .select('*')
      .order('label');

    if (error) throw error;
    return data as LossReason[];
  },

  /**
   * Adiciona um novo motivo de perda
   */
  async addLossReason(label: string): Promise<LossReason> {
    const { data, error } = await supabase
      .from('loss_reasons')
      .insert([{ label: label.trim() }])
      .select()
      .single();

    if (error) throw error;
    return data as LossReason;
  },

  /**
   * Registra uma nova perda de estoque.
   * A trigger do postgres 'tr_inventory_loss_stock_update' cuidará de descontar da prateleira.
   */
  async registerLoss(loss: Omit<InventoryLoss, 'id' | 'created_at'>): Promise<InventoryLoss> {
    const { data, error } = await supabase
      .from('inventory_losses')
      .insert([loss])
      .select()
      .single();

    if (error) throw error;
    return data as InventoryLoss;
  },

  /**
   * Busca o histórico de todas as perdas registradas
   */
  async getLossHistory(): Promise<Array<InventoryLoss>> {
    const { data, error } = await supabase
      .from('inventory_losses')
      .select(`
        *,
        recipes (name, category),
        loss_reasons (label)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    // O backend retorna os joins em objetos aninhados, faremos o Type Casting
    return data as any;
  }
};
