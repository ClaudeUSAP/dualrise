import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions légales — Dual Rise',
  description: 'Mentions légales de US Athletic Performance Sàrl.',
}

export default function LegalPage() {
  return (
    <>
      <h1>Mentions légales</h1>
      <p className="meta">Dernière mise à jour : 13 mai 2026</p>

      <h2>Éditeur du site</h2>
      <p>
        <strong>US Athletic Performance Sàrl</strong>
      </p>
      <ul>
        <li>Forme juridique : Société à responsabilité limitée (Sàrl) de droit suisse</li>
        <li>Siège social : Route des Acacias 48, 1227 Carouge (GE), Suisse</li>
        <li>Capital social : CHF 20&apos;000</li>
        <li>N° IDE : CHE-243.693.381</li>
        <li>N° au Registre du Commerce du Canton de Genève : CH-660.1.979.024-9</li>
        <li>Date d&apos;inscription au RC : 5 juin 2024 (statuts du 30 mai 2024)</li>
        <li>N° TVA : CHE-243.693.381 TVA (si assujetti)</li>
        <li>Téléphone : +1-872-279-0009</li>
        <li>
          Email :{' '}
          <a href="mailto:nicplancha@gmail.com">
            nicplancha@gmail.com
          </a>
        </li>
        <li>
          <strong>Directeur de la publication</strong> : Nicolas Pierre Paviet, Fondateur
        </li>
        <li>
          <strong>Organe de publication officiel</strong> : Feuille Officielle Suisse du Commerce (FOSC / SHAB)
        </li>
      </ul>

      <h2>Hébergement</h2>
      <ul>
        <li>
          <strong>usathleticperformance.com</strong> (et www) — Framer B.V., Stadhouderskade 55, 1072 AB Amsterdam, Pays-Bas — UE (Pays-Bas) avec CDN mondial
        </li>
        <li>
          <strong>scout.usathleticperformance.com</strong> — Lovable AB / Vercel Inc. — UE (Frankfurt) pour la base de données
        </li>
        <li>
          <strong>player.usathleticperformance.com</strong> — Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA — UE (Frankfurt) pour la base de données, CDN mondial pour les pages
        </li>
        <li>
          <strong>map.usathleticperformance.com</strong> — GitHub Pages (Microsoft Corporation, Redmond, WA, USA) — États-Unis avec CDN mondial
        </li>
      </ul>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus présents sur les sites Dual Rise (textes, images, vidéos, logo, charte graphique, architecture du site) sont la propriété exclusive de US Athletic Performance Sàrl ou de ses partenaires, et sont protégés par le droit suisse et international de la propriété intellectuelle.
      </p>
      <p>
        Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de Dual Rise.
      </p>
      <p>
        <strong>Photos et vidéos des athlètes</strong> : les photos et vidéos publiées proviennent de différentes sources (athlètes eux-mêmes, parents, Dual Rise, photographes mandatés) et sont utilisées avec autorisation expresse via le contrat signé entre Dual Rise et le représentant légal de chaque athlète (clause de droit à l&apos;image).
      </p>
      <p>
        Les noms, logos et marques des universités américaines et des fédérations sportives (NCAA, NAIA, FFGOLF, etc.) mentionnés sur les sites sont la propriété de leurs détenteurs respectifs. Leur utilisation s&apos;inscrit dans une démarche d&apos;information et n&apos;implique aucune affiliation ou partenariat sauf mention explicite.
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
        La consultation et l&apos;utilisation des sites Dual Rise sont régies par le <strong>droit suisse</strong>. Tout litige relatif à l&apos;utilisation des sites sera soumis à la compétence exclusive des <strong>tribunaux du Canton de Genève (Suisse)</strong>, sauf disposition légale impérative contraire.
      </p>
      <p>
        Les consommateurs résidant dans l&apos;Union européenne conservent le bénéfice des dispositions impératives de leur droit national.
      </p>

      <h2>Crédits</h2>
      <ul>
        <li>Conception et développement : équipe Dual Rise</li>
        <li>Photos et vidéos : Dual Rise, athlètes (avec autorisation), parents, partenaires</li>
        <li>Cartographie (map.usap) : basée sur les données publiques NCAA et les sources officielles des universités</li>
      </ul>
    </>
  )
}
