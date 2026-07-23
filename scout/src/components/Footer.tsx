import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * Shared site footer rendered across public and authenticated layouts.
 * Provides app-wide access to the legal pages (RGPD requirement).
 *
 * The footer carries the app's only language affordance: a FR ⇄ EN toggle
 * persisted in localStorage ('lang'). All footer labels follow that choice.
 */
const LABELS = {
  fr: {
    rights: "Tous droits réservés.",
    privacy: "Politique de confidentialité",
    legal: "Mentions légales",
    toggle: "English",
  },
  en: {
    rights: "All rights reserved.",
    privacy: "Privacy Policy",
    legal: "Legal Notice",
    toggle: "Français",
  },
} as const;

const Footer = () => {
  const year = new Date().getFullYear();
  const [lang, setLang] = useState<"fr" | "en">(
    () => (localStorage.getItem("lang") === "en" ? "en" : "fr")
  );
  const t = LABELS[lang];

  const toggleLang = () => {
    const next = lang === "fr" ? "en" : "fr";
    setLang(next);
    localStorage.setItem("lang", next);
  };

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto flex flex-col items-center gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {year} Dual Rise. {t.rights}</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link
            to={lang === "en" ? "/privacy-en" : "/politique-confidentialite"}
            className="hover:text-foreground transition-colors"
          >
            {t.privacy}
          </Link>
          <Link to="/mentions-legales" className="hover:text-foreground transition-colors">
            {t.legal}
          </Link>
          <button
            type="button"
            onClick={toggleLang}
            className="hover:text-foreground transition-colors"
          >
            {t.toggle}
          </button>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
