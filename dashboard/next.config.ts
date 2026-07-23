import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  /* config options here */
}

// Points next-intl at our i18n/request.ts so getRequestConfig is satisfied at
// runtime — even when callers pass an explicit locale/messages to
// <NextIntlClientProvider>, the library still needs the config plumbing to
// initialise its server-side store.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

export default withNextIntl(nextConfig)
