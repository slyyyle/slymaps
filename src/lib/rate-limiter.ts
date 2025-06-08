/**
 * Simple rate limiter to prevent API overuse
 */

interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  /**
   * Check if a request can be made
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check if we're under the limit
    return this.requests.length < this.maxRequests;
  }

  /**
   * Record a request being made
   */
  recordRequest(): void {
    this.requests.push(Date.now());
  }

  /**
   * Get time until next request can be made (in ms)
   */
  getTimeUntilReset(): number {
    if (this.requests.length < this.maxRequests) {
      return 0;
    }
    
    const oldestRequest = Math.min(...this.requests);
    return this.windowMs - (Date.now() - oldestRequest);
  }
}

// Create a rate limiter for OBA API
// OneBusAway typically allows ~10 requests per minute
export const obaRateLimiter = new RateLimiter({
  maxRequests: 8, // Conservative limit
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Wrapper function that respects rate limits
 */
export async function rateLimitedRequest<T>(
  requestFn: () => Promise<T>,
  operationName: string = 'API request'
): Promise<T> {
  if (!obaRateLimiter.canMakeRequest()) {
    const waitTime = obaRateLimiter.getTimeUntilReset();
    throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before making another ${operationName}.`);
  }

  obaRateLimiter.recordRequest();
  return await requestFn();
}

/**
 * Debounced rate limiter for search operations
 */
let searchTimeout: NodeJS.Timeout | null = null;

export function debouncedRateLimitedRequest<T>(
  requestFn: () => Promise<T>,
  debounceMs: number = 300,
  operationName: string = 'search'
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(async () => {
      try {
        const result = await rateLimitedRequest(requestFn, operationName);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, debounceMs);
  });
} 