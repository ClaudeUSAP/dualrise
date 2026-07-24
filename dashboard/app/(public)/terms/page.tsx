import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conditions générales d’utilisation — Dual Rise',
}

export default function TermsPage() {
  return (
    <>
      <h1>Conditions générales d&apos;utilisation</h1>
      <p className="meta">Dernière mise à jour : 11 mai 2026</p>

      <h2>1. Objet</h2>
      <p>
        Le présent dashboard est un outil privé mis à disposition par US
        Athletic Performance Sàrl pour permettre aux Athlètes, à leurs
        représentants légaux, et aux agents Dual Rise de suivre le parcours de
        recrutement universitaire.
      </p>

      <h2>2. Accès</h2>
      <p>L&apos;accès est strictement réservé :</p>
      <ul>
        <li>À l&apos;Athlète bénéficiaire d&apos;un contrat Dual Rise en cours</li>
        <li>À ses parents ou représentants légaux</li>
        <li>Aux agents Dual Rise en charge de son dossier</li>
        <li>Au fondateur Dual Rise</li>
      </ul>
      <p>
        L&apos;accès est nominatif et non-cessible. Toute tentative
        d&apos;accès non autorisé est interdite.
      </p>

      <h2>3. Compte</h2>
      <p>
        L&apos;accès se fait via un magic link envoyé par email.
        L&apos;utilisateur s&apos;engage à conserver la confidentialité de son
        adresse email associée et à signaler toute compromission.
      </p>

      <h2>4. Comportement attendu</h2>
      <p>L&apos;utilisateur s&apos;engage à :</p>
      <ul>
        <li>
          Ne pas tenter d&apos;accéder à des données qui ne le concernent pas
        </li>
        <li>Ne pas perturber le fonctionnement du service</li>
        <li>
          Ne pas partager les informations confidentielles accessibles via le
          dashboard avec des tiers
        </li>
      </ul>

      <h2>5. Disponibilité</h2>
      <p>
        Le service est fourni sur la base d&apos;un best-effort. Dual Rise ne
        garantit aucun SLA spécifique. Des interruptions ponctuelles peuvent
        survenir pour maintenance ou évolution.
      </p>

      <h2>6. Sanction</h2>
      <p>
        En cas d&apos;usage abusif, Dual Rise se réserve le droit de suspendre ou
        résilier l&apos;accès au compte, sans préjudice des recours légaux.
      </p>

      <h2>7. Relation contractuelle</h2>
      <p>
        Le contrat de prestation Dual Rise signé entre les Parties demeure le
        document légal principal. Les présentes CGU complètent ce contrat pour
        ce qui concerne l&apos;usage du dashboard.
      </p>

      <h2>8. Modification</h2>
      <p>
        Dual Rise peut modifier ces CGU à tout moment. Les modifications
        substantielles seront notifiées aux utilisateurs.
      </p>

      <h2>9. Droit applicable</h2>
      <p>
        Droit suisse. Tout litige sera porté devant les tribunaux du canton de
        Genève (recours Tribunal fédéral réservé).
      </p>
    </>
  )
}
