import { useQuery } from "@tanstack/react-query";
import type { User } from "@/types/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: response, isLoading, error, refetch } = useQuery<{ success: boolean; user: User }>({
    queryKey: ["/api/auth/user"],
    queryFn: async ({ queryKey }) => {
      console.log('🔍 useAuth: Fetching user data...');
      const res = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      
      console.log('🔍 useAuth: Response status:', res.status);
      
      if (res.status === 401) {
        console.log('🔍 useAuth: 401 - User not authenticated');
        return null;
      }
      
      if (!res.ok) {
        console.log('🔍 useAuth: Error response:', res.status, res.statusText);
        throw new Error('Failed to fetch user');
      }
      
      const data = await res.json();
      console.log('🔍 useAuth: Success response:', data);
      return data;
    },
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const user = response?.user;
  
  console.log('🔍 useAuth: Current state:', { 
    response, 
    user, 
    isLoading, 
    error,
    hasUser: !!user,
    responseType: typeof response,
    responseKeys: response ? Object.keys(response) : 'null'
  });

  console.log('useAuth hook:', { 
    user, 
    isLoading, 
    error, 
    isAuthenticated: !!user,
    hasUser: !!user,
    userData: user 
  });

  // Add a manual refetch function for debugging
  const manualRefetch = async () => {
    console.log('Manual refetch triggered');
    const result = await refetch();
    console.log('Manual refetch result:', result);
  };

  // Expose manual refetch for debugging
  if (typeof window !== 'undefined') {
    (window as any).manualAuthRefetch = manualRefetch;
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch: manualRefetch,
  };
}
