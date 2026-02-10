import { supabase } from './supabase';
import { CashSession, Order, OrderItem, CartItem } from '../types';
import { SettingsService } from './settingsService';
import { FinancialService } from './financialService';
import Decimal from 'decimal.js';

export const PosService = {
  // =================================================================
  // 1. CONTROLE DE CAIXA (MULTI-USUÁRIO)
  // =================================================================
  async getCurrentSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'open')
      .eq('user_id', user.id) // FILTRO DE USUÁRIO
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as CashSession | null;
  },

  // Busca TODAS as sessões abertas (apenas para Admin/Dashboard)
  async getAllOpenSessions() {
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false });

    if (error) throw error;
    return data as CashSession[];
  },

  async getSessionSummary(sessionId: string) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, payment_method')
      .eq('session_id', sessionId)
      .eq('status', 'completed');
    if (error) throw error;

    const summary = { money: 0, pix: 0, debit: 0, credit: 0, total: 0 };
    orders?.forEach(order => {
      const value = Number(order.total_amount) || 0;
      const method = (order.payment_method || '').toLowerCase().trim();
      summary.total += value;
      if (method.includes('dinheiro')) summary.money += value;
      else if (method.includes('pix')) summary.pix += value;
      else if (method.includes('débito') || method.includes('debito')) summary.debit += value;
      else if (method.includes('crédito') || method.includes('credito') || method.includes('cartão')) summary.credit += value;
    });
    return summary;
  },

  async getSessionHistory() {
    // Retorna histórico geral. Pode-se filtrar por user se for 'cashier', mas pedido foi ver histórico geral.
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(50); // Aumentei limite
    if (error) throw error;
    return data as CashSession[];
  },

  async openSession(initialBalance: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const current = await this.getCurrentSession();
    if (current) return current;

    const { data, error } = await supabase.from('cash_sessions').insert([{
      initial_balance: initialBalance,
      status: 'open',
      opened_at: new Date().toISOString(),
      user_id: user.id,        // GRAVA USER ID
      user_email: user.email   // GRAVA USER EMAIL
    }]).select().single();

    if (error) throw error;
    return data as CashSession;
  },

  async closeSession(id: string, finalBalance: number, notes: string) {
    const { data: { user } } = await supabase.auth.getUser(); // Pega usuário atual
    const summary = await this.getSessionSummary(id);
    const { data: session } = await supabase.from('cash_sessions').select('initial_balance').eq('id', id).single();
    const initial = Number(session?.initial_balance || 0);
    const calculated = initial + summary.money;

    const { error } = await supabase.from('cash_sessions').update({
      final_balance: Number(finalBalance),
      calculated_balance: Number(calculated),
      status: 'closed',
      closed_at: new Date().toISOString(),
      notes: notes || '',
      user_email: user?.email // Salva/Atualiza email de quem fechou (fallback)
    }).eq('id', id);

    if (error) throw error;
  },

  // FECHAMENTO FORÇADO (ADMIN)
  async forceCloseSession(sessionId: string, userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // 1. Calcula totais atuais para fechar coerentemente
    const summary = await this.getSessionSummary(sessionId);
    const { data: session } = await supabase.from('cash_sessions').select('initial_balance').eq('id', sessionId).single();

    // Se não achar sessão, erro
    if (!session) throw new Error("Sessão não encontrada");

    const initial = Number(session.initial_balance || 0);
    const calculated = initial + summary.money; // Assumindo que calculated é Base + Dinheiro (regra atual)

    // 2. Atualiza para fechado
    // Usa calculated como final_balance para não gerar quebra
    const { error } = await supabase.from('cash_sessions').update({
      final_balance: Number(calculated),
      calculated_balance: Number(calculated),
      status: 'closed',
      closed_at: new Date().toISOString(),
      notes: 'Fechamento administrativo forçado',
      verified_at: new Date().toISOString(), // Já marca como verificado/ciente
      verified_by: user.email
    }).eq('id', sessionId);

    if (error) throw error;
  },

  async verifySession(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { error } = await supabase.from('cash_sessions').update({
      verified_at: new Date().toISOString(),
      verified_by: user.email
    }).eq('id', id);

    if (error) throw error;
  },

  // =================================================================
  // 2. BUSCAR PRODUTOS (MANTIDO DO SEU CÓDIGO ORIGINAL)
  // =================================================================
  async getAllProductsForPOS() {
    // 1. Busca Receitas (Bolos, Doces)
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, name, selling_price, category, barcode')
      .eq('is_base', false);

    if (recipesError) throw recipesError;

    // 2. Busca Produtos de Revenda (Coca, Velas)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, category, barcode')
      .eq('type', 'resale');

    if (productsError) throw productsError;

    // 3. Padroniza Receitas
    const formattedRecipes = (recipes || []).map(r => ({
      id: r.id,
      name: r.name,
      price: Number(r.selling_price),
      category: r.category || 'Sem categoria',
      barcode: r.barcode || null,
      type: 'recipe' as const
    }));

    // 4. Padroniza Produtos de Revenda
    const formattedProducts = (products || []).map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      category: p.category || 'Sem categoria',
      barcode: p.barcode || null,
      type: 'resale' as const
    }));

    // 5. Retorna tudo junto ordenado por nome
    return [...formattedRecipes, ...formattedProducts].sort((a, b) => a.name.localeCompare(b.name));
  },

  // =================================================================
  // 3. PROCESSAMENTO DA VENDA (ATUALIZADO COM BAIXA DE ESTOQUE E DECIMAL)
  // =================================================================
  async processSale(orderData: Omit<Order, 'id' | 'created_at'>, items: OrderItem[]) {
    // A. Busca configurações
    let settings;
    try {
      settings = await SettingsService.get();
    } catch (err) {
      settings = null;
    }

    // Recupera usuário (Removido acidentalmente)
    const user = (await supabase.auth.getUser()).data.user;

    // B. Cálculos Financeiros (USANDO SERVIÇO CENTRALIZADO)
    const { total, fee, net, rateApplied } = FinancialService.calculateTransactionFees(
      orderData.total_amount,
      orderData.payment_method,
      settings
    );

    const feeDec = new Decimal(fee);
    const totalDec = new Decimal(total);
    const netAmountDec = new Decimal(net);

    // C. Preparar Payload para RPC
    const payload = {
      session_id: orderData.session_id,
      customer_id: orderData.customer_id || null,
      total_amount: totalDec.toNumber(),
      discount: Number(orderData.discount || 0),
      change_amount: Number(orderData.change_amount || 0),
      payment_method: orderData.payment_method,
      fee_amount: feeDec.toNumber(),
      net_amount: netAmountDec.toNumber(),
      user_email: user?.email,
      user_id: user?.id
    };

    // D. Preparar Itens para RPC
    const itemsPayload = items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      type: item.type || 'recipe'
    }));

    // E. CHAMADA RPC ATÔMICA
    const { data: orderId, error: rpcError } = await supabase.rpc('process_sale', {
      payload: payload,
      items: itemsPayload
    });

    if (rpcError) throw rpcError;

    // Retorna um objeto compatível com o que a UI espera (pelo menos o ID)
    return { id: orderId };
  },

  // =================================================================
  // 4. RELATÓRIOS (MANTIDO DO SEU CÓDIGO ORIGINAL)
  // =================================================================
  async getSalesReport(startDate: string, endDate: string) {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);
    if (ordersError) throw ordersError;
    const orderIds = orders.map(o => o.id);
    let items: any[] = [];
    if (orderIds.length > 0) {
      const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('*').in('order_id', orderIds);
      if (itemsError) throw itemsError;
      items = orderItems;
    }
    const totalSales = orders.reduce((acc, o) => acc + Number(o.total_amount), 0);
    const totalOrders = orders.length;
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
    const paymentMethods: Record<string, number> = {};
    orders.forEach(o => {
      let method = o.payment_method || 'Outros';
      if (method === 'Cartão') method = 'Crédito';
      paymentMethods[method] = (paymentMethods[method] || 0) + Number(o.total_amount);
    });
    const topProducts: Record<string, { name: string; quantity: number; total: number }> = {};
    items.forEach(i => {
      const id = i.product_id;
      if (!topProducts[id]) topProducts[id] = { name: i.product_name, quantity: 0, total: 0 };
      topProducts[id].quantity += Number(i.quantity);
      topProducts[id].total += Number(i.total_price);
    });
    return {
      summary: { totalSales, totalOrders, averageTicket },
      paymentMethods,
      topProducts: Object.values(topProducts).sort((a, b) => b.quantity - a.quantity).slice(0, 10)
    };
  }
};