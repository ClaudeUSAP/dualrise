import { supabase } from '@/integrations/supabase/client';

/**
 * Custom error class for expired auth sessions.
 * Allows the UI to detect session expiration and handle it gracefully.
 */
export class AuthSessionExpiredError extends Error {
  constructor(message: string = 'Session expired. Please log in again.') {
    super(message);
    this.name = 'AuthSessionExpiredError';
  }
}

/**
 * Checks if an error is an auth-related error (401/403)
 */
const isAuthError = (error: any): boolean => {
  if (!error) return false;
  
  const code = error.code?.toString() || '';
  const status = error.status?.toString() || '';
  const message = error.message?.toLowerCase() || '';
  
  return (
    code === '403' || 
    code === '401' || 
    code === 'PGRST301' ||
    status === '403' || 
    status === '401' ||
    message.includes('jwt') ||
    message.includes('token') ||
    message.includes('unauthorized') ||
    message.includes('invalid claim')
  );
};

/**
 * Wraps a Supabase operation with automatic session refresh retry.
 * 
 * If the operation fails due to an auth error (401/403/bad_jwt), 
 * this will attempt to refresh the session once and retry.
 * 
 * If the retry also fails, throws AuthSessionExpiredError for graceful UI handling.
 * 
 * @param operation - Async function that performs the Supabase operation
 * @returns The result of the operation
 * @throws AuthSessionExpiredError if session cannot be recovered
 */
export async function withAuthRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    console.warn('API operation failed, checking if auth error:', error);
    
    if (isAuthError(error)) {
      console.log('Auth error detected, attempting session refresh...');
      
      try {
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !data.session) {
          console.error('Session refresh failed:', refreshError);
          throw new AuthSessionExpiredError();
        }
        
        console.log('Session refreshed successfully, retrying operation...');
        
        // Retry the operation with the refreshed session
        try {
          return await operation();
        } catch (retryError: any) {
          console.error('Operation failed after session refresh:', retryError);
          
          if (isAuthError(retryError)) {
            throw new AuthSessionExpiredError();
          }
          throw retryError;
        }
      } catch (refreshCatchError) {
        if (refreshCatchError instanceof AuthSessionExpiredError) {
          throw refreshCatchError;
        }
        console.error('Unexpected error during session refresh:', refreshCatchError);
        throw new AuthSessionExpiredError();
      }
    }
    
    // Not an auth error, rethrow as-is
    throw error;
  }
}

/**
 * Checks if the current session is valid.
 * Returns true if there's an active session, false otherwise.
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}
