import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions légales — Dual Rise',
  description: 'Mentions légales de Dual Rise (provisoires).',
}

// ⚠️ TODO Dual Rise — mentions légales PROVISOIRES (placeholders).
// Anciennes mentions USAP (US Athletic Performance Sàrl) retirées le 23/07.
// À compléter avec la vraie entité juridique Dual Rise, l'adresse, les N° d'immatriculation,
// l'hébergement réel et à faire relire par un juriste AVANT toute mise en ligne publique.
export default function LegalPage() {
  return (
    <>
      <h1>Mentions légales</h1>
      <p className="meta">⚠️ Version provisoire — à compléter avant mise en ligne publique.</p>

      <h2>Éditeur du site</h2>
      <ul>
        <li>Raison sociale : <strong>Dual Rise</strong> [entité juridique à compléter]</li>
        <li>Forme juridique : [à compléter]</li>
        <li>Siège social : [adresse à compléter]</li>
        <li>N° d&apos;immatriculation : [à compléter]</li>
        <li>N° TVA : [à compléter]</li>
        <li>Téléphone : [à compléter]</li>
        <li>
          Email :{' '}
          <a href="mailto:nicplancha@gmail.com">nicplancha@gmail.com</a>
        </li>
        <li>
          <strong>Directeur de la publication</strong> : Nicolas Pierre Paviet, Fondateur
        </li>
      </ul>

      <h2>Hébergement</h2>
      <p>
        Sites hébergés par <strong>Vercel Inc.</strong> ; base de données par{' '}
        <strong>Supabase</strong>. [Coordonnées complètes des hébergeurs à compléter.]
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus présents sur les sites Dual Rise (textes, images, vidéos, logo, charte graphique, architecture du site) sont la propriété exclusive de Dual Rise ou de ses partenaires, et sont protégés par le droit de la propriété intellectuelle applicable.
      </p>
      <p>
        Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de Dual Rise.
      </p>
      <p>
        <strong>Photos et vidéos des athlètes</strong> : les photos et vidéos publiées proviennent de différentes sources (athlètes eux-mêmes, parents, Dual Rise, photographes mandatés) et sont utilisées avec autorisation expresse via le contrat signé entre Dual Rise et le représentant légal de chaque athlète (clause de droit à l&apos;image).
      </p>
      <p>
        Les noms, logos et marques des universités américaines et des fédérations sportives mentionnés sur les sites sont la propriété de leurs détenteurs respectifs. Leur utilisation s&apos;inscrit dans une démarche d&apos;information et n&apos;implique aucune affiliation ou partenariat sauf mention explicite.
      </p>

      <h2>Limitation de responsabilité</h2>
      <p>
        Dual Rise s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées sur ses sites. Toutefois, Dual Rise ne saurait garantir l&apos;exactitude, la précision ou l&apos;exhaustivité des informations mises à disposition.
      </p>
      <p>
        Les sites peuvent contenir des liens hypertextes vers des sites tiers (universités, fédérations, médias). Dual Rise n&apos;exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
      </p>

      <h2>Loi applicable et juridiction</h2>
      <p>
        La loi applicable et la juridiction compétente seront précisées dans la version définitive des présentes mentions légales. [À compléter selon l&apos;entité juridique Dual Rise.]
      </p>

      <h2>Crédits</h2>
      <ul>
        <li>Conception et développement : équipe Dual Rise</li>
        <li>Photos et vidéos : Dual Rise, athlètes (avec autorisation), parents, partenaires</li>
      </ul>
    </>
  )
}
