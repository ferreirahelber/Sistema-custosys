import { supabase } from './supabase';
import { CashSession, Order, OrderItem } from '../types';
import { SettingsService } from './settingsService';

export const PosService = {
  // === CONTROLE DE CAIXA (MANTIDO IGUAL) ===
  async getCurrentSession() {
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as CashSession | null;
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
    const { data, error } = await supabase.from('cash_sessions').select('*').eq('status', 'closed').order('closed_at', { ascending: false }).limit(20);
    if (error) throw error;
    return data as CashSession[];
  },

  async openSession(initialBalance: number) {
    const current = await this.getCurrentSession();
    if (current) return current;
    const { data, error } = await supabase.from('cash_sessions').insert([{ initial_balance: initialBalance, status: 'open', opened_at: new Date().toISOString() }]).select().single();
    if (error) throw error;
    return data as CashSession;
  },

  async closeSession(id: string, finalBalance: number, notes: string) {
    const summary = await this.getSessionSummary(id);
    const { data: session } = await supabase.from('cash_sessions').select('initial_balance').eq('id', id).single();
    const initial = Number(session?.initial_balance || 0);
    const calculated = initial + summary.money;
    const { error } = await supabase.from('cash_sessions').update({ final_balance: Number(finalBalance), calculated_balance: Number(calculated), status: 'closed', closed_at: new Date().toISOString(), notes: notes || '' }).eq('id', id);
    if (error) throw error;
  },

  // === NOVA FUNÇÃO: BUSCAR TUDO (RECEITAS + REVENDA) ===
  async getAllProductsForPOS() {
    // 1. Busca Receitas (Bolos, Doces)
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, name, selling_price');
    
    if (recipesError) throw recipesError;

    // 2. Busca Produtos de Revenda (Coca, Velas)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('type', 'resale'); // Garante que é revenda

    if (productsError) throw productsError;

    // 3. Padroniza e Junta as listas
    const formattedRecipes = (recipes || []).map(r => ({
      id: r.id,
      name: r.name,
      price: Number(r.selling_price),
      type: 'recipe'
    }));

    const formattedProducts = (products || []).map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      type: 'resale' // Marca como revenda (útil se quiser por ícones diferentes no futuro)
    }));

    // Retorna tudo junto ordenado por nome
    return [...formattedRecipes, ...formattedProducts].sort((a, b) => a.name.localeCompare(b.name));
  },

  // === PROCESSAMENTO DA VENDA (MANTIDO IGUAL) ===
  async processSale(order: Omit<Order, 'id' | 'created_at'>, items: OrderItem[]) {
    // 1. Busca configurações
    let settings;
    try {
      settings = await SettingsService.get();
    } catch (err) {
      settings = null;
    }
    
    // Taxas padrão caso falhe
    const debitRate = settings?.card_debit_rate ?? 1.60;
    const creditRate = settings?.card_credit_rate ?? 4.39;
    
    let fee = 0;
    const total = Number(order.total_amount);
    const method = (order.payment_method || '').toLowerCase();

    // 2. Calcula Taxa
    if (method.includes('débito') || method.includes('debito')) {
      fee = total * (debitRate / 100);
    } 
    else if (method.includes('crédito') || method.includes('credito')) {
      fee = total * (creditRate / 100);
    }

    fee = Number(fee.toFixed(2));
    const netAmount = Number((total - fee).toFixed(2));

    // 3. Salva PEDIDO
    const cleanOrderPayload = {
      session_id: order.session_id,
      customer_id: order.customer_id || null,
      total_amount: total,
      discount: order.discount || 0,
      change_amount: order.change_amount || 0,
      payment_method: order.payment_method,
      status: 'completed',
      fee_amount: fee,       
      net_amount: netAmount 
    };

    const { data: newOrder, error: orderError } = await supabase.from('orders').insert([cleanOrderPayload]).select().single();
    if (orderError) throw orderError;

    // 4. Salva ITENS
    const itemsWithOrderId = items.map(item => ({
      order_id: newOrder.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      type: item.type || 'recipe' 
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId);
    if (itemsError) throw itemsError;

    // 5. Salva FINANCEIRO
    const salePayload = {
      description: `PDV #${newOrder.id.substring(0,6)}`,
      amount: total,          
      fee_amount: fee,        
      net_amount: netAmount,  
      category: 'Venda PDV',
      payment_method: order.payment_method,
      date: new Date().toISOString().split('T')[0]
    };

    const { error: salesError } = await supabase.from('sales').insert([salePayload]);
    if (salesError) {
       console.error("Erro ao salvar financeiro", salesError);
       // Tenta salvar sem as colunas novas caso elas não existam (fallback)
       await supabase.from('sales').insert([{
          description: `PDV #${newOrder.id.substring(0,6)}`,
          amount: total,
          category: 'Venda PDV',
          payment_method: order.payment_method,
          date: new Date().toISOString().split('T')[0]
       }]);
    }

    return newOrder;
  },

  // === RELATÓRIOS (MANTIDO IGUAL) ===
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