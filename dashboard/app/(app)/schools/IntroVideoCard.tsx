function youtubeEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1)
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v')
        return id ? `https://www.youtube.com/embed/${id}` : null
      }
      const m = u.pathname.match(/^\/(embed|shorts)\/([\w-]+)/)
      if (m) return `https://www.youtube.com/embed/${m[2]}`
    }
    return null
  } catch {
    return null
  }
}

export function IntroVideoCard({ url }: { url: string | null }) {
  const trimmed = url?.trim()
  if (!trimmed) return null

  const embed = youtubeEmbedUrl(trimmed)

  return (
    <section className="mb-6 rounded-md border border-line bg-white p-4">
      <h2 className="display text-lg text-navy">🎬 Ma vidéo de présentation</h2>
      {embed ? (
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-md bg-black">
          <iframe
            src={embed}
            title="Vidéo de présentation"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 rounded-md border border-orange/40 bg-orange/10 px-3 py-1.5 text-sm font-bold text-orange transition-colors hover:bg-orange/20"
        >
          ▶️ Voir ma vidéo de présentation ↗
        </a>
      )}
    </section>
  )
}
