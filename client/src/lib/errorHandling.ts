// Comprehensive error handling utilities for the Zipzy application

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends Error {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ServerError extends Error {
  constructor(message: string = 'Server error occurred') {
    super(message);
    this.name = 'ServerError';
  }
}

// Error type detection
export function isNetworkError(error: any): boolean {
  return error instanceof NetworkError || 
         error.name === 'NetworkError' ||
         error.message?.includes('fetch') ||
         error.message?.includes('network') ||
         error.message?.includes('connection');
}

export function isAuthError(error: any): boolean {
  return error instanceof AuthError || 
         error.name === 'AuthError' ||
         error.message?.includes('401') ||
         error.message?.includes('unauthorized') ||
         error.message?.includes('authentication');
}

export function isValidationError(error: any): boolean {
  return error instanceof ValidationError || 
         error.name === 'ValidationError' ||
         error.message?.includes('400') ||
         error.message?.includes('validation') ||
         error.message?.includes('invalid');
}

export function isServerError(error: any): boolean {
  return error instanceof ServerError || 
         error.name === 'ServerError' ||
         error.message?.includes('500') ||
         error.message?.includes('server') ||
         error.message?.includes('internal');
}

// Error message formatting
export function getErrorMessage(error: any): string {
  if (isNetworkError(error)) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }
  
  if (isAuthError(error)) {
    return 'Authentication failed. Please log in again.';
  }
  
  if (isValidationError(error)) {
    return error.message || 'Invalid data provided. Please check your input and try again.';
  }
  
  if (isServerError(error)) {
    return 'Server error occurred. Please try again later.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
}

// Error logging
export function logError(error: any, context?: string) {
  const errorInfo: AppError = {
    code: error.code || 'UNKNOWN',
    message: error.message || 'Unknown error',
    details: error,
    timestamp: new Date()
  };
  
  console.error(`[${context || 'App'}] Error:`, errorInfo);
  
  // In production, you might want to send this to an error tracking service
  if (import.meta.env.PROD) {
    // Example: sendToErrorTrackingService(errorInfo);
  }
}

// Async error wrapper
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(error, context);
    throw error;
  }
}

// Retry mechanism for network requests
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!isNetworkError(error) || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
}

// Error boundary helper
export function createErrorBoundaryHandler(context: string) {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    logError(error, context);
    console.error('Error boundary caught error:', error, errorInfo);
  };
}

// API error handling
export function handleApiError(error: any): AppError {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || `HTTP ${status} error`;
    
    if (status === 401) {
      throw new AuthError(message);
    } else if (status === 400) {
      throw new ValidationError(message);
    } else if (status >= 500) {
      throw new ServerError(message);
    } else {
      throw new Error(message);
    }
  } else if (error.request) {
    // Network error
    throw new NetworkError('Network request failed');
  } else {
    // Other error
    throw error;
  }
}

// Toast error helper
export function showErrorToast(error: any, toast: any) {
  const message = getErrorMessage(error);
  
  toast({
    title: "Error",
    description: message,
    variant: "destructive",
  });
  
  logError(error, 'Toast Error');
}

// Form error handling
export function handleFormError(error: any): string {
  if (isValidationError(error)) {
    return error.message;
  }
  
  if (isAuthError(error)) {
    return 'Please log in again to continue.';
  }
  
  if (isNetworkError(error)) {
    return 'Please check your internet connection and try again.';
  }
  
  return 'An error occurred. Please try again.';
}
