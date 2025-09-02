import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import type { User } from "@/types/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: response, isLoading, error, refetch } = useQuery<{ success: boolean; user: User }>({
    queryKey: ["/api/auth/user"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      
      if (res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        throw new Error('Failed to fetch user');
      }
      
      const data = await res.json();
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false, // Disabled to prevent infinite refetching
    staleTime: 300000, // Data is fresh for 5 minutes (increased)
    refetchInterval: 600000, // Only refetch every 10 minutes (increased)
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    refetchOnReconnect: false, // Don't refetch on reconnect
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const user = useMemo(() => response?.user, [response?.user]);
  
  // Only log in development and when there are errors
  if (process.env.NODE_ENV === 'development' && error) {
    console.log('🔍 useAuth: Error state:', { error, isLoading });
  }

  // Add a manual refetch function for debugging
  const manualRefetch = useCallback(async () => {
    console.log('Manual refetch triggered');
    const result = await refetch();
    console.log('Manual refetch result:', result);
  }, [refetch]);

  // Expose manual refetch for debugging
  if (typeof window !== 'undefined') {
    (window as any).manualAuthRefetch = manualRefetch;
  }

  const result = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch: manualRefetch,
  }), [user, isLoading, manualRefetch]);

  return result;
}
