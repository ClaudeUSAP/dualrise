export const AUTH_ROUTES = {
  PASSWORD_RESET_NEW: '/password-reset/new-password',
  PASSWORD_RESET_REQUEST: '/password-reset',
  PASSWORD_RESET_EMAIL_SENT: '/password-reset/email-sent',
  PASSWORD_RESET_SUCCESS: '/password-reset/success',
  ACCOUNT_PENDING: '/account-pending',
  ACCOUNT_SUSPENDED: '/account-suspended',
} as const;

/** Production domain for use in edge functions where window.location.origin is unavailable */
export const PRODUCTION_URL = 'https://scout.usathleticperformance.com';
