import { supabase } from './supabase';
import { CashSession, Order, OrderItem } from '../types';

export const PosService = {
    // === CONTROLE DE CAIXA ===

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

    // NOVO: Busca o resumo financeiro para o fechamento
    async getSessionSummary(sessionId: string) {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('total_amount, payment_method')
            .eq('session_id', sessionId)
            .eq('status', 'completed');

        if (error) throw error;

        const summary = {
            money: 0,
            pix: 0,
            debit: 0,
            credit: 0,
            total: 0
        };

        orders?.forEach(order => {
            const value = Number(order.total_amount) || 0;
            // Normaliza o texto (tudo minúsculo, sem espaços extras)
            const method = (order.payment_method || '').toLowerCase().trim();

            summary.total += value;

            // Verificação robusta (aceita variações)
            if (method.includes('dinheiro')) {
                summary.money += value;
            } else if (method.includes('pix')) {
                summary.pix += value;
            } else if (method.includes('débito') || method.includes('debito')) {
                summary.debit += value;
            } else if (method.includes('crédito') || method.includes('credito') || method.includes('cartão')) {
                // Se for antigo 'cartão' cai como crédito por padrão ou soma aqui
                summary.credit += value;
            }
        });

        return summary;
    },

    // NOVO: Busca histórico de sessões fechadas
    async getSessionHistory() {
        const { data, error } = await supabase
            .from('cash_sessions')
            .select('*')
            .eq('status', 'closed')
            .order('closed_at', { ascending: false })
            .limit(20); // Traz os últimos 20 caixas

        if (error) throw error;
        return data as CashSession[];
    },

    async openSession(initialBalance: number) {
        const current = await this.getCurrentSession();
        if (current) return current;

        const { data, error } = await supabase
            .from('cash_sessions')
            .insert([{
                initial_balance: initialBalance,
                status: 'open',
                opened_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return data as CashSession;
    },

    async closeSession(id: string, finalBalance: number, notes: string) {
        // Busca o resumo para gravar os valores finais calculados
        const summary = await this.getSessionSummary(id);

        const { data: session } = await supabase
            .from('cash_sessions')
            .select('initial_balance')
            .eq('id', id)
            .single();

        const initial = Number(session?.initial_balance || 0);
        const calculated = initial + summary.money; // O sistema espera: Fundo + Vendas em Dinheiro

        const { error } = await supabase
            .from('cash_sessions')
            .update({
                final_balance: Number(finalBalance),
                calculated_balance: Number(calculated),
                status: 'closed',
                closed_at: new Date().toISOString(),
                notes: notes || ''
            })
            .eq('id', id);

        if (error) throw error;
    },

    // === VENDAS (Mantido igual) ===
    async processSale(order: Omit<Order, 'id' | 'created_at'>, items: OrderItem[]) {
        const cleanOrderPayload = {
            session_id: order.session_id,
            customer_id: order.customer_id || null,
            total_amount: order.total_amount,
            discount: order.discount || 0,
            change_amount: order.change_amount || 0,
            payment_method: order.payment_method,
            status: 'completed'
        };

        const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert([cleanOrderPayload])
            .select()
            .single();

        if (orderError) throw orderError;

        const itemsWithOrderId = items.map(item => ({
            order_id: newOrder.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            type: item.type
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsWithOrderId);

        if (itemsError) throw itemsError;

        // Dashboard integration (Simplificado)
        await supabase.from('sales').insert([{
            description: `PDV #${newOrder.id.substring(0, 6)}`,
            amount: order.total_amount,
            category: 'Venda PDV',
            date: new Date().toISOString().split('T')[0]
        }]);

        return newOrder;
    },

    // === RELATÓRIOS ===
    async getSalesReport(startDate: string, endDate: string) {
        // 1. Buscar Pedidos
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'completed')
            .gte('created_at', `${startDate}T00:00:00`)
            .lte('created_at', `${endDate}T23:59:59`);

        if (ordersError) throw ordersError;

        // 2. Buscar Itens
        const orderIds = orders.map(o => o.id);
        let items: any[] = [];

        if (orderIds.length > 0) {
            const { data: orderItems, error: itemsError } = await supabase
                .from('order_items')
                .select('*')
                .in('order_id', orderIds);

            if (itemsError) throw itemsError;
            items = orderItems;
        }

        // 3. Processar Totais
        const totalSales = orders.reduce((acc, o) => acc + Number(o.total_amount), 0);
        const totalOrders = orders.length;
        const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

        // 4. Processar Formas de Pagamento (COM CORREÇÃO DE LEGADO)
        const paymentMethods: Record<string, number> = {};
        orders.forEach(o => {
            let method = o.payment_method || 'Outros';

            // TRUQUE: Se encontrar "Cartão" (antigo), soma como "Crédito" para não duplicar no gráfico
            if (method === 'Cartão') {
                method = 'Crédito';
            }

            paymentMethods[method] = (paymentMethods[method] || 0) + Number(o.total_amount);
        });

        // 5. Processar Produtos Mais Vendidos
        const topProducts: Record<string, { name: string; quantity: number; total: number }> = {};
        items.forEach(i => {
            const id = i.product_id;
            if (!topProducts[id]) {
                topProducts[id] = { name: i.product_name, quantity: 0, total: 0 };
            }
            topProducts[id].quantity += Number(i.quantity);
            topProducts[id].total += Number(i.total_price);
        });

        const topProductsArray = Object.values(topProducts)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        return {
            summary: {
                totalSales,
                totalOrders,
                averageTicket
            },
            paymentMethods,
            topProducts: topProductsArray
        };
    }
};