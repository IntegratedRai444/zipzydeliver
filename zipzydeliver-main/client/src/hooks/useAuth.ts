import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
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
