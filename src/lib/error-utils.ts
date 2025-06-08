/**
 * Utility functions for consistent error handling across the application
 */

export interface ErrorResult {
  message: string;
  originalError: unknown;
}

/**
 * Extracts a user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return fallbackMessage;
}

/**
 * Handles API response errors with consistent error extraction
 */
export async function handleApiError(response: Response, operation: string): Promise<never> {
  let errorMessage = `Failed to ${operation} (status ${response.status})`;
  
  // Handle rate limiting specifically
  if (response.status === 429) {
    errorMessage = `API rate limit exceeded. Please wait a moment before trying again.`;
  } else {
    try {
      const errorData = await response.json();
      const apiMessage = errorData?.text || errorData?.message;
      
      // Check for rate limit messages in the response
      if (apiMessage && (
        apiMessage.toLowerCase().includes('rate limit') ||
        apiMessage.toLowerCase().includes('too many requests')
      )) {
        errorMessage = `API rate limit exceeded. Please wait a moment before trying again.`;
      } else {
        errorMessage = apiMessage || JSON.stringify(errorData) || errorMessage;
      }
    } catch {
      try {
        const textResponse = await response.text();
        if (textResponse) {
          errorMessage = textResponse;
        }
      } catch {
        // Use the original error message
      }
    }
  }
  
  throw new Error(errorMessage);
}

/**
 * Validates API keys to prevent redundant checks
 */
export function isValidApiKey(apiKey: string | undefined): boolean {
  return !!(apiKey && apiKey !== "YOUR_ONEBUSAWAY_API_KEY_HERE" && apiKey !== "");
} 