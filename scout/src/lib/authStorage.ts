// Storage adapter for Supabase auth with "Remember Me" support
// Uses localStorage when remembered, sessionStorage when not

const SESSION_KEY = 'sb-jwyyldkgvpylseqnctnm-auth-token';
const REMEMBER_ME_KEY = 'auth_remember_me';

// Determine which storage to use based on preference
const getPreferredStorage = (): Storage => {
  const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  return rememberMe ? localStorage : sessionStorage;
};

export const authStorage = {
  getItem: (key: string): string | null => {
    // Check localStorage first (for remembered sessions)
    const localValue = localStorage.getItem(key);
    if (localValue) return localValue;
    
    // Fall back to sessionStorage
    const sessionValue = sessionStorage.getItem(key);
    return sessionValue;
  },
  
  setItem: (key: string, value: string): void => {
    const storage = getPreferredStorage();
    
    // Clear BOTH storages first to prevent split tokens
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    
    // Write to the preferred storage only
    storage.setItem(key, value);
  },
  
  removeItem: (key: string): void => {
    // Remove from both storages
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

/**
 * Set the "Remember me" preference.
 * This controls which storage is used for the auth session.
 * - true: localStorage (persists across browser close)
 * - false: sessionStorage (cleared when browser closes)
 */
export const setRememberMe = (value: boolean): void => {
  // Always store preference in localStorage (persists across sessions)
  localStorage.setItem(REMEMBER_ME_KEY, String(value));
};

/**
 * Get the current "Remember me" preference
 */
export const getRememberMe = (): boolean => {
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
};
