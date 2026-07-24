import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Dual Rise',
  description:
    'Politique de confidentialité de US Athletic Performance Sàrl conforme RGPD et LPD.',
}

export default function PrivacyPage() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="meta">Dernière mise à jour : 13 mai 2026</p>

      <p>
        Version disponible aussi en <a href="/en/privacy">English</a>.
      </p>

      <h2>1. Qui sommes-nous</h2>
      <p>
        <strong>US Athletic Performance Sàrl</strong> (ci-après «&nbsp;Dual Rise&nbsp;», «&nbsp;nous&nbsp;» ou «&nbsp;notre&nbsp;»)
      </p>
      <ul>
        <li>Siège : Route des Acacias 48, 1227 Carouge (GE), Suisse</li>
        <li>Forme juridique : Société à responsabilité limitée (Sàrl) de droit suisse</li>
        <li>Capital social : CHF 20&apos;000</li>
        <li>N° IDE : CHE-243.693.381</li>
        <li>N° au Registre du Commerce du Canton de Genève : CH-660.1.979.024-9</li>
        <li>Téléphone : +1-872-279-0009</li>
        <li>
          Email :{' '}
          <a href="mailto:nicplancha@gmail.com">
            nicplancha@gmail.com
          </a>
        </li>
        <li>Directeur de la publication : Nicolas Pierre Paviet, Fondateur</li>
      </ul>
      <p>
        Dual Rise est une agence suisse spécialisée dans le placement de jeunes joueurs et joueuses de golf européens dans les programmes universitaires américains (NCAA Division I, II, III, NAIA, JUCO).
      </p>
      <p>
        Dual Rise agit en qualité de <strong>responsable du traitement</strong> au sens du Règlement (UE) 2016/679 («&nbsp;RGPD&nbsp;») et de la Loi fédérale suisse sur la protection des données («&nbsp;LPD&nbsp;»).
      </p>

      <h2>2. Référent en matière de protection des données</h2>
      <p>
        Dual Rise n&apos;a pas désigné de Délégué à la Protection des Données (DPO). Pour toute question ou pour exercer vos droits&nbsp;:
      </p>
      <ul>
        <li>
          Email :{' '}
          <a href="mailto:nicplancha@gmail.com">
            nicplancha@gmail.com
          </a>
        </li>
        <li>Téléphone : +1-872-279-0009</li>
      </ul>
      <p>
        Nous nous engageons à répondre dans un délai d&apos;<strong>un mois</strong> maximum (article 12 RGPD).
      </p>

      <h2>3. Quelles données nous collectons</h2>

      <h3>3.1. Données de l&apos;athlète</h3>
      <ul>
        <li>
          <strong>Identification</strong> : prénom, nom, sexe, nationalité, <strong>année</strong> de naissance (pas la date complète — minimisation)
        </li>
        <li>
          <strong>Coordonnées</strong> : email, téléphone (de l&apos;athlète mineur ou du représentant légal)
        </li>
        <li>
          <strong>Données sportives</strong> : club, classements FFGOLF / EGR / WAGR, résultats de tournois (deux dernières saisons), vidéos de swing, photo
        </li>
        <li>
          <strong>Données académiques</strong> : GPA, scores SAT / ACT / TOEFL / Duolingo, bulletins traduits, évaluations NCAA / NAIA
        </li>
        <li>
          <strong>Critères de recrutement</strong> : budget familial, régions et divisions cibles, objectifs académiques
        </li>
        <li>
          <strong>Notes internes</strong> : observations confidentielles produites par l&apos;agent Dual Rise dédié
        </li>
      </ul>

      <h3>3.2. Données des représentants légaux</h3>
      <ul>
        <li>Prénom, nom, lien de parenté</li>
        <li>Email, téléphone</li>
        <li>Données contractuelles : signatures, justificatifs de paiement, références bancaires (pour facturation uniquement)</li>
      </ul>

      <h3>3.3. Données des coachs universitaires américains</h3>
      <ul>
        <li>Nom, université, programme golf, fonction</li>
        <li>Email institutionnel, téléphone professionnel</li>
        <li>Historique des emails, notes de calls, statut de la relation</li>
      </ul>

      <h3>3.4. Données techniques</h3>
      <ul>
        <li>Adresse IP, navigateur, pages consultées, durée de session (30 jours)</li>
        <li>Cookies techniques pour authentification et préférences</li>
      </ul>

      <h2>4. Pourquoi et sur quelle base légale</h2>
      <ul>
        <li>
          <strong>Placement universitaire</strong> de l&apos;athlète → <em>exécution du contrat</em>
        </li>
        <li>
          <strong>Communication avec les coachs US</strong> → exécution du contrat + intérêt légitime
        </li>
        <li>
          <strong>Gestion administrative</strong> (facturation, comptabilité) → <em>obligation légale</em> (droit suisse)
        </li>
        <li>
          <strong>Statistiques internes</strong> → intérêt légitime, données agrégées uniquement
        </li>
        <li>
          <strong>Sécurité, lutte contre la fraude</strong> → intérêt légitime
        </li>
      </ul>

      <h2>5. Qui a accès à vos données</h2>

      <h3>5.1. Au sein d&apos;Dual Rise</h3>
      <ul>
        <li>L&apos;<strong>agent Dual Rise</strong> dédié accède au profil complet de l&apos;athlète qu&apos;il suit</li>
        <li>Le <strong>fondateur Nicolas Paviet</strong> accède à l&apos;ensemble des données (supervision opérationnelle)</li>
        <li>Les <strong>parents/tuteurs</strong> accèdent au profil de leur enfant</li>
      </ul>

      <h3>5.2. Sous-traitants techniques</h3>
      <ul>
        <li><strong>Supabase</strong> (base de données et auth) — Frankfurt (UE)</li>
        <li><strong>Vercel</strong> (hébergement applications web) — États-Unis avec CDN mondial</li>
        <li><strong>Resend</strong> (emails transactionnels) — États-Unis</li>
        <li><strong>Framer</strong> (site vitrine) — Pays-Bas (UE) avec CDN mondial</li>
        <li><strong>Mailmeteor</strong> (emails personnalisés aux coachs US) — UE</li>
        <li><strong>Google LLC</strong> (Google Workspace : Gmail, Drive, Sheets, Calendar, Forms) — États-Unis / UE selon le service</li>
        <li><strong>Anthropic</strong> (assistant IA Claude — voir clause 5.4) — États-Unis</li>
      </ul>

      <h3>5.3. Destinataires externes</h3>
      <ul>
        <li><strong>Coachs universitaires américains</strong> : reçoivent uniquement le profil sportif et académique (pas les données contractuelles, pas les notes internes)</li>
        <li><strong>Autorités compétentes</strong> : sur réquisition légale uniquement</li>
      </ul>

      <h3>5.4. Traitement par intelligence artificielle</h3>
      <p>
        Dual Rise utilise l&apos;assistant <strong>Claude</strong> (Anthropic, Inc.) pour des tâches opérationnelles limitées : mise à jour des résultats sportifs, vérification de cohérence des données, optimisation du suivi.
      </p>
      <ul>
        <li>Ces traitements ne produisent <strong>aucune décision à portée juridique</strong> ou affectant significativement l&apos;athlète au sens de l&apos;article 22 RGPD</li>
        <li>Les décisions de recrutement, de stratégie et de communication sont prises <strong>exclusivement par les agents humains Dual Rise</strong></li>
        <li>Les données <strong>ne sont pas utilisées pour entraîner</strong> des modèles d&apos;IA tiers</li>
      </ul>

      <h2>6. Transferts hors UE</h2>
      <p>
        L&apos;<strong>ensemble de nos bases de données est hébergé en UE</strong> (Frankfurt). Toutefois, certaines données peuvent être transférées aux États-Unis dans le cadre de nos sous-traitants américains (Vercel, Resend, Google LLC, Anthropic) et de la communication avec les coachs universitaires — finalité même de notre service.
      </p>
      <p>Ces transferts sont encadrés par :</p>
      <ul>
        <li>Les <strong>Clauses Contractuelles Types</strong> (CCT) adoptées par la Commission européenne (décision 2021/914)</li>
        <li>Les engagements contractuels de nos sous-traitants à respecter des garanties équivalentes au RGPD</li>
        <li>Le cadre <strong>Data Privacy Framework</strong> (DPF) UE-US pour les sous-traitants y adhérant</li>
      </ul>

      <h2>7. Durées de conservation</h2>
      <ul>
        <li><strong>Profil athlète actif</strong> : durée du contrat + 7 ans</li>
        <li><strong>Prospect sans contrat signé</strong> : 24 mois après dernier contact</li>
        <li><strong>Documents comptables et facturation</strong> : 10 ans (art. 958f CO suisse)</li>
        <li><strong>Emails et notifications</strong> : 24 mois</li>
        <li><strong>Logs techniques</strong> : 30 jours</li>
        <li><strong>Invitations en attente non utilisées</strong> : 6 mois</li>
      </ul>
      <p>À l&apos;issue de ces durées, les données sont supprimées ou anonymisées de manière irréversible.</p>

      <h2>8. Cookies</h2>
      <p>
        Nous utilisons uniquement des <strong>cookies strictement nécessaires</strong> au fonctionnement de l&apos;application (authentification, préférences). Aucun cookie publicitaire ni de profilage tiers n&apos;est utilisé.
      </p>
      <p>
        Pour la plateforme scout.usap, un outil de mesure d&apos;audience first-party (Flock by Lovable) est utilisé sans cookie identifiant et sans transfert de données vers des tiers.
      </p>

      <h2>9. Vos droits</h2>
      <p>
        Conformément au RGPD (articles 15-22) et à la LPD (articles 25-32), vous disposez des droits suivants&nbsp;:
      </p>
      <ul>
        <li><strong>Accès</strong> — obtenir une copie de toutes vos données</li>
        <li><strong>Rectification</strong> — demander la correction de données inexactes</li>
        <li><strong>Suppression</strong> («&nbsp;droit à l&apos;oubli&nbsp;») — dans les limites légales</li>
        <li><strong>Limitation</strong> — suspension temporaire du traitement</li>
        <li><strong>Portabilité</strong> — recevoir vos données dans un format structuré</li>
        <li><strong>Opposition</strong> — à certains traitements (intérêt légitime)</li>
        <li><strong>Retrait du consentement</strong> — à tout moment, pour les traitements basés sur consentement</li>
        <li><strong>Décisions automatisées</strong> — intervention humaine sur toute décision automatisée</li>
      </ul>
      <p>
        <strong>Comment exercer&nbsp;:</strong> écrivez à{' '}
        <a href="mailto:nicplancha@gmail.com">nicplancha@gmail.com</a>{' '}
        en précisant la nature de votre demande. Réponse sous un mois maximum.
      </p>
      <p><strong>En cas de litige</strong>&nbsp;:</p>
      <ul>
        <li>
          En France :{' '}
          <a href="https://www.cnil.fr/" target="_blank" rel="noopener noreferrer">CNIL</a>
        </li>
        <li>
          En Suisse :{' '}
          <a href="https://www.edoeb.admin.ch/" target="_blank" rel="noopener noreferrer">PFPDT</a>
        </li>
        <li>Dans d&apos;autres pays de l&apos;UE : votre autorité nationale</li>
      </ul>

      <h2>10. Traitement des données des mineurs</h2>
      <p>
        Une grande partie de notre activité concerne des <strong>athlètes mineurs</strong> (généralement âgés de 14 à 18 ans). Mesures renforcées&nbsp;:
      </p>
      <ul>
        <li><strong>Consentement parental requis</strong> pour tout athlète de moins de 16 ans</li>
        <li><strong>Information adaptée</strong> en langage clair et accessible</li>
        <li><strong>Minimisation renforcée</strong> : seule l&apos;année de naissance est stockée, pas la date complète</li>
        <li><strong>Pas de profilage publicitaire</strong>, aucune transmission marketing</li>
        <li><strong>Pas de décision automatisée</strong> affectant le mineur : toutes les recommandations sont validées par un agent humain</li>
        <li><strong>Usage de l&apos;image</strong> (photos, vidéos de swing) encadré par un consentement écrit dans le contrat signé entre Dual Rise et le représentant légal</li>
        <li><strong>Droit de retrait facilité</strong> à la majorité (suppression ou portabilité sous contrôle de l&apos;athlète)</li>
      </ul>

      <h2>11. Sécurité</h2>
      <ul>
        <li><strong>Hébergement en UE</strong> (Frankfurt, Allemagne) via Supabase</li>
        <li><strong>Chiffrement en transit</strong> (HTTPS / TLS 1.2+)</li>
        <li><strong>Chiffrement au repos</strong> (AES-256)</li>
        <li><strong>Protection mot de passe compromis</strong> (HaveIBeenPwned), vérification d&apos;email obligatoire</li>
        <li><strong>Contrôle d&apos;accès</strong> par rôles (athlète, parent, agent, coach, administrateur) — Row-Level Security</li>
        <li><strong>Sauvegardes</strong> chiffrées quotidiennes</li>
        <li><strong>Audit trimestriel</strong> des accès et journaux de sécurité</li>
        <li><strong>Notification de violation</strong> sous 72 heures (art. 33 RGPD)</li>
      </ul>

      <h2>12. Modifications de cette politique</h2>
      <p>
        Cette politique peut évoluer (changement de sous-traitant, nouvelle fonctionnalité, évolution réglementaire). Toute modification substantielle sera notifiée par email aux utilisateurs concernés, et la date de mise à jour sera modifiée en haut de ce document.
      </p>

      <h2>13. Contact</h2>
      <p>Pour toute question, demande ou réclamation relative à vos données&nbsp;:</p>
      <ul>
        <li>
          Email :{' '}
          <a href="mailto:nicplancha@gmail.com">nicplancha@gmail.com</a>
        </li>
        <li>Téléphone : +1-872-279-0009</li>
        <li>Courrier : US Athletic Performance Sàrl, Route des Acacias 48, 1227 Carouge (GE), Suisse</li>
      </ul>
    </>
  )
}
