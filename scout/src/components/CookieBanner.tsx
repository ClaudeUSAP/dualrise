import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "usap-cookie-notice-ack";

const COPY = {
  fr: {
    text:
      "🍪 Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement du site (authentification, préférences). Aucun cookie publicitaire ou de profilage.",
    more: "En savoir plus →",
    ack: "J'ai compris",
    aria: "Information cookies",
  },
  en: {
    text:
      "🍪 We only use strictly necessary cookies for site functionality (authentication, preferences). No advertising or profiling cookies.",
    more: "Learn more →",
    ack: "Got it",
    aria: "Cookie notice",
  },
} as const;

// FR by default; EN only when the browser language is English.
const resolveLang = (): "fr" | "en" => {
  try {
    return (navigator.language || "").toLowerCase().startsWith("en") ? "en" : "fr";
  } catch {
    return "fr";
  }
};

/**
 * Info-only cookie banner (no consent toggle): the site uses only strictly
 * necessary cookies, so this simply informs the user. The acknowledgement is
 * stored in localStorage and the banner is shown once, on first visit.
 * Bilingual: French by default, English when the browser language is English.
 */
const CookieBanner = () => {
  const [visible, setVisible] = useState(false);
  const t = COPY[resolveLang()];

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "true") {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (private mode / SSR): show the banner anyway
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore write failures
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t.aria}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg"
    >
      <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t.text}</p>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/politique-confidentialite#cookies">{t.more}</Link>
          </Button>
          <Button size="sm" onClick={dismiss}>
            {t.ack}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
