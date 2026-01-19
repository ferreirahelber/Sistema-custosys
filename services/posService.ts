import { supabase } from './supabase';
import { CashSession, Order, OrderItem } from '../types';

export const PosService = {
    // === CONTROLE DE CAIXA ===

    async getCurrentSession() {
        // CORREÇÃO: Usamos .order().limit(1).maybeSingle() em vez de .single()
        // Isso previne o erro 406 se houver mais de uma sessão aberta por engano
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

    async openSession(initialBalance: number) {
        // Segurança extra: Verifica se já não tem uma aberta antes de abrir outra
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
        // 1. Calcular vendas para auditoria
        const { data: orders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('session_id', id);

        const totalSales = orders?.reduce((acc, o) => acc + Number(o.total_amount), 0) || 0;

        // Buscar saldo inicial
        const { data: session } = await supabase
            .from('cash_sessions')
            .select('initial_balance')
            .eq('id', id)
            .single();

        const initial = Number(session?.initial_balance || 0);
        const calculated = initial + totalSales;

        // 2. Atualizar fechamento (Forçando tipos numéricos)
        const { error } = await supabase
            .from('cash_sessions')
            .update({
                final_balance: Number(finalBalance),       // Garante que é número
                calculated_balance: Number(calculated),    // Garante que é número
                status: 'closed',
                closed_at: new Date().toISOString(),
                notes: notes || ''                         // Garante que não é null
            })
            .eq('id', id);

        if (error) throw error;
    },

    // === VENDAS ===

    async processSale(order: Omit<Order, 'id' | 'created_at'>, items: OrderItem[]) {
        // CORREÇÃO: Montamos um objeto limpo APENAS com campos que existem no banco.
        // Isso evita o erro 400 caso o objeto 'order' tenha propriedades extras (ex: customer_name).
        const cleanOrderPayload = {
            session_id: order.session_id,
            customer_id: order.customer_id || null, // Garante null se for undefined
            total_amount: order.total_amount,
            discount: order.discount || 0,
            change_amount: order.change_amount || 0,
            payment_method: order.payment_method,
            status: 'completed'
        };

        // 1. Criar o Pedido
        const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert([cleanOrderPayload])
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Inserir Itens
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

        // 3. Atualizar Estoque (Produtos de Revenda)
        for (const item of items) {
            if (item.type === 'product') {
                const { data: ingredient } = await supabase
                    .from('ingredients')
                    .select('current_stock') // Usando current_stock conforme sua estrutura
                    .eq('id', item.product_id)
                    .single();

                if (ingredient) {
                    const currentStock = Number(ingredient.current_stock || 0); // Proteção contra null
                    const newStock = currentStock - Number(item.quantity);

                    await supabase
                        .from('ingredients')
                        .update({ current_stock: newStock })
                        .eq('id', item.product_id);
                }
            }
        }

        // 4. Integrar com Dashboard Financeiro
        await supabase.from('sales').insert([{
            description: `PDV #${newOrder.id.substring(0, 6)}`,
            amount: order.total_amount,
            category: 'Venda PDV',
            date: new Date().toISOString().split('T')[0]
        }]);

        return newOrder;
    }
};