# Dual Rise — à VÉRIFIER / NETTOYER (checklist Nico)

> Tenue à jour par Claude Code au fil du travail. Coche ce qui est fait.

## 🔴 Sécurité / comptes de test (à faire dès que possible)
- [ ] **Remettre ton vrai mot de passe** sur le CEO `nicplancha@gmail.com` (projet **dualrise-scout**). J'y ai posé un mot de passe de test (mémo perso : c'est celui que je t'ai donné dans le chat) pour pouvoir me connecter et valider les écrans.
- [ ] **Supprimer le compte coach de test** `coach@dualrise.test` (projet dualrise-scout) — créé pour tester la vue coach.
- [ ] **Révoquer le PAT Supabase** (page Access Tokens) — portée large (voit aussi l'org USAP).
- [ ] Optionnel : re-reset les DB passwords de **USAP SCOUT** et **USAP family-dashboard** si tu ne veux pas qu'ils traînent (ils n'ont servi qu'en lecture pour les dumps de schéma).

## 🟠 À tester avec TON login admin (moi bloqué par la session coach de test)
- [ ] **Créer un joueur** : Admin → Athlete Management → Add New Athlete → onglet **Athletic** (doit être 100% tennis : UTR/WTN/rankings/hand/surface/style/height/weight) → **Create** → vérifier qu'il apparaît + que les champs tennis sont bien sauvegardés.
- [ ] **Éditer un joueur** : ouvrir un joueur en admin → section **Tennis Performance** → modifier UTR/WTN/etc. → **Save** → recharger → valeurs persistées.
- [ ] **Vue coach du browse** `/athletes` : se connecter en coach → filtres UTR/WTN/surface + cartes/list/table.

## 🟡 Git / infra
- [x] **`git init` + commits** dans `dualrise/` ✅ (fait par Claude Code : `.gitignore` propre, 0 secret/node_modules commité, checklist caviardée). Ajoute un **remote** GitHub + `git push` quand tu veux.
- [ ] Cosmétique : les classes CSS `usap-orange` / `usap-blue` (rendues en **rouge/navy** via le remap tailwind — pas de texte visible « usap ») pourraient être renommées `dualrise-*` un jour (gros find-replace, non urgent).
- [ ] Env `dashboard/.env.local` + clés **service_role** (scout + dashboard) + **RESEND_API_KEY** + domaine Resend Dual Rise (pour faire tourner le dashboard + les emails).
- [ ] `scout/.env` : déjà repointé dualrise-scout ✅. Deploy Scout (Cloudflare/Vercel) quand prêt.

## 🟢 Résidus USAP repérés à l'écran (à corriger)
- [ ] Sidebar admin : lien **« Ranking & Impact Story »** pointe encore vers `story.usathleticperformance.com`.
- [ ] Page login : contact `mailto:nicolas@usathleticperformance.com` (laissé car contact Dual Rise pas défini — donne-moi l'email/domaine Dual Rise).
- [ ] Décider **logo** Dual Rise (placeholder actuel), **domaine(s)**, **entité légale** (pages légales = placeholders).

## 🔵 Reste Phase 1 (dev — pas de ton côté)
- [x] AddNewAthlete : inputs phys/tech/tac (14 notes 0–10). ✅
- [ ] AdminAthleteDetail : nettoyer le bloc golf « scoring-override » restant.
- [x] AdminAthleteView : onglet **Overview** → tennis ✅ (reste l'onglet tournaments golf, mineur).
- [x] **Resources** : explainer golf → **tennis** ✅ (European Tennis Context, Dual Rise Star Rating, copy). *(reste : liens FFGOLF → FFT, et la table de rating basée sur avgScore golf = à refaire avec tes seuils UTR — décision produit)*
- [x] Sweep **« USAP »** (abréviation) user-facing → Dual Rise ✅ (restent des commentaires code, inoffensifs).
- [x] Modal `AthleteProfileModal` (quick-view coach) → tennis ✅ (UTR/WTN/National + Club).
- [x] Modal `SearchResultsModal` → tennis ✅ (badge UTR).
- [x] **Emails** (edge functions) : copy « Scout by Dual Rise » + golf→tennis, **redéployées** ✅. *(reste : le domaine d'envoi `@notifications.usathleticperformance.com` — à remplacer par ton domaine Resend Dual Rise vérifié ; l'appelant de `send-athlete-info` doit passer UTR/WTN dans les props ; `nicolas@usathleticperformance.com` = email admin de notif, à changer si besoin)*
- [ ] **Emails ne partiront pas** tant que **RESEND_API_KEY** n'est pas posé sur dualrise-scout (`supabase secrets set`) + domaine vérifié.
- [ ] **saved-search alerts** : clés de critères golf→tennis (le job tourne déjà en cron mais matche sur des critères golf).
- [ ] Fonctions **calculate-athlete-metrics / backfill-athlete-metrics** : calcul de scoring **golf** (le tennis ne s'en sert pas → à ignorer ou retirer).
- [x] `AddNewCoach` : « Men's/Women's Golf » → Tennis ✅.
- [ ] **CSV import/export** (`csvParser`, `csvExporter`, `DataImportExport`, `csvTournamentParser`, parser **FFGolf**) : format golf → **chantier spécialisé** (l'import tennis a un format différent : ITF/UTR, pas FFGolf). À traiter à part.
- [x] AdminAthleteDetail : bloc golf « scoring-override / Default Scoring Period » **retiré** du form d'édition ✅ (reste juste la clé interne `'Golf Performance'` pour le tracking du save — non visible).
- [ ] **Composants tournois partagés** (`TournamentResultsTable`, `BestRecentScoreDisplay`, `AthleteMetricsDisplay/Table`, `TournamentPerformanceTab`) : encore golf (rounds/par/CR/scoring). Utilisés dans les onglets tournaments admin + leaderboards. Chantier « analytics tournois golf → historique UTR / résultats matchs ». Note : la **fiche coach AthleteDetail a déjà sa propre table matchs tennis** (pas ce composant).
- [ ] Petit polish : Location du PDF affiche « Hasselt, BEL, Belgium » (redondance BEL+Belgium, côté données du seed).

## 📦 Données de démo
- Joueur seed : **Matiej Reiter** (slug `matiej-reiter`) — profil + 5 matchs.
- PDF de démo généré : `~/Downloads/Matiej_Reiter_DualRise.pdf` (rendu tennis à regarder).
