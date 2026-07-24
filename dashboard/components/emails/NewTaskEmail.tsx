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

type Props = {
  playerFirstName: string
  agentName: string
  title: string
  description: string | null
  dueDateText: string | null
  schoolName: string | null
  dashboardUrl: string
  logoUrl: string
}

export function NewTaskEmail({
  playerFirstName,
  agentName,
  title,
  description,
  dueDateText,
  schoolName,
  dashboardUrl,
  logoUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>{`${agentName} t'a assigné une nouvelle tâche : ${title}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Img src={logoUrl} alt="Dual Rise" width="120" height="40" style={logo} />
          </Section>
          <Section style={content}>
            <Heading style={h1}>Nouvelle tâche</Heading>
            <Text style={text}>Bonjour {playerFirstName || 'champion'},</Text>
            <Text style={text}>
              {agentName} t&apos;a assigné une nouvelle tâche
              {schoolName ? ` concernant ${schoolName}` : ''} :
            </Text>
            <Section style={card}>
              <Text style={cardTitle}>{title}</Text>
              {description && <Text style={cardBody}>{description}</Text>}
              {dueDateText && (
                <Text style={cardMeta}>
                  ⏰ Échéance : <strong>{dueDateText}</strong>
                </Text>
              )}
              {schoolName && !description && (
                <Text style={cardMeta}>
                  🏫 École : <strong>{schoolName}</strong>
                </Text>
              )}
            </Section>
            <Section style={ctaWrap}>
              <Link href={dashboardUrl} style={button}>
                Voir mes tâches sur le dashboard →
              </Link>
            </Section>
            <Hr style={hr} />
            <Text style={footer}>Dual Rise — US Athletic Performance</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#FAFAF7',
  fontFamily: '-apple-system, "Inter", system-ui, sans-serif',
  margin: 0,
  padding: '20px 0',
}
const container = { maxWidth: '560px', margin: '0 auto' }
const header = {
  backgroundColor: '#0B1D58',
  padding: '20px',
  borderRadius: '8px 8px 0 0',
  textAlign: 'center' as const,
  borderBottom: '3px solid #E11D2A',
}
const logo = { margin: '0 auto' }
const content = {
  backgroundColor: '#FFFFFF',
  padding: '32px',
  borderRadius: '0 0 8px 8px',
}
const h1 = {
  color: '#0B1D58',
  fontSize: '24px',
  fontWeight: 800,
  fontStyle: 'italic' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '-0.02em',
  margin: '0 0 16px 0',
}
const text = {
  color: '#0B1D58',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 12px 0',
}
const card = {
  backgroundColor: '#FDE7E9',
  borderLeft: '4px solid #E11D2A',
  padding: '16px 18px',
  margin: '20px 0',
  borderRadius: '4px',
}
const cardTitle = {
  color: '#0B1D58',
  fontSize: '16px',
  fontWeight: 700,
  margin: '0 0 8px 0',
}
const cardBody = {
  color: '#0B1D58',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 8px 0',
  whiteSpace: 'pre-wrap' as const,
}
const cardMeta = {
  color: '#0B1D58',
  fontSize: '13px',
  margin: '4px 0 0 0',
}
const ctaWrap = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  display: 'inline-block',
  backgroundColor: '#E11D2A',
  color: '#FFFFFF',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 700,
  textDecoration: 'none',
}
const hr = { borderColor: '#E5E2D9', margin: '24px 0' }
const footer = {
  color: '#6B7280',
  fontSize: '11px',
  textAlign: 'center' as const,
  margin: 0,
}
