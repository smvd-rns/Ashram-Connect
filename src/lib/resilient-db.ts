import { PostgrestResponse, PostgrestSingleResponse } from "@supabase/supabase-js";

/**
 * Ashram Connect - Resilience Utility
 * Handles intermittent connection timeouts to Supabase
 */

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

export async function resilientFetch<T>(
  operation: () => Promise<T>,
  context: string = "Operation"
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Create a timeout signal for this specific attempt
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased to 10s per attempt

      const result = await operation();
      clearTimeout(timeoutId);
      return result;
    } catch (err: any) {
      lastError = err;
      const isTimeout = 
        err.name === 'AbortError' || 
        err.code === 'UND_ERR_CONNECT_TIMEOUT' || 
        err.message?.includes('timeout') ||
        err.message?.includes('fetch failed');

      if (isTimeout && attempt < MAX_RETRIES) {
        console.warn(`[Resilience] ${context} timed out. Retrying (Attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise(res => setTimeout(res, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      
      console.error(`[Resilience] ${context} failed after ${attempt} retries:`, err.message || err);
      throw err;
    }
  }
  
  throw lastError;
}

/**
 * Specialized wrapper for Supabase Auth calls
 */
export async function safeAuth<T>(authOp: () => Promise<T>, context: string = "Auth") {
  return resilientFetch(authOp, context);
}

/**
 * Specialized wrapper for Supabase DB calls
 */
export async function safeQuery<T>(queryOp: () => Promise<T>, context: string = "DB Query") {
  return resilientFetch(queryOp, context);
}
