import { logError } from './errorHandling';

// Global error handler for unhandled errors
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    logError(event.reason, 'Unhandled Promise Rejection');
    
    // Prevent the default browser behavior
    event.preventDefault();
  });

  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
    logError(event.error, 'Unhandled Error');
    
    // Prevent the default browser behavior
    event.preventDefault();
  });

  // Handle console errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Call the original console.error
    originalConsoleError.apply(console, args);
    
    // Log to our error tracking
    if (args.length > 0 && args[0] instanceof Error) {
      logError(args[0], 'Console Error');
    }
  };

  // Handle network status changes
  window.addEventListener('online', () => {
    console.log('Network connection restored');
  });

  window.addEventListener('offline', () => {
    console.warn('Network connection lost');
    logError(new Error('Network connection lost'), 'Network Status');
  });

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('Page hidden');
    } else {
      console.log('Page visible');
    }
  });
}

// Error reporting to external service (example)
export function reportErrorToService(error: any, context?: string) {
  // In a real application, you would send this to an error tracking service
  // like Sentry, LogRocket, or Bugsnag
  
  const errorReport = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Example: send to error tracking service
  // fetch('/api/error-reporting', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(errorReport)
  // }).catch(console.error);

  console.log('Error report:', errorReport);
}

// Performance monitoring
export function setupPerformanceMonitoring() {
  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) { // Tasks longer than 50ms
          console.warn('Long task detected:', entry);
          logError(new Error(`Long task: ${entry.name} (${entry.duration}ms)`), 'Performance');
        }
      }
    });
    
    observer.observe({ entryTypes: ['longtask'] });
  }

  // Monitor memory usage
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        console.warn('High memory usage detected');
        logError(new Error('High memory usage'), 'Performance');
      }
    }, 30000); // Check every 30 seconds
  }
}

// Initialize global error handling
export function initializeErrorHandling() {
  setupGlobalErrorHandling();
  setupPerformanceMonitoring();
  
  console.log('Global error handling initialized');
}
