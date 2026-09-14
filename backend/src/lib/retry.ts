import logger from './logger.js';
import { apm } from './apm.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: RegExp[];
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

const defaultRetryOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /ECONNRESET/,
    /ENOTFOUND/,
    /EAI_AGAIN/,
    /5\d\d/, // HTTP 5xx errors
    /timeout/i,
    /network/i,
    /connection/i,
  ],
  onRetry: () => {},
  shouldRetry: () => true,
};

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...defaultRetryOptions, ...options };
  const startTime = Date.now();
  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt < opts.maxAttempts) {
    attempt++;
    
    try {
      const result = await operation();
      
      const duration = Date.now() - startTime;
      
      if (attempt > 1) {
        logger.info(`Operation succeeded after ${attempt} attempts (${duration}ms total)`);
      }
      
      return {
        success: true,
        data: result,
        attempts: attempt,
        totalDuration: duration,
      };
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry this error
      const isRetryable = opts.shouldRetry(lastError) || 
        opts.retryableErrors.some(pattern => pattern.test(lastError!.message));
      
      if (!isRetryable || attempt >= opts.maxAttempts) {
        const duration = Date.now() - startTime;
        logger.error(`Operation failed after ${attempt} attempts: ${lastError.message}`);
        
        // Track error in APM
        apm.trackError('retry_failure', 'high');
        
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalDuration: duration,
        };
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );
      
      logger.warn(`Attempt ${attempt} failed: ${lastError.message}. Retrying in ${delay}ms...`);
      
      // Call onRetry callback
      opts.onRetry(attempt, lastError);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript needs it
  return {
    success: false,
    error: lastError,
    attempts: attempt,
    totalDuration: Date.now() - startTime,
  };
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly name: string = 'default'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        logger.info(`Circuit breaker '${this.name}' transitioning to half-open`);
      } else {
        throw new Error(`Circuit breaker '${this.name}' is open`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
      logger.info(`Circuit breaker '${this.name}' closed`);
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      logger.error(`Circuit breaker '${this.name}' opened after ${this.failureCount} failures`);
      apm.trackError('circuit_breaker_open', 'high');
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset() {
    this.failureCount = 0;
    this.state = 'closed';
    logger.info(`Circuit breaker '${this.name}' manually reset`);
  }
}

/**
 * Timeout wrapper for operations
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Bulkhead pattern - limit concurrent operations
 */
export class Bulkhead {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number = 10) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>(resolve => {
        this.queue.push(resolve);
      });
    }

    this.running++;
    
    try {
      return await operation();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }

  getStats() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

// Pre-configured retry strategies for common use cases
export const retryStrategies = {
  // For database operations
  database: (operation: () => Promise<any>) => 
    retry(operation, {
      maxAttempts: 3,
      initialDelay: 500,
      maxDelay: 5000,
      retryableErrors: [/connection/i, /timeout/i, /deadlock/i],
    }),

  // For external API calls
  externalApi: (operation: () => Promise<any>) =>
    retry(operation, {
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      retryableErrors: [/ECONNREFUSED/, /ETIMEDOUT/, /5\d\d/],
    }),

  // For cache operations
  cache: (operation: () => Promise<any>) =>
    retry(operation, {
      maxAttempts: 2,
      initialDelay: 100,
      maxDelay: 500,
      retryableErrors: [/connection/i, /timeout/i],
    }),

  // For file operations
  file: (operation: () => Promise<any>) =>
    retry(operation, {
      maxAttempts: 3,
      initialDelay: 200,
      maxDelay: 2000,
      retryableErrors: [/ENOENT/, /EACCES/, /EBUSY/],
    }),
};