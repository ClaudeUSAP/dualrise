export type SchoolForUrls = {
  name: string
  gender: string | null
  niche_url: string | null
  website_url: string | null
  instagram_url: string | null
  scoreboard_url: string | null
}

export type LinkResult = { url: string; isDirect: boolean }

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function googleSearchUrl(school: SchoolForUrls, target: string): string {
  const genderTerm = school.gender === 'Women' ? "women's" : "men's"
  const q = encodeURIComponent(`${school.name} ${genderTerm} golf ${target}`)
  return `https://www.google.com/search?q=${q}`
}

export function getNicheUrl(school: SchoolForUrls): LinkResult {
  if (school.niche_url) return { url: school.niche_url, isDirect: true }
  return {
    url: `https://www.niche.com/colleges/${slugify(school.name)}/`,
    isDirect: false,
  }
}

export function getWebsiteUrl(school: SchoolForUrls): LinkResult {
  if (school.website_url) return { url: school.website_url, isDirect: true }
  return { url: googleSearchUrl(school, 'team website'), isDirect: false }
}

export function getInstagramUrl(school: SchoolForUrls): LinkResult {
  if (school.instagram_url) return { url: school.instagram_url, isDirect: true }
  return { url: googleSearchUrl(school, 'instagram'), isDirect: false }
}

export function getScoreboardUrl(school: SchoolForUrls): LinkResult {
  if (school.scoreboard_url) return { url: school.scoreboard_url, isDirect: true }
  return { url: googleSearchUrl(school, 'scoreboard clippd'), isDirect: false }
}
