import { supabase } from './supabase';
import { Sale, Expense, Settings } from '../types';
import Decimal from 'decimal.js';

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
  },

  /**
   * Calcula as taxas de transação e retorna os valores brutos, taxas e líquidos.
   * Centraliza a lógica para garantir consistência entre PDV e Vendas Manuais.
   */
  calculateTransactionFees(
    amount: number,
    paymentMethod: string,
    settings: Settings | null
  ) {
    const totalDec = new Decimal(amount || 0);
    const method = (paymentMethod || '').toLowerCase().trim();

    // Taxas padrão se não houver nas configurações
    const debitRateVal = settings?.card_debit_rate ?? 1.60;
    const creditRateVal = settings?.card_credit_rate ?? 4.39;

    const debitRate = new Decimal(debitRateVal);
    const creditRate = new Decimal(creditRateVal);

    let feeDec = new Decimal(0);
    let rateApplied = 0;

    // Lógica de Taxas
    if (method.includes('débito') || method.includes('debito')) {
      feeDec = totalDec.times(debitRate.dividedBy(100));
      rateApplied = debitRateVal;
    }
    else if (method.includes('crédito') || method.includes('credito') || method.includes('cartão')) {
      feeDec = totalDec.times(creditRate.dividedBy(100));
      rateApplied = creditRateVal;
    }

    const netAmountDec = totalDec.minus(feeDec);

    return {
      total: totalDec.toNumber(),
      fee: feeDec.toNumber(),
      net: netAmountDec.toNumber(),
      rateApplied
    };
  },

  /**
   * Registra a taxa da transação como uma despesa.
   * Centraliza a lógica de inserção na tabela 'expenses'.
   */
  async recordTransactionFee(
    saleId: string | null, // Pode ser null se não tiver ID de venda ainda (embora idealmente tenha)
    feeAmount: number,
    description: string,
    date: string,
    userId: string | undefined,
    userEmail: string | undefined
  ) {
    if (feeAmount <= 0) return;

    const { error } = await supabase.from('expenses').insert({
      description: `Taxa Cartão - ${description}`,
      amount: feeAmount,
      category: 'Taxas Financeiras',
      date: date,
      user_id: userId,
      user_email: userEmail,
      // Se você tiver uma coluna sale_id na tabela expenses, adicione aqui:
      // sale_id: saleId
    });

    if (error) {
      console.error('Erro ao salvar taxa:', error);
      // Não damos throw aqui para não travar a venda principal se a taxa falhar? 
      // Ou damos throw para garantir consistência? 
      // Vamos logar por enquanto para não parar a venda.
    }
  }
};