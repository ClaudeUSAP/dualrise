// Canonical public host of the family dashboard. Used in transactional emails,
// iCal feeds, and any deep link emitted server-side. Override via the
// NEXT_PUBLIC_SITE_URL env var (set per-environment in Vercel) — falls back to
// the production custom domain so dev/preview without the env var still emit
// usable links.
export const APP_HOST =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ||
  'https://agent.dualrise.app'

export const LOGO_URL = `${APP_HOST}/dualrise-logo-red.svg`
