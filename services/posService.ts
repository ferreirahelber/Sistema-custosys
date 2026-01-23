import { supabase } from './supabase';
import { CashSession, Order, OrderItem, CartItem } from '../types';
import { SettingsService } from './settingsService';
import Decimal from 'decimal.js';

export const PosService = {
  // =================================================================
  // 1. CONTROLE DE CAIXA (MANTIDO DO SEU CÓDIGO ORIGINAL)
  // =================================================================
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

  // =================================================================
  // 2. BUSCAR PRODUTOS (MANTIDO DO SEU CÓDIGO ORIGINAL)
  // =================================================================
  async getAllProductsForPOS() {
    // 1. Busca Receitas (Bolos, Doces)
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, name, selling_price, category, barcode');
    
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
    
    // B. Cálculos Financeiros (USANDO DECIMAL.JS PARA PRECISÃO)
    const totalDec = new Decimal(orderData.total_amount || 0);
    const method = (orderData.payment_method || '').toLowerCase();
    
    const debitRate = new Decimal(settings?.card_debit_rate ?? 1.60);
    const creditRate = new Decimal(settings?.card_credit_rate ?? 4.39);
    
    let feeDec = new Decimal(0);

    // Calcula Taxa
    if (method.includes('débito') || method.includes('debito')) {
      feeDec = totalDec.times(debitRate.dividedBy(100));
    } 
    else if (method.includes('crédito') || method.includes('credito')) {
      feeDec = totalDec.times(creditRate.dividedBy(100));
    }

    const netAmountDec = totalDec.minus(feeDec);

    // C. Salva PEDIDO (Order)
    const cleanOrderPayload = {
      session_id: orderData.session_id,
      customer_id: orderData.customer_id || null,
      total_amount: totalDec.toNumber(),
      discount: Number(orderData.discount || 0),
      change_amount: Number(orderData.change_amount || 0),
      payment_method: orderData.payment_method,
      status: 'completed',
      fee_amount: feeDec.toNumber(),       
      net_amount: netAmountDec.toNumber() 
    };

    const { data: newOrder, error: orderError } = await supabase.from('orders').insert([cleanOrderPayload]).select().single();
    if (orderError) throw orderError;

    // D. Salva ITENS DO PEDIDO
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

    // =================================================================
    // E. BAIXA DE ESTOQUE (A GRANDE MELHORIA)
    // =================================================================
    for (const item of items) {
      if (item.type === 'recipe') {
        // Se for receita, baixa os ingredientes
        const { data: recipeIngredients } = await supabase
          .from('recipe_items')
          .select('ingredient_id, quantity')
          .eq('recipe_id', item.product_id);

        if (recipeIngredients) {
          for (const ri of recipeIngredients) {
            if (ri.ingredient_id) {
              const qtyToDeduct = new Decimal(ri.quantity).times(item.quantity);

              // Busca estoque atual
              const { data: currentIng } = await supabase
                .from('ingredients')
                .select('current_stock')
                .eq('id', ri.ingredient_id)
                .single();

              if (currentIng) {
                const currentStock = new Decimal(currentIng.current_stock || 0);
                const newStock = currentStock.minus(qtyToDeduct);

                // Atualiza ingrediente
                await supabase
                  .from('ingredients')
                  .update({ current_stock: newStock.toNumber() })
                  .eq('id', ri.ingredient_id);
              }
            }
          }
        }
      } 
      // Opcional: Se você controla estoque de revenda na tabela 'products', adicione lógica aqui
    }

    // F. Salva FINANCEIRO (Mantém compatibilidade com seu Dashboard atual)
    const salePayload = {
      user_id: (await supabase.auth.getUser()).data.user?.id, // Garante user_id
      description: `PDV #${newOrder.id.substring(0,6)}`,
      amount: totalDec.toNumber(),          
      fee_amount: feeDec.toNumber(),        
      net_amount: netAmountDec.toNumber(),  
      category: 'Venda PDV',
      payment_method: orderData.payment_method,
      date: new Date().toISOString().split('T')[0]
    };

    const { error: salesError } = await supabase.from('sales').insert([salePayload]);
    if (salesError) {
       console.error("Erro ao salvar financeiro (sales)", salesError);
    }
    
    // G. Opcional: Salvar Taxa na tabela expenses (para ficar perfeito)
    if (feeDec.greaterThan(0)) {
       await supabase.from('expenses').insert({
         user_id: (await supabase.auth.getUser()).data.user?.id,
         description: `Taxa Cartão - Pedido #${newOrder.id.slice(0, 8)}`,
         amount: feeDec.toNumber(),
         category: 'Taxas Financeiras',
         date: new Date().toISOString(),
       });
    }

    return newOrder;
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