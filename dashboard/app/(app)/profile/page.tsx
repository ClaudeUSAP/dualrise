import Image from 'next/image'
import { redirect } from 'next/navigation'
import { RestartTourButton } from '@/components/RestartTourButton'
import { SCOUT_PROFILE_ENABLED } from '@/lib/feature-flags'
import { getViewerMember } from '@/lib/get-viewer-player'
import { getScoutProfile } from '@/lib/scout-profile'
import { ScoutResultsList } from './ScoutResultsList'
import { ScoutScoringCard } from './ScoutScoringCard'
import { createClient } from '@/lib/supabase/server'
import { DigestOptIn } from './DigestOptIn'
import { LanguagePicker } from './LanguagePicker'

const SUPPORT_EMAIL = 'nicplancha@gmail.com'

// Read-only SCOUT value formatting
function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—'
  const s = String(v).trim()
  return s === '' ? '—' : s
}

const NICO_BIO =
  'Fondateur Dual Rise, ancien joueur D1, accompagne la stratégie globale et reste accessible à tous les joueurs.'

const AGENT_BIO_FALLBACK =
  'Ton agent Dual Rise, qui accompagne la construction de ton dossier, la relation avec les coachs et le suivi du recrutement.'

function makeInitials(first: string | null, last: string | null): string {
  const f = (first ?? '').trim().charAt(0)
  const l = (last ?? '').trim().charAt(0)
  return `${f}${l}`.toUpperCase() || '?'
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await getViewerMember(supabase)
  const { data: player } = member
    ? await supabase
        .from('players')
        .select(
          'first_name, last_name, graduation_year, preferred_language, weekly_digest_optin, agent_id, scout_athlete_id'
        )
        .eq('id', member.player_id)
        .single()
    : { data: null }

  if (!player) {
    return (
      <div className="rounded-md border border-line bg-white p-6 text-muted">
        Profil joueur introuvable pour {user.email}.
      </div>
    )
  }

  const fullName = `${player.first_name} ${player.last_name}`
  const initials = makeInitials(player.first_name, player.last_name)

  // Read-only SCOUT profile (separate project, server-only, gated to this
  // player's own scout_athlete_id). null => not linked or env not set yet.
  const scout = SCOUT_PROFILE_ENABLED
    ? await getScoutProfile(player.scout_athlete_id)
    : null

  // Real "Ton équipe Dual Rise" — fetch the player's actual agent. Founder Nicolas
  // remains as a second card (project lead) unless he is also the player's
  // assigned agent, in which case we de-duplicate.
  type AgentRow = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    bio: string | null
    photo_url: string | null
  }
  let assignedAgent: AgentRow | null = null
  if (player.agent_id) {
    const { data: agent } = await supabase
      .from('agents')
      .select('id, first_name, last_name, email, role, bio, photo_url')
      .eq('id', player.agent_id)
      .maybeSingle()
    if (agent) assignedAgent = agent as AgentRow
  }

  const { data: founder } = await supabase
    .from('agents')
    .select('id, first_name, last_name, email, role, bio, photo_url')
    .eq('role', 'founder')
    .order('first_name', { ascending: true })
    .limit(1)
    .maybeSingle()
  const founderRow = (founder as AgentRow | null) ?? null

  type TeamCard = {
    initials: string
    name: string
    role: string
    bio: string
    photoUrl: string | null
    contact: string | null
  }
  const team: TeamCard[] = []
  if (assignedAgent) {
    const name =
      `${assignedAgent.first_name ?? ''} ${assignedAgent.last_name ?? ''}`.trim() ||
      'Ton agent Dual Rise'
    team.push({
      initials: makeInitials(assignedAgent.first_name, assignedAgent.last_name),
      name,
      role:
        assignedAgent.role === 'founder'
          ? 'Founder · Dual Rise'
          : 'Agent · Recrutement',
      bio: assignedAgent.bio?.trim() || AGENT_BIO_FALLBACK,
      photoUrl: assignedAgent.photo_url ?? null,
      contact: assignedAgent.email ? `mailto:${assignedAgent.email}` : null,
    })
  }
  if (founderRow && founderRow.id !== assignedAgent?.id) {
    const name =
      `${founderRow.first_name ?? ''} ${founderRow.last_name ?? ''}`.trim() ||
      'Nicolas Paviet'
    team.push({
      initials: makeInitials(founderRow.first_name, founderRow.last_name),
      name,
      role: 'Founder · Dual Rise',
      bio: founderRow.bio?.trim() || NICO_BIO,
      photoUrl: founderRow.photo_url ?? null,
      contact: founderRow.email ? `mailto:${founderRow.email}` : null,
    })
  }

  // ---- SCOUT read-only display data ----
  const a = scout?.athlete ?? {}
  // Scoring is rendered by the interactive ScoutScoringCard (period + metric
  // selectable) — see below. The global scoring_average / scoring_average_vs_par
  // columns are mostly empty, so per-period columns are used instead.
  const metricGroups: { title: string; rows: [string, string][] }[] = scout
    ? [
        {
          title: 'Classements',
          rows: [
            ['FFGOLF (adulte)', fmt(a.french_adult_ranking)],
            ['FFGOLF (catégorie)', fmt(a.french_ranking_in_their_class)],
            ['WAGR', fmt(a.wagr_ranking)],
          ],
        },
        {
          title: 'Distances',
          rows: [
            ['Drive (carry)', fmt(a.drive_distance_carry)],
            ['Fer 7 (carry)', fmt(a.seven_iron_distance_carry)],
            ['Vitesse max tête de club', fmt(a.max_club_head_speed)],
          ],
        },
        {
          title: 'Académique',
          rows: [
            ['GPA', fmt(a.academic_gpa)],
            ['SAT', fmt(a.sat)],
            ['TOEFL', fmt(a.toefl)],
            ['Duolingo', fmt(a.duolingo)],
            ['Filières visées', fmt(a.intended_majors)],
          ],
        },
        {
          title: 'Profil',
          rows: [
            ['Club / équipe', fmt(a.golf_club_team)],
            ['Coach de swing', fmt(a.swing_coach)],
          ],
        },
      ]
    : []

  // "Suggérer une modification" → pre-filled email to the player's agent
  // (cc founder). No write to SCOUT — the agent edits SCOUT manually.
  const suggestTo = assignedAgent?.email ?? SUPPORT_EMAIL
  const suggestCc =
    assignedAgent?.email && assignedAgent.email !== SUPPORT_EMAIL
      ? SUPPORT_EMAIL
      : null
  const suggestMailto =
    `mailto:${suggestTo}` +
    `?${suggestCc ? `cc=${encodeURIComponent(suggestCc)}&` : ''}` +
    `subject=${encodeURIComponent(`${fullName} — suggestion de modification du profil SCOUT`)}` +
    `&body=${encodeURIComponent(
      `Bonjour,\n\nJe souhaite suggérer une modification de mon profil SCOUT.\n\n` +
        `• Élément concerné : \n• Valeur affichée : \n• Valeur correcte : \n\n` +
        `Merci,\n${fullName}`
    )}`

  // §6.5 — once an athlete is placed (committed / in_college), recruiting is over:
  // hide the whole "Mon profil SCOUT" section player/parent-side.
  const showScout = !!scout && !scout.placed

  const swingVideoUrl =
    showScout && typeof a.video_links === 'string' && a.video_links.trim()
      ? a.video_links.trim()
      : null

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
      <aside className="flex flex-col gap-6 self-start rounded-md bg-navy p-6 text-white lg:sticky lg:top-[100px]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-orange text-3xl font-bold text-white">
            {initials}
          </div>
          <h2 className="display text-center text-2xl">{fullName}</h2>
          <span className="rounded bg-orange px-2 py-0.5 text-xs font-bold tracking-wide">
            CLASS {player.graduation_year}
          </span>
        </div>

        {SCOUT_PROFILE_ENABLED && swingVideoUrl && (
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <a
                href={swingVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md bg-white/10 px-3 py-2 transition-colors hover:bg-white/20"
              >
                Mes vidéos de swing ↗
              </a>
            </li>
          </ul>
        )}

        <a
          href="https://youtu.be/rBSxJnNf1jI"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-md bg-orange px-3 py-2 text-center text-sm font-bold text-white transition-colors hover:bg-[#C11722]"
        >
          🎥 Tutoriel : comment utiliser ton dashboard ↗
        </a>

        <div className="mt-2 border-t border-white/10 pt-4">
          <RestartTourButton />
        </div>

        <div className="text-center">
          <Image
            src="/dualrise-logo-white.svg"
            alt="Dual Rise"
            width={120}
            height={40}
            className="mx-auto h-auto w-[120px]"
            unoptimized
          />
        </div>
      </aside>

      <div className="flex flex-col gap-6">
        <LanguagePicker
          initialLang={
            (player.preferred_language === 'en' ? 'en' : 'fr') as 'fr' | 'en'
          }
        />

        <DigestOptIn
          initialOptin={
            (player as { weekly_digest_optin?: boolean | null })
              .weekly_digest_optin ?? true
          }
          locale={(player.preferred_language === 'en' ? 'en' : 'fr') as 'fr' | 'en'}
        />

        {SCOUT_PROFILE_ENABLED && !scout && (
          <section className="rounded-md border border-line bg-white px-5 py-6 text-sm text-muted">
            <h3 className="display mb-1 text-sm text-navy">Mon profil SCOUT</h3>
            Ton profil SCOUT est en préparation. Il apparaîtra ici dès qu'il sera
            relié par ton agent.
          </section>
        )}

        {SCOUT_PROFILE_ENABLED && showScout && (
          <section className="flex flex-col gap-4 rounded-md border border-line bg-white p-5">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h3 className="display text-sm text-navy">Mon profil SCOUT</h3>
                <p className="text-xs text-muted">
                  Les informations communiquées aux coachs · lecture seule
                </p>
              </div>
              <a
                href={suggestMailto}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-orange hover:text-orange"
              >
                ✎ Suggérer une modification
              </a>
            </header>

            <ScoutScoringCard scoring={scout.scoring} />

            <div className="grid gap-4 sm:grid-cols-2">
              {metricGroups.map((group) => (
                <div
                  key={group.title}
                  className="rounded-md border border-line bg-cream-2/40"
                >
                  <div className="border-b border-line px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-orange">
                    {group.title}
                  </div>
                  <ul className="divide-y divide-line">
                    {group.rows.map(([label, value]) => (
                      <li
                        key={label}
                        className="flex items-center justify-between gap-3 px-4 py-2"
                      >
                        <span className="text-xs text-muted">{label}</span>
                        <span className="text-right text-sm font-bold text-navy">
                          {value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-orange">
                Derniers résultats
              </h4>
              <ScoutResultsList results={scout.recentResults} />
            </div>
          </section>
        )}

        {team.length > 0 && (
          <section>
            <h3 className="display mb-3 text-sm text-navy">Ton équipe Dual Rise</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {team.map((m) => (
                <article
                  key={m.name}
                  className="flex flex-col gap-3 rounded-md border border-line bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    {m.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.photoUrl}
                        alt={m.name}
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-bright text-sm font-bold text-white">
                        {m.initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-base font-bold text-navy">
                        {m.name}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-orange">
                        {m.role}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm italic text-muted">{m.bio}</p>
                  {m.contact ? (
                    <a
                      href={m.contact}
                      className="mt-auto inline-block rounded-md bg-cream-2 px-3 py-2 text-center text-xs font-semibold text-navy transition-colors hover:bg-line"
                    >
                      Contacter
                    </a>
                  ) : (
                    <span className="mt-auto inline-block rounded-md bg-cream-2 px-3 py-2 text-center text-xs font-semibold text-muted">
                      Email à venir
                    </span>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
