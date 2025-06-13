/**
 * Simplified rate limiting for API requests
 */

// Simple in-memory cache for request timestamps
const requestLog = new Map<string, number[]>();

/**
 * Simple rate limited request wrapper
 */
export async function rateLimitedRequest<T>(
  requestFn: () => Promise<T>,
  operationName: string = 'api-request'
): Promise<T> {
  const now = Date.now();
  const maxRequests = 10; // Max requests per minute
  const windowMs = 60 * 1000; // 1 minute
  
  // Get or create request history for this operation
  if (!requestLog.has(operationName)) {
    requestLog.set(operationName, []);
  }
  
  const requests = requestLog.get(operationName)!;
  
  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
  
  // Check if we're under the limit
  if (validRequests.length >= maxRequests) {
    const oldestRequest = Math.min(...validRequests);
    const waitTime = windowMs - (now - oldestRequest);
    console.warn(`Rate limit reached for ${operationName}. Waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Add current request and update the log
  validRequests.push(now);
  requestLog.set(operationName, validRequests);
  
  return requestFn();
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