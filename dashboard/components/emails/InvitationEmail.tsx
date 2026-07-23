import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

type Role = 'player' | 'parent'

type Props = {
  role: Role
  firstName: string // player's first name (used for the player greeting)
  magicLink: string
  agentName: string | null
  /** true when the player's agent IS the founder (Nicolas) — changes the
   *  accompaniment + contact wording. */
  isFounder: boolean
  logoUrl: string
  loginUrl: string
}

const SUPPORT_EMAIL = 'nicolas@usathleticperformance.com'

export function InvitationEmail({
  role,
  firstName,
  magicLink,
  agentName,
  isFounder,
  logoUrl,
  loginUrl,
}: Props) {
  const isPlayer = role === 'player'
  const agent = agentName?.trim() || (isPlayer ? 'ton agent USAP' : 'votre agent USAP')

  const title = isPlayer
    ? 'Ton accès à ton espace USAP'
    : "Votre accès à l'espace USAP de votre enfant"

  const greeting = isPlayer ? `Salut ${firstName},` : 'Bonjour,'

  const intro = isPlayer
    ? 'Voici ton lien de connexion sécurisé à ton espace US Athletic Performance (valable quelques minutes) :'
    : "Voici votre lien de connexion sécurisé à l'espace US Athletic Performance de votre enfant (valable quelques minutes) :"

  const body2 = isPlayer
    ? 'Tu y retrouves tout ton projet golf-études aux US : les universités sur lesquelles on travaille pour toi, ton calendrier (calls coachs, deadlines), ta checklist administrative (visa, Duolingo, bulletins…), tes ressources et ta préparation aux entretiens.'
    : 'Cet espace vous permet de suivre l’avancement de son projet golf-études aux États-Unis : universités contactées, calendrier, étapes administratives (visa, dossiers, départ) et ressources pour vous accompagner.'

  const accompaniment = isPlayer
    ? isFounder
      ? 'Je t’accompagnerai tout au long du projet.'
      : `Ton agent ${agent} t’accompagnera tout au long du projet, avec moi.`
    : isFounder
      ? 'Je vous accompagnerai tout au long du projet.'
      : `Votre agent USAP ${agent} vous accompagnera tout au long du projet, avec moi.`

  const contact = isPlayer
    ? isFounder
      ? `Une question ? Écris-moi à ${SUPPORT_EMAIL}.`
      : `Une question ? Écris à ${agent} ou à ${SUPPORT_EMAIL}.`
    : isFounder
      ? `Une question ? Écrivez-moi à ${SUPPORT_EMAIL}.`
      : `Une question ? Écrivez à ${agent} ou à ${SUPPORT_EMAIL}.`

  const signoff = isPlayer ? 'À très vite,' : 'Bien à vous,'

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={bodyStyle}>
        <Container style={container}>
          <Section style={header}>
            <Img src={logoUrl} alt="US Athletic Performance" width="120" height="40" style={logo} />
            <Text style={headerText}>US ATHLETIC PERFORMANCE</Text>
          </Section>
          <Section style={content}>
            <Heading style={h1}>{title}</Heading>
            <Text style={text}>{greeting}</Text>
            <Text style={text}>{intro}</Text>
            <Section style={ctaWrap}>
              <Link href={magicLink} style={button}>
                Me connecter
              </Link>
            </Section>
            <Text style={text}>{body2}</Text>
            <Text style={text}>{accompaniment}</Text>
            <Text style={hint}>
              {contact}
              <br />
              Si le lien a expiré, demandez-en un nouveau depuis{' '}
              <Link href={loginUrl} style={inlineLink}>
                la page de connexion
              </Link>
              .
            </Text>
            <Text style={text}>
              {signoff}
              <br />
              Nicolas — US Athletic Performance
            </Text>
            <Hr style={hr} />
            <Text style={footer}>© 2026 US Athletic Performance Sàrl · Switzerland</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// §2 email palette: navy #0B1F3A, orange #F36B21
const bodyStyle = {
  backgroundColor: '#FAFAF7',
  fontFamily: '-apple-system, "Inter", system-ui, sans-serif',
  margin: 0,
  padding: '20px 0',
}
const container = { maxWidth: '560px', margin: '0 auto' }
const header = {
  backgroundColor: '#0B1F3A',
  padding: '20px',
  borderRadius: '8px 8px 0 0',
  textAlign: 'center' as const,
  borderBottom: '3px solid #F36B21',
}
const logo = { margin: '0 auto' }
const headerText = {
  color: '#FFFFFF',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  margin: '8px 0 0 0',
}
const content = {
  backgroundColor: '#FFFFFF',
  padding: '32px',
  borderRadius: '0 0 8px 8px',
}
const h1 = {
  color: '#0B1F3A',
  fontSize: '22px',
  fontWeight: 800,
  fontStyle: 'italic' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '-0.02em',
  margin: '0 0 16px 0',
}
const text = {
  color: '#0B1F3A',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 12px 0',
}
const ctaWrap = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  display: 'inline-block',
  backgroundColor: '#F36B21',
  color: '#FFFFFF',
  padding: '14px 32px',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: 700,
  textDecoration: 'none',
}
const hint = {
  color: '#6B7280',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0 0 16px 0',
}
const inlineLink = { color: '#F36B21', textDecoration: 'underline' }
const hr = { borderColor: '#E5E2D9', margin: '24px 0' }
const footer = {
  color: '#6B7280',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  margin: 0,
}
