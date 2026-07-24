# Dual Rise — à VÉRIFIER / NETTOYER (checklist Nico)

> Tenue à jour par Claude Code au fil du travail. Coche ce qui est fait.

## 🔴 Sécurité / comptes de test — ✅ FAIT
- [x] Mot de passe CEO `nicplancha@gmail.com` réinitialisé par Nico ✅
- [x] Compte coach de test `coach@dualrise.test` supprimé ✅ (par Claude Code)
- [x] **PAT Supabase révoqué** ✅ (⚠️ conséquence : plus de `supabase functions deploy` / CLI possible sur dualrise sans un nouveau PAT — mais tout est déjà déployé. L'accès **DB direct psql** reste possible avec le DB password.)
- [ ] Optionnel : re-reset les DB passwords de **USAP SCOUT** et **USAP family-dashboard** si tu ne veux pas qu'ils traînent (lecture seule pour les dumps).

## 🟠 À tester avec TON login admin (moi bloqué par la session coach de test)
- [ ] **Créer un joueur** : Admin → Athlete Management → Add New Athlete → onglet **Athletic** (doit être 100% tennis : UTR/WTN/rankings/hand/surface/style/height/weight) → **Create** → vérifier qu'il apparaît + que les champs tennis sont bien sauvegardés.
- [ ] **Éditer un joueur** : ouvrir un joueur en admin → section **Tennis Performance** → modifier UTR/WTN/etc. → **Save** → recharger → valeurs persistées.
- [ ] **Vue coach du browse** `/athletes` : se connecter en coach → filtres UTR/WTN/surface + cartes/list/table.

## 🟡 Git / infra
- [x] **`git init` + commits** dans `dualrise/` ✅ (fait par Claude Code : `.gitignore` propre, 0 secret/node_modules commité, checklist caviardée). Ajoute un **remote** GitHub + `git push` quand tu veux.
- [ ] Cosmétique : les classes CSS `usap-orange` / `usap-blue` (rendues en **rouge/navy** via le remap tailwind — pas de texte visible « usap ») pourraient être renommées `dualrise-*` un jour (gros find-replace, non urgent).
- [ ] Env `dashboard/.env.local` + clés **service_role** (scout + dashboard) + **RESEND_API_KEY** + domaine Resend Dual Rise (pour faire tourner le dashboard + les emails).
- [ ] `scout/.env` : déjà repointé dualrise-scout ✅. Deploy Scout (Cloudflare/Vercel) quand prêt.

## 🟢 Résidus USAP — ✅ PURGÉS (commit du 23/07)
- [x] Emails de contact `nicolas@`/`support@usathleticperformance.com` → **nicplancha@gmail.com** ✅ (Login, PasswordReset*, Registration*, AccountPending/Suspended, Register).
- [x] URLs prod/partage/reset `scout.usathleticperformance.com` → **https://dualrise.vercel.app** ✅ (routes.ts, ShareProfileModal, adminUsers, AthleteManagement).
- [x] Sidebar admin/agent « Ranking & Impact Story » (→ `story.usathleticperformance.com`) **retiré** ✅.
- [x] Resources onglet « placement » : 3 liens USAP (map/story) + sheet ranking golf → **« Coming soon »** (structure de l'onglet gardée pour rebrancher plus tard sur des données Dual Rise) ✅.
- [ ] **Déploiement Scout** = `dualrise.vercel.app` ✅. Quand tu auras un **vrai domaine** (dualrise.com…), reviens changer `PRODUCTION_URL` (routes.ts) + les 3 autres pour le mettre.
- [ ] Décider **logo** Dual Rise (placeholder actuel), **domaine(s)**, **entité légale** (pages légales = placeholders).

## ✅ Write path tennis VÉRIFIÉ au runtime (create + edit)
Testé en vrai le 23/07 : création d'un joueur via le form admin (UTR/WTN/surface/hand/club persistés en base) + édition (UTR modifié et sauvegardé). Joueur de test supprimé. **Créer/éditer un joueur tennis marche.**

## 🔵 Reste Phase 1 (dev — pas de ton côté)
- [x] AddNewAthlete : inputs phys/tech/tac (14 notes 0–10). ✅
- [ ] Mineur : dans le form d'édition (AdminAthleteDetail) section *Personal*, le champ « Club / Academy » pointe encore vers la colonne golf (`golf_club_team`) alors que la section *Tennis Performance* a le bon (`club_team`) → 2 champs « Club », l'un mal branché. À unifier.
- [x] AdminAthleteView : onglet **Overview** → tennis ✅ (reste l'onglet tournaments golf, mineur).
- [x] **Resources** : explainer golf → **tennis** ✅ (European Tennis Context, Dual Rise Star Rating, copy). *(reste : liens FFGOLF → FFT, et la table de rating basée sur avgScore golf = à refaire avec tes seuils UTR — décision produit)*
- [x] Sweep **« USAP »** (abréviation) user-facing → Dual Rise ✅ (restent des commentaires code, inoffensifs).
- [x] Modal `AthleteProfileModal` (quick-view coach) → tennis ✅ (UTR/WTN/National + Club).
- [x] Modal `SearchResultsModal` → tennis ✅ (badge UTR).
- [x] **Emails** (edge functions) : copy « Scout by Dual Rise » + golf→tennis, **redéployées** ✅. *(reste : le domaine d'envoi `@notifications.usathleticperformance.com` — à remplacer par ton domaine Resend Dual Rise vérifié ; l'appelant de `send-athlete-info` doit passer UTR/WTN dans les props ; `nicolas@usathleticperformance.com` = email admin de notif, à changer si besoin)*
- [ ] **Emails ne partiront pas** tant que **RESEND_API_KEY** n'est pas posé sur dualrise-scout (`supabase secrets set`) + domaine vérifié.
- [x] **saved-search alerts** → tennis ✅ (Athletes sérialise UTR/WTN/surface, edge function `run-saved-search-alerts` matche dessus, redéployée).
- [ ] Fonctions **calculate-athlete-metrics / backfill-athlete-metrics** : calcul de scoring **golf** (le tennis ne s'en sert pas → à ignorer ou retirer).
- [x] `AddNewCoach` : « Men's/Women's Golf » → Tennis ✅.
- [ ] **CSV import/export** (`csvParser`, `csvExporter`, `DataImportExport`, `csvTournamentParser`, parser **FFGolf**) : format golf → **chantier spécialisé** (l'import tennis a un format différent : ITF/UTR, pas FFGolf). À traiter à part.
- [x] AdminAthleteDetail : bloc golf « scoring-override / Default Scoring Period » **retiré** du form d'édition ✅ (reste juste la clé interne `'Golf Performance'` pour le tracking du save — non visible).
- [ ] **Composants tournois partagés** (`TournamentResultsTable`, `BestRecentScoreDisplay`, `AthleteMetricsDisplay/Table`, `TournamentPerformanceTab`) : encore golf (rounds/par/CR/scoring). Utilisés dans les onglets tournaments admin + leaderboards. Chantier « analytics tournois golf → historique UTR / résultats matchs ». Note : la **fiche coach AthleteDetail a déjà sa propre table matchs tennis** (pas ce composant).
- [ ] Petit polish : Location du PDF affiche « Hasselt, BEL, Belgium » (redondance BEL+Belgium, côté données du seed).

## 🖥️ DASHBOARD (Next.js) — rebrand + déploiement
- [x] **Rebrand USAP → Dual Rise** fait (23/07) : le dashboard n'avait eu que les couleurs, pas le texte. Balayé : « USAP » → « Dual Rise » (~30 fichiers : i18n, onboarding, login, emails, layouts), emails contact → **nicplancha@gmail.com**, liens d'invitation `player./agent.usathleticperformance.com` → `APP_HOST` (piloté par `NEXT_PUBLIC_SITE_URL`), carte Resources USAP retirée, UA string. **Build Next.js OK.** ✅
- [x] Email FROM → `noreply@dualrise.app` (placeholder ; à **vérifier dans Resend** quand tu as le domaine, sinon rien ne part). Domaine cible cohérent avec `lib/site.ts` (`agent.dualrise.app`).
- [ ] 🔴 **`/legal` (page publique) NON corrigée** : elle liste encore les **vrais** domaines + hébergeurs + entités USAP (Framer B.V., Lovable AB, adresses Vercel, `player./map.usathleticperformance.com`). Je **n'invente pas** d'entité légale / d'hébergeur pour Dual Rise → **à réécrire avec tes vraies infos** (raison sociale, hébergement réel) avant toute mise en ligne publique. Pareil à surveiller sur `/privacy` et `/terms` (le nom de marque est corrigé, mais vérifie les mentions légales de fond).
- [ ] **Déploiement Dashboard sur Vercel** : 2ᵉ projet Vercel, **Root Directory = `dashboard`**, env vars (voir plus bas). Nécessite les clés **service_role** (dashboard + scout) que tu récupères dans Supabase → Settings → API.
- [ ] `package.json` name = `usap-dashboard` (interne, non visible) — renommer un jour, cosmétique.

### Env vars Dashboard (à poser dans Vercel, cocher Production+Preview+Development)
- `NEXT_PUBLIC_SUPABASE_URL` = https://cuvrhulaocpndhrmgsrc.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon dualrise-dashboard)
- `SUPABASE_SERVICE_ROLE_KEY` = (service_role dualrise-dashboard) 🔒
- `SCOUT_SUPABASE_URL` = https://jwyyldkgvpylseqnctnm.supabase.co
- `SCOUT_ANON_KEY` = (anon dualrise-scout)
- `SCOUT_SUPABASE_SERVICE_KEY` = (service_role dualrise-scout) 🔒
- `SCOUT_URL` = https://dualrise.vercel.app
- `NEXT_PUBLIC_SITE_URL` = (URL du dashboard après 1er deploy, ex https://dualrise-dashboard.vercel.app)
- `RESEND_API_KEY` = re_… (bloqué tant que pas de domaine vérifié)
- `CRON_SECRET` = (généré, dans notre échange)
- `DIGEST_UNSUB_SECRET` = (généré, dans notre échange)

## 📦 Données de démo
- Joueur seed : **Matiej Reiter** (slug `matiej-reiter`) — profil + 5 matchs.
- PDF de démo généré : `~/Downloads/Matiej_Reiter_DualRise.pdf` (rendu tennis à regarder).
