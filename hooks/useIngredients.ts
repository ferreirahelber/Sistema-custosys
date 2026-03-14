import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Ingredient, IngredientPurchase } from '../types';
import { IngredientService } from '../services/ingredientService';
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

export function useIngredientPurchases(ingredientId?: string) {
    const queryClient = useQueryClient();

    const { data: purchases = [], isLoading } = useQuery({
        queryKey: ['ingredient-purchases', ingredientId],
        queryFn: async () => {
            if (!ingredientId) return [];
            return IngredientService.getPurchases(ingredientId);
        },
        enabled: !!ingredientId
    });

    const addPurchaseMutation = useMutation({
        mutationFn: async (purchase: Omit<IngredientPurchase, 'id' | 'created_at'>) => {
            return IngredientService.addPurchase(purchase);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredient-purchases', ingredientId] });
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast.success('Compra registrada com sucesso!');
        },
        onError: (err: any) => {
            console.error(err);
            toast.error(err.message || 'Erro ao registrar compra');
        }
    });

    return {
        purchases,
        loading: isLoading,
        addPurchase: addPurchaseMutation.mutateAsync,
        isAdding: addPurchaseMutation.isPending
    };
}

export function usePurchaseSuggestions() {
    const queryClient = useQueryClient();

    const { data: suggestions = { brands: [] as string[], suppliers: [] as string[] } } = useQuery({
        queryKey: ['purchase-suggestions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ingredient_purchases')
                .select('brand, supplier');
            if (error) throw error;
            
            const brands = Array.from(new Set(data.map(d => d.brand).filter(Boolean)));
            const suppliers = Array.from(new Set(data.map(d => d.supplier).filter(Boolean)));
            
            return { brands, suppliers };
        }
    });

    const renameBrandMutation = useMutation({
        mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) => 
            IngredientService.renameBrand(oldName, newName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-suggestions'] });
            queryClient.invalidateQueries({ queryKey: ['ingredient-purchases'] });
            toast.success('Marca atualizada em todo o histórico!');
        },
        onError: (err) => toast.error('Erro ao renomear marca.')
    });

    const renameSupplierMutation = useMutation({
        mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) => 
            IngredientService.renameSupplier(oldName, newName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-suggestions'] });
            queryClient.invalidateQueries({ queryKey: ['ingredient-purchases'] });
            toast.success('Fornecedor atualizado em todo o histórico!');
        },
        onError: (err) => toast.error('Erro ao renomear fornecedor.')
    });

    return {
        ...suggestions,
        renameBrand: renameBrandMutation.mutateAsync,
        renameSupplier: renameSupplierMutation.mutateAsync
    };
}
