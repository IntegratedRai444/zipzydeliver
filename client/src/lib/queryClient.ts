import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { NetworkError, AuthError, ValidationError, ServerError, logError } from "./errorHandling";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const errorMessage = `${res.status}: ${text}`;
    
    // Log the error for debugging
    logError(new Error(errorMessage), 'API Request');
    
    // Throw appropriate error type based on status code
    if (res.status === 401) {
      throw new AuthError(text);
    } else if (res.status === 400) {
      throw new ValidationError(text);
    } else if (res.status >= 500) {
      throw new ServerError(text);
    } else {
      throw new Error(errorMessage);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res.json();
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError('Network connection failed');
    }
    
    // Re-throw other errors
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL from queryKey parts. Support trailing params object.
    const parts = queryKey as unknown as Array<string | Record<string, string>>;
    const nonObjectParts: string[] = parts.filter((p) => typeof p === 'string') as string[];
    let url = nonObjectParts.join("/");

    const maybeParams = parts.find((p) => typeof p === 'object' && p !== null) as Record<string, string> | undefined;
    if (maybeParams && Object.keys(maybeParams).length > 0) {
      const qs = new URLSearchParams(maybeParams).toString();
      url += `?${qs}`;
    }

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Allow refetching when data is stale
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
