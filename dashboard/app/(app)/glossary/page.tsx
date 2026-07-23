import { redirect } from 'next/navigation'

// The legacy hardcoded glossary has been replaced by the editable
// knowledge_articles.glossaire article (translated FR/EN, edited via
// /admin/resources). Keep this route alive for old bookmarks/links.
export default function GlossaryPage() {
  redirect('/resources/glossaire')
}
