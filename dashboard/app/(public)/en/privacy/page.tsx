import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — USAP',
  description:
    'Privacy policy of US Athletic Performance Sàrl, GDPR and Swiss FADP compliant.',
}

export default function PrivacyPageEN() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="meta">Last updated: May 13, 2026</p>

      <p>
        Cette page est également disponible en <a href="/privacy">français</a>.
      </p>

      <h2>1. Who we are</h2>
      <p>
        <strong>US Athletic Performance Sàrl</strong> (hereinafter &quot;USAP&quot;, &quot;we&quot; or &quot;our&quot;)
      </p>
      <ul>
        <li>Registered office: Route des Acacias 48, 1227 Carouge (GE), Switzerland</li>
        <li>Legal form: Swiss limited liability company (Sàrl)</li>
        <li>Share capital: CHF 20,000</li>
        <li>UID / Business identification number: CHE-243.693.381</li>
        <li>Geneva Commercial Register number: CH-660.1.979.024-9</li>
        <li>Phone: +1-872-279-0009</li>
        <li>
          Email:{' '}
          <a href="mailto:nicolas@usathleticperformance.com">
            nicolas@usathleticperformance.com
          </a>
        </li>
        <li>Publication director: Nicolas Pierre Paviet, Founder</li>
      </ul>
      <p>
        USAP is a Swiss agency specialized in placing European young golfers into U.S. college golf programs (NCAA Division I, II, III, NAIA, JUCO).
      </p>
      <p>
        USAP acts as <strong>data controller</strong> under the EU General Data Protection Regulation (GDPR) and the Swiss Federal Act on Data Protection (FADP).
      </p>

      <h2>2. Data protection contact</h2>
      <p>
        USAP has not appointed a Data Protection Officer (DPO). For any question or to exercise your rights:
      </p>
      <ul>
        <li>
          Email:{' '}
          <a href="mailto:nicolas@usathleticperformance.com">
            nicolas@usathleticperformance.com
          </a>
        </li>
        <li>Phone: +1-872-279-0009</li>
      </ul>
      <p>
        We commit to responding within <strong>one month</strong> maximum (Article 12 GDPR).
      </p>

      <h2>3. What data we collect</h2>

      <h3>3.1. Athlete data</h3>
      <ul>
        <li>
          <strong>Identification</strong>: first name, last name, gender, nationality, <strong>year</strong> of birth (not full date — minimization)
        </li>
        <li>
          <strong>Contact</strong>: email, phone (of the minor athlete or legal guardian)
        </li>
        <li>
          <strong>Sports data</strong>: golf club, FFGOLF / EGR / WAGR rankings, tournament results (past two seasons), swing videos, profile picture
        </li>
        <li>
          <strong>Academic data</strong>: GPA, SAT / ACT / TOEFL / Duolingo scores, translated transcripts, NCAA / NAIA evaluations
        </li>
        <li>
          <strong>Recruitment criteria</strong>: family budget, target regions and divisions, academic goals
        </li>
        <li>
          <strong>Internal notes</strong>: confidential observations produced by the dedicated USAP agent
        </li>
      </ul>

      <h3>3.2. Legal guardian data</h3>
      <ul>
        <li>First name, last name, relationship to the athlete</li>
        <li>Email, phone</li>
        <li>Contract data: signatures, payment proofs, banking references (for billing only)</li>
      </ul>

      <h3>3.3. U.S. college coach data</h3>
      <ul>
        <li>Name, university, golf program, role</li>
        <li>Institutional email, professional phone</li>
        <li>Interaction history, call notes, relationship status</li>
      </ul>

      <h3>3.4. Technical data</h3>
      <ul>
        <li>IP address, browser, pages visited, session duration (30 days)</li>
        <li>Technical cookies for authentication and preferences</li>
      </ul>

      <h2>4. Why we process your data and legal basis</h2>
      <ul>
        <li>
          <strong>Placement of the athlete in a U.S. college program</strong> → <em>contract performance</em>
        </li>
        <li>
          <strong>Communication with U.S. coaches</strong> → contract performance + legitimate interest
        </li>
        <li>
          <strong>Administrative management</strong> (billing, accounting) → <em>legal obligation</em> (Swiss law)
        </li>
        <li>
          <strong>Internal statistics</strong> → legitimate interest, aggregated data only
        </li>
        <li>
          <strong>Security and fraud prevention</strong> → legitimate interest
        </li>
      </ul>

      <h2>5. Who has access to your data</h2>

      <h3>5.1. Within USAP</h3>
      <ul>
        <li>The dedicated <strong>USAP agent</strong> accesses the full profile of the athlete they support</li>
        <li><strong>Founder Nicolas Paviet</strong> has access to all data (operational oversight)</li>
        <li><strong>Parents/guardians</strong> access their child&apos;s profile</li>
      </ul>

      <h3>5.2. Technical subprocessors</h3>
      <ul>
        <li><strong>Supabase</strong> (database and auth) — Frankfurt (EU)</li>
        <li><strong>Vercel</strong> (web application hosting) — United States with global CDN</li>
        <li><strong>Resend</strong> (transactional emails) — United States</li>
        <li><strong>Framer</strong> (marketing site) — Netherlands (EU) with global CDN</li>
        <li><strong>Mailmeteor</strong> (bulk personalized email outreach to U.S. coaches) — EU</li>
        <li><strong>Google LLC</strong> (Google Workspace) — United States / EU depending on the service</li>
        <li><strong>Anthropic</strong> (AI assistant Claude — see clause 5.4) — United States</li>
      </ul>

      <h3>5.3. External recipients</h3>
      <ul>
        <li><strong>U.S. college coaches</strong>: receive only the sports and academic profile (not contract data, not internal notes)</li>
        <li><strong>Competent authorities</strong>: only upon legal request</li>
      </ul>

      <h3>5.4. AI processing</h3>
      <p>
        USAP uses the AI assistant <strong>Claude</strong> (Anthropic, Inc.) for limited operational tasks: sports results updates, data consistency checks, file tracking optimization.
      </p>
      <ul>
        <li>This processing does <strong>not produce decisions with legal or significant effects</strong> on the athlete within the meaning of Article 22 GDPR</li>
        <li>Recruitment decisions, strategy and communication are <strong>exclusively made by human USAP agents</strong></li>
        <li>Data <strong>is not used to train</strong> third-party AI models</li>
      </ul>

      <h2>6. Data transfers outside the EU</h2>
      <p>
        <strong>All our databases are hosted in the EU</strong> (Frankfurt). However, some data may be transferred to the United States in the context of our U.S.-based subprocessors (Vercel, Resend, Google LLC, Anthropic) and communication with U.S. college coaches — the very purpose of our service.
      </p>
      <p>These transfers are framed by:</p>
      <ul>
        <li><strong>Standard Contractual Clauses</strong> (SCCs) adopted by the European Commission (Decision 2021/914)</li>
        <li>Contractual commitments of our subprocessors to respect GDPR-equivalent guarantees</li>
        <li>The <strong>EU-US Data Privacy Framework</strong> (DPF) for adhering subprocessors</li>
      </ul>

      <h2>7. Retention periods</h2>
      <ul>
        <li><strong>Active athlete profile</strong>: contract duration + 7 years</li>
        <li><strong>Prospect without signed contract</strong>: 24 months after last contact</li>
        <li><strong>Accounting and billing documents</strong>: 10 years (Swiss art. 958f CO)</li>
        <li><strong>Emails and notifications</strong>: 24 months</li>
        <li><strong>Technical logs</strong>: 30 days</li>
        <li><strong>Unused pending invitations</strong>: 6 months</li>
      </ul>
      <p>At the end of these periods, data is permanently deleted or anonymized.</p>

      <h2>8. Cookies</h2>
      <p>
        We use only <strong>strictly necessary cookies</strong> for application functionality (authentication, preferences). No advertising or third-party profiling cookies are used.
      </p>
      <p>
        For the scout.usap platform, a first-party analytics tool (Flock by Lovable) is used without identifying cookies and without third-party data transfers.
      </p>

      <h2>9. Your rights</h2>
      <p>
        Under GDPR (Articles 15-22) and FADP (Articles 25-32), you have the following rights:
      </p>
      <ul>
        <li><strong>Access</strong> — obtain a copy of all your data</li>
        <li><strong>Rectification</strong> — request correction of inaccurate data</li>
        <li><strong>Deletion</strong> (right to be forgotten) — within legal limits</li>
        <li><strong>Restriction</strong> — temporary suspension of processing</li>
        <li><strong>Portability</strong> — receive your data in a structured format</li>
        <li><strong>Objection</strong> — to certain processing (legitimate interest)</li>
        <li><strong>Consent withdrawal</strong> — at any time, for consent-based processing</li>
        <li><strong>Automated decisions</strong> — human intervention on any automated decision</li>
      </ul>
      <p>
        <strong>How to exercise:</strong> write to{' '}
        <a href="mailto:nicolas@usathleticperformance.com">nicolas@usathleticperformance.com</a>{' '}
        specifying the nature of your request. Reply within one month maximum.
      </p>
      <p><strong>In case of dispute:</strong></p>
      <ul>
        <li>
          France:{' '}
          <a href="https://www.cnil.fr/" target="_blank" rel="noopener noreferrer">CNIL</a>
        </li>
        <li>
          Switzerland:{' '}
          <a href="https://www.edoeb.admin.ch/" target="_blank" rel="noopener noreferrer">FDPIC</a>
        </li>
        <li>Other EU countries: your national authority</li>
      </ul>

      <h2>10. Processing of minors&apos; data</h2>
      <p>
        A large part of our business concerns <strong>minor athletes</strong> (typically aged 14 to 18). Enhanced measures:
      </p>
      <ul>
        <li><strong>Parental consent required</strong> for any athlete under 16</li>
        <li><strong>Adapted information</strong> in clear and accessible language</li>
        <li><strong>Enhanced minimization</strong>: only year of birth is stored, not the full date</li>
        <li><strong>No advertising profiling</strong>, no marketing transmission</li>
        <li><strong>No automated decision-making</strong> affecting the minor: all recommendations are validated by a human agent</li>
        <li><strong>Image usage</strong> (photos, swing videos) framed by written consent in the contract signed between USAP and the legal guardian</li>
        <li><strong>Facilitated right of withdrawal</strong> at majority (deletion or portability under the athlete&apos;s control)</li>
      </ul>

      <h2>11. Security</h2>
      <ul>
        <li><strong>EU hosting</strong> (Frankfurt, Germany) via Supabase</li>
        <li><strong>Encryption in transit</strong> (HTTPS / TLS 1.2+)</li>
        <li><strong>Encryption at rest</strong> (AES-256)</li>
        <li><strong>Compromised password protection</strong> (HaveIBeenPwned), mandatory email verification</li>
        <li><strong>Access control</strong> by roles (athlete, parent, agent, coach, administrator) — Row-Level Security</li>
        <li><strong>Encrypted daily backups</strong></li>
        <li><strong>Quarterly audit</strong> of access and security logs</li>
        <li><strong>Breach notification</strong> within 72 hours (Article 33 GDPR)</li>
      </ul>

      <h2>12. Changes to this policy</h2>
      <p>
        This policy may evolve (subprocessor change, new feature, regulatory change). Any material modification will be notified by email to affected users and the update date will be modified at the top of this document.
      </p>

      <h2>13. Contact</h2>
      <p>For any question, request or complaint regarding your data:</p>
      <ul>
        <li>
          Email:{' '}
          <a href="mailto:nicolas@usathleticperformance.com">nicolas@usathleticperformance.com</a>
        </li>
        <li>Phone: +1-872-279-0009</li>
        <li>Mail: US Athletic Performance Sàrl, Route des Acacias 48, 1227 Carouge (GE), Switzerland</li>
      </ul>
    </>
  )
}
