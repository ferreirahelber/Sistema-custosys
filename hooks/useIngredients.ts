import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Ingredient } from '../types';
import { toast } from 'sonner';

export function useIngredients() {
    const queryClient = useQueryClient();

    // 1. Fetch com Cache
    const { data: ingredients = [], isLoading, error } = useQuery({
        queryKey: ['ingredients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ingredients')
                .select('*')
                .order('name');
            if (error) throw error;
            return data as Ingredient[];
        }
    });

    // 2. Mutations (Criação, Edição, Deleção)
    const createMutation = useMutation({
        mutationFn: async (ingredient: Omit<Ingredient, 'id'>) => {
            const { data, error } = await supabase.from('ingredients').insert([ingredient]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast.success('Ingrediente criado!');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Erro ao criar ingrediente');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Ingredient> }) => {
            const { data, error } = await supabase.from('ingredients').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast.success('Ingrediente atualizado!');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Erro ao atualizar ingrediente');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('ingredients').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast.success('Item excluído!');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Erro ao excluir');
        }
    });

    return {
        ingredients,
        loading: isLoading,
        error,
        createIngredient: createMutation.mutateAsync,
        updateIngredient: (id: string, updates: Partial<Ingredient>) => updateMutation.mutateAsync({ id, updates }),
        deleteIngredient: deleteMutation.mutateAsync
    };
}
