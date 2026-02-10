import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Sale, Expense, FixedCost } from '../types';
import { toast } from 'sonner';

// --- SALES ---
export const useSales = () => {
    return useQuery({
        queryKey: ['sales'],
        queryFn: async () => {
            const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data as Sale[];
        }
    });
};

export const useSaleMutations = () => {
    const queryClient = useQueryClient();

    const createSale = useMutation({
        mutationFn: async (sale: Omit<Sale, 'id' | 'created_at'>) => {
            const { data, error } = await supabase.from('sales').insert([sale]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            // Toast will be handled in the component for more control if needed, or here generic.
            // Keeping it generic here is good.
        }
    });

    const deleteSale = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('sales').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            toast.success('Venda removida!');
        },
        onError: () => {
            toast.error('Erro ao remover venda.');
        }
    });

    return { createSale, deleteSale };
};

// --- EXPENSES ---
export const useExpenses = () => {
    return useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
            if (error) throw error;
            return data as Expense[];
        }
    });
};

export const useExpenseMutations = () => {
    const queryClient = useQueryClient();

    const createExpense = useMutation({
        mutationFn: async (expense: Omit<Expense, 'id' | 'created_at'>) => {
            const { data, error } = await supabase.from('expenses').insert([expense]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        }
    });

    const deleteExpense = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success('Despesa removida!');
        },
        onError: () => {
            toast.error('Erro ao remover despesa.');
        }
    });

    return { createExpense, deleteExpense };
};

// --- FIXED COSTS ---
export const useFixedCosts = () => {
    return useQuery({
        queryKey: ['fixed_costs'],
        queryFn: async () => {
            const { data, error } = await supabase.from('fixed_costs').select('*');
            if (error) throw error;
            return data as FixedCost[];
        }
    });
};

export const useFixedCostMutations = () => {
    const queryClient = useQueryClient();

    const createFixedCost = useMutation({
        mutationFn: async (cost: Omit<FixedCost, 'id' | 'created_at'>) => {
            const { data, error } = await supabase.from('fixed_costs').insert([cost]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixed_costs'] });
            toast.success('Custo fixo salvo!');
        }
    });

    const updateFixedCost = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<FixedCost> }) => {
            const { data, error } = await supabase.from('fixed_costs').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixed_costs'] });
            toast.success('Custo fixo atualizado!');
        }
    });

    const deleteFixedCost = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('fixed_costs').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixed_costs'] });
            toast.success('Custo fixo removido!');
        }
    });

    return { createFixedCost, updateFixedCost, deleteFixedCost };
};
