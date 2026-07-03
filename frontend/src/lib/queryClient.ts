import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
            refetchOnWindowFocus: false,
            networkMode: 'online',
        },
    },
});
