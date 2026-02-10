import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoryService } from '../services/categoryService';
import { SettingsService } from '../services/settingsService';
import { TeamService, TeamMember } from '../services/teamService';
import { FixedCostService } from '../services/fixedCostService';
import { Settings, Category, FixedCost } from '../types';
import { toast } from 'sonner';

export const useCategories = () => {
    return useQuery({
        queryKey: ['categories'],
        queryFn: CategoryService.getAll,
    });
};

export const useCategoryMutations = () => {
    const queryClient = useQueryClient();

    const createCategory = useMutation({
        mutationFn: async (name: string) => {
            await CategoryService.create(name);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Categoria criada com sucesso!');
        },
        onError: () => {
            toast.error('Erro ao criar categoria.');
        }
    });

    const updateCategory = useMutation({
        mutationFn: async ({ id, name }: { id: number; name: string }) => {
            await CategoryService.update(id, name);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            // Categories affect products and recipes, so we might want to invalidate them too if they fetch derived data
            // But for now, basic invalidation is key.
            queryClient.invalidateQueries({ queryKey: ['recipes'] });
            toast.success('Categoria atualizada com sucesso!');
        },
        onError: () => {
            toast.error('Erro ao atualizar categoria.');
        }
    });

    const deleteCategory = useMutation({
        mutationFn: async ({ id, name }: { id: number; name: string }) => {
            await CategoryService.delete(id, name);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Categoria excluída com sucesso!');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao excluir categoria.');
        }
    });

    return { createCategory, updateCategory, deleteCategory };
};

export const useSettings = () => {
    return useQuery({
        queryKey: ['settings'],
        queryFn: () => SettingsService.get(),
    });
};

export const useSettingsMutations = () => {
    const queryClient = useQueryClient();

    const updateSettings = useMutation({
        mutationFn: async (settings: Settings) => {
            await SettingsService.save(settings);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            toast.success('Configurações salvas!');
        },
        onError: () => {
            toast.error('Erro ao salvar configurações.');
        }
    });

    return { updateSettings };
};

export const useTeam = () => {
    return useQuery({
        queryKey: ['team'],
        queryFn: () => TeamService.getAll(),
    });
};

export const useTeamMutations = () => {
    const queryClient = useQueryClient();

    const addMember = useMutation({
        mutationFn: async (member: Omit<TeamMember, 'id'>) => {
            await TeamService.add(member);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team'] });
            toast.success('Colaborador adicionado!');
        },
        onError: () => {
            toast.error('Erro ao adicionar colaborador.');
        }
    });

    const updateMember = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<TeamMember> }) => {
            await TeamService.update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team'] });
            toast.success('Colaborador atualizado!');
        },
        onError: () => {
            toast.error('Erro ao atualizar colaborador.');
        }
    });

    const deleteMember = useMutation({
        mutationFn: async (id: string) => {
            await TeamService.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team'] });
            toast.success('Colaborador removido!');
        },
        onError: () => {
            toast.error('Erro ao remover colaborador.');
        }
    });

    return { addMember, updateMember, deleteMember };
};

export const useFixedCosts = () => {
    return useQuery({
        queryKey: ['fixed-costs'],
        queryFn: () => FixedCostService.getAll(),
    });
};

export const useFixedCostMutations = () => {
    const queryClient = useQueryClient();

    const addFixedCost = useMutation({
        mutationFn: async (cost: FixedCost) => {
            await FixedCostService.add(cost);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixed-costs'] });
            toast.success('Custo fixo adicionado!');
        },
        onError: () => {
            toast.error('Erro ao adicionar custo fixo.');
        }
    });

    const removeFixedCost = useMutation({
        mutationFn: async (id: string) => {
            await FixedCostService.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fixed-costs'] });
            toast.success('Custo fixo removido!');
        },
        onError: () => {
            toast.error('Erro ao remover custo fixo.');
        }
    });

    return { addFixedCost, removeFixedCost };
};
