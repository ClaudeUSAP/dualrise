import { headers } from 'next/headers'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  const h = await headers()
  const host = h.get('host') ?? ''
  const isAgentDomain = host.startsWith('agent.')
  const isPlayerDomain = host.startsWith('player.')

  const title = isAgentDomain
    ? 'Connexion Agent Dual Rise'
    : isPlayerDomain
      ? 'Connexion Joueur Dual Rise'
      : 'Connexion Dual Rise'

  const subtitle = isAgentDomain
    ? 'Entrez votre email pour accéder à votre roster'
    : isPlayerDomain
      ? 'Entrez votre email pour accéder à votre dashboard'
      : 'Entrez votre email pour vous connecter'

  return <LoginForm title={title} subtitle={subtitle} />
}
