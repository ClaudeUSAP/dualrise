# Dual Rise — Plan de clonage Scout + Dashboard pour le tennis

*Préparé le 14 juillet 2026. Agence : Dual Rise. Couleurs : bleu & rouge.*

---

## 1. Ce que j'ai trouvé (l'architecture réelle à répliquer)

Ton org Supabase **USAP** contient 3 projets. Seuls 2 nous concernent :

**SCOUT** (`bfxhruvkzidvznsyyryp`) — la plateforme côté coachs universitaires.
- Table centrale `athletes` (211 profils) — c'est **ici que se concentrent tous les champs spécifiques au golf**.
- Tables satellites : `athlete_statistics`, `tournaments` (1 422), `tournament_results` (3 874), `universities` (926), `favorites`, `contact_requests`, `saved_searches` + historique d'alertes, `users`/`user_roles` (coachs/agents/admin), `notifications`, `email_logs`.
- **15 edge functions** : emails (bienvenue, reset password, approbation coach, envoi d'info athlète…), alertes de recherches sauvegardées (`run-saved-search-alerts`), calcul de métriques athlètes, expiration de statut, etc.

**usap-family-dashboard** (`hwgekflmucrfboahmtbf`) — le dashboard joueur/famille/agent.
- Table `players` (138) **très légère** côté sport : identité, onboarding, langue, intégration Google Sheets par joueur (`sheet_id`), et surtout un lien `scout_athlete_id` → le profil sportif complet vit dans Scout, pas ici.
- Le gros du dashboard est **agnostique au sport** : `checklist_templates`/`checklist_progress` (traductions, NCAA/NAIA, IEE, visa, ambassade, documents…), `schools`/`school_assignments`/`school_ratings`, `player_criteria` (préférences universités), `calendar_events`, `player_interview_prep`, CRM interne, digests parents.
- 0 edge function (logique surtout front-end + DB + jobs).

**Conséquence clé** : ta propre intuition était juste — « il y aura très peu de choses à modifier ». Concrètement, **~90 % de l'adaptation golf→tennis se fait dans une seule table (`athletes` de Scout)**. Le checklist administratif, les universités, les visas, l'éligibilité, le CRM : tout reste identique.

---

## 2. La recommandation stratégique : oui, un Supabase séparé

Confirmé, c'est la bonne approche pour Dual Rise. Les deux apps sont **mono-tenant** (les données d'une seule agence par projet). Un projet séparé pour Dual Rise garantit :
- **Isolation totale des données** — le RLS est par projet, donc zéro risque qu'un coach voie un joueur de l'autre agence.
- **Facturation et accès propres** — tu peux donner un accès admin à Dual Rise sans jamais exposer USAP.
- **Branding, emails, domaines et schéma indépendants** — le schéma tennis peut diverger librement.

Repartir sur du multi-tenant partagé serait plus risqué (fuite de données) et beaucoup plus long à sécuriser. Le clone vers un projet neuf est la voie propre.

### ⚠️ Contrainte pratique n°1 — la création de l'org

Je **ne peux pas créer une organisation Supabase via mes outils** (les orgs sont liées à la facturation ; l'API ne l'expose pas). Deux options :

- **Option A (ton choix : org séparée)** — Tu crées l'org **« Dual Rise »** dans le dashboard Supabase (supabase.com/dashboard → New organization, ~2 min) et tu y attaches un moyen de paiement. Dès que c'est fait, je crée les 2 projets **dedans** et je clone tout.
- **Option B (garder l'élan)** — Je crée dès maintenant les 2 projets tennis dans ton org USAP existante, on les fait tourner, et on les **transfère vers l'org Dual Rise plus tard** (Supabase permet de déplacer un projet entre orgs que tu possèdes). Utile si tu veux que j'avance sans attendre.

Côté coût : créer l'org est **gratuit**. Les 2 projets tiennent sur le **plan Free (0 $)** — une org gratuite autorise 2 projets (500 Mo de DB chacun, pas de backups quotidiens, mise en pause après ~7 jours d'inactivité). On construit et valide sur Free pour **0 $**, puis on passe l'org en **Pro au lancement** : 25 $/mois (1er projet inclus) + 10 $/mois pour le 2e = **~35 $/mois pour les deux**.

---

## 3. La contrainte n°2 — retrouver le code front-end (le vrai blocage)

Le code des deux sites (**scout.** et **player.usathleticperformance.com**) **n'est pas dans Supabase** — Supabase n'héberge que la base + les edge functions. Pour cloner les apps, il me faut le code source du front-end, et aujourd'hui je ne sais pas encore où il est. La passerelle vers ton Mac s'est déconnectée en cours de route.

Voici comment on le retrouve (par ordre de simplicité) :

1. **GitHub** — Ces apps ont quasi certainement un repo Git (l'arborescence des edge functions montre une structure `supabase/functions/…` standard de repo). Si tu as un compte GitHub, les repos `scout` et `player`/`dashboard` y sont probablement. → Donne-moi l'accès ou les URLs et je clone.
2. **L'outil de build** — Vu la vitesse à laquelle plusieurs apps Supabase ont été créées, il est probable qu'elles aient été générées avec un builder type **Lovable** ou **Bolt** (React + Vite + Supabase). Si c'est le cas, le code est dans ton compte Lovable/Bolt et synchronisé sur GitHub. → Dis-moi si tu reconnais l'un de ces outils.
3. **Ton Mac** — Reconnecte le dossier de dev via « Add folder » dans l'app Claude, et je fouille pour retrouver les repos automatiquement.
4. **Depuis le site en ligne** — Approuve la lecture des URLs (elles ont besoin de ta validation) et j'identifie la stack + l'hébergeur, ce qui pointe souvent vers le repo.

**La question la plus utile pour toi maintenant** : est-ce que ces sites ont été construits avec **Lovable**, **Bolt**, ou codés « à la main » et poussés sur **GitHub** ? Ta réponse débloque toute la partie front-end.

---

## 4. Le mapping golf → tennis (table `athletes` de Scout)

Voici concrètement ce que je change dans le profil sportif. Tout le reste de la table (identité, académique, préférences universités, statut, agent, CRM, vidéos, photo, slug…) **reste identique**.

### On RETIRE (spécifique golf)
`scoring_average*` (toutes les variantes vs par / vs course rating / last_3/5/7/10), `wagr_ranking`, `french_adult_ranking*`, `drive_distance_carry`, `seven_iron_distance_carry`, `max_club_head_speed`, `trackman_report_link`, `golf_data_link`, `scoreboard_*` (données Clippd), `swing_coach`, `default_scoring_period_*`.

### On RENOMME / ADAPTE
| Golf | Tennis |
|---|---|
| `golf_club_team` | `club_team` (ex : Tennis Spora) |
| `tournament_results_link` | `utr_results_link` |
| — | `wtn_profile_link` |

### On AJOUTE (spécifique tennis)
- **Classements** : `utr` (num), `wtn` (num), `national_ranking` (texte, ex « n°11 »), `national_ranking_country`, `itf_junior_ranking`.
- **Profil de jeu** : `dominant_hand` (Gaucher/Droitier), `backhand_type` (1 main / 2 mains), `preferred_surface` (Hard/Terre/Gazon), `play_style` (ex Aggressive Baseliner), `height_cm`, `weight_kg`, `city`.
- **Capacités physiques** (0–10) : `flexibility`, `strength`, `endurance`.
- **Capacités techniques** (0–10) : `serve`, `forehand`, `backhand`, `volley`, `smash`, `baseline_game`, `net_game`.
- **Capacités tactiques** (0–10) : `decision_making`, `adaptability`, `mental_resilience`, `anticipation`.
- **Texte** : `strengths`, `weaknesses`, `areas_of_improvement`, `best_results`, `recent_results`, `objectives`, `tennis_iq_comments`.
- **Notes** : `questionnaire_notes` (copier/coller des réponses du questionnaire — ta suggestion).

### Tables satellites
- `tournaments` : retirer `yardage`/`course_par`/`course_slope`/`course_rating` ; ajouter `surface`, `draw_size`, catégories ITF (J30, J60, M25…). *Note* : côté tennis, comme tu l'as dit, l'historique de matchs vient surtout d'UTR et la vidéo prime — ce sous-système sera plus léger.
- `athlete_statistics` : la structure est déjà générique (`metric_type`/`period`/`value`), on la garde telle quelle.
- **Idée que tu as eue et qui est excellente** : relier le profil au lien UTR + WTN pour une mise à jour hebdo automatique du classement. C'est faisable via une edge function `refresh-utr-wtn` + un cron — je le note comme évolution (phase 2), une fois la base en place.

Le champ « profil sportif » du **dashboard** affichera simplement ces mêmes données tirées de Scout via `scout_athlete_id`, plus la rubrique **Notes** = questionnaire. Aucun nouveau système à recréer.

---

## 5. Plan d'exécution

**Ce que je fais dès que l'org (ou le feu vert Option B) est là — sans autre intervention de ta part :**
1. Créer les 2 projets Supabase Dual Rise (Scout + Dashboard).
2. Cloner intégralement les schémas, en appliquant le mapping tennis ci-dessus.
3. Recréer les RLS policies, les 15 edge functions, les crons et la config email.
4. Créer le profil complet de **Matiej Reiter** (toutes les données de ton message + le questionnaire en Notes ; la photo dès que tu me la fournis).

**Ce qui a besoin de toi :**
- (A) Créer l'org **Dual Rise** dans Supabase *ou* me dire « go Option B » (build dans USAP, transfert plus tard).
- (B) Me dire où est le code front-end (Lovable / Bolt / GitHub / reconnecter le Mac) → débloque le clone + rebranding bleu/rouge des 2 sites.
- (C) M'envoyer la **photo de Matiej** et le **questionnaire** (le PDF que tu as joint est bien reçu — je m'en sers pour la rubrique Notes).
- (D) Approuver le coût des projets Supabase quand je te le présenterai.

**Ordre recommandé** : (A) + (B) d'abord. Avec ça je peux monter la base tennis complète *et* attaquer le front-end en parallèle.

---

## 6. Coûts (à confirmer)
- Supabase : **0 $ sur le plan Free** pour construire (2 projets gratuits/org) ; **~35 $/mois en Pro au lancement** (25 $ 1er projet inclus + 10 $ le 2e).
- Hébergement front-end (Vercel/Netlify/builder) : selon la stack qu'on identifie.
- Domaine Dual Rise : à prévoir (ex `scout.dualrise.xxx`, `player.dualrise.xxx`).
