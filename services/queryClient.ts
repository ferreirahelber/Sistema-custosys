import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos
            gcTime: 1000 * 60 * 30, // 30 minutos (antigo cacheTime)
            refetchOnWindowFocus: false, // Evita refetch excessivo em produção
            retry: 1, // Tenta apenas 1 vez em caso de erro
        },
    },
});
