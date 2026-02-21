import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RecipeService } from '../services/recipeService';
import { Recipe } from '../types';
import { toast } from 'sonner';

export const useRecipes = () => {
    return useQuery({
        queryKey: ['recipes'],
        queryFn: RecipeService.getAll,
    });
};

export const useRecipe = (id: string | undefined) => {
    return useQuery({
        queryKey: ['recipe', id],
        queryFn: () => RecipeService.getById(id!),
        enabled: !!id,
    });
};

export const useRecipeMutations = () => {
    const queryClient = useQueryClient();

    const createRecipe = useMutation({
        mutationFn: (recipe: Recipe) => RecipeService.save(recipe),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] });
            toast.success('Receita criada com sucesso!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Erro ao criar receita.');
        }
    });

    const updateRecipe = useMutation({
        mutationFn: (recipe: Recipe) => RecipeService.save(recipe),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] });
            queryClient.invalidateQueries({ queryKey: ['recipe', variables.id] });
            toast.success('Receita atualizada com sucesso!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Erro ao atualizar receita.');
        }
    });

    const deleteRecipe = useMutation({
        mutationFn: (id: string) => RecipeService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] });
            toast.success('Receita excluída com sucesso!');
        },
        onError: (error: any) => {
            console.error(error);
            toast.error(error.message || 'Erro ao excluir receita.');
        }
    });

    return { createRecipe, updateRecipe, deleteRecipe };
};

// Deprecated: useRecipeMutations instead
export const useSaveRecipe = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (recipe: Recipe) => RecipeService.save(recipe),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] });
            queryClient.invalidateQueries({ queryKey: ['recipe'] });
            toast.success('Receita salva com sucesso!');
        },
        onError: (error) => {
            console.error(error);
            toast.error('Erro ao salvar receita.');
        }
    });
};
