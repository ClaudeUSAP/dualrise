import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE, getMessages } from '@/lib/i18n'

// Minimal request config — the real locale + messages are still passed
// explicitly to <NextIntlClientProvider> in (app)/layout.tsx based on the
// authenticated player's preferred_language. This file just exists so
// next-intl's plugin can wire up the server-side runtime.
export default getRequestConfig(async () => {
  return {
    locale: DEFAULT_LOCALE,
    messages: getMessages(DEFAULT_LOCALE),
  }
})
