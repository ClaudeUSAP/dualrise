

# Two coach-view display bugs

## Audit findings

### Bug 1 — GPA "3.5" leak

**Root cause:** five mapping sites use `Number(athlete.academic_gpa) || 3.5`. Because `0 || x` and `NaN || x` short-circuit to `x`, any athlete with null/missing GPA gets remapped to `3.5`. Downstream renderers (which correctly use `gpa ? ... : 'N/A'`) then see a truthy `3.5` and display it. The DB **does** expose the real value via `athletes_safe.academic_gpa` (PII-gated by favourite/admin checks); the bug is purely the JS mapping.

| File | Line | Current | Fix |
|---|---|---|---|
| `src/pages/Athletes.tsx` | 359 | `gpa: Number(athlete.academic_gpa) \|\| 3.5` | `gpa: athlete.academic_gpa != null ? Number(athlete.academic_gpa) : undefined` |
| `src/pages/Index.tsx` | 31 | same | same |
| `src/pages/SavedSearches.tsx` | 377 | same | same |
| `src/components/SearchResultsModal.tsx` | 98 | same | same |
| `src/pages/Favorites.tsx` | 1133 | `gpa: Number(f.athlete.academic_gpa ?? 3.5)` | `gpa: f.athlete.academic_gpa != null ? Number(f.athlete.academic_gpa) : undefined` |

Then two render sites that currently call `.toFixed()` unguarded need null guards (because the upstream value can now be undefined):

| File | Line | Current | Fix |
|---|---|---|---|
| `src/pages/SavedSearches.tsx` | 1041 | `{athlete.gpa.toFixed(2)}` | `{athlete.gpa != null ? athlete.gpa.toFixed(2) : 'N/A'}` |
| `src/components/SearchResultsModal.tsx` | 223 | `GPA {athlete.gpa.toFixed(2)}` | `GPA {athlete.gpa != null ? athlete.gpa.toFixed(2) : 'N/A'}` |

Already-correct render sites (no change needed):
- `AthleteCard.tsx:172` → `gpa?.toFixed(2) || 'N/A'`
- `AthleteDetail.tsx:703, 858, 1087, 1110` → all use `gpa ? ... : 'N/A'`
- `Athletes.tsx:1299, 1438, 1573, 1675` → all use `gpa ? .toFixed(2) : 'N/A'`
- `Favorites.tsx:391, 603, 1034` → all use `?.toFixed(...) || 'N/A'`

Also out of scope (correct as-is):
- `SavedSearches.tsx:107,110` — preset filter "GPA 3.5+", legitimate constant
- `AthleteProfileModal.tsx:157` — uses `|| 0`, downstream calc context, not display

### Bug 2 — "Tnull" in Recent Tournament Highlight

**Root cause:** `src/pages/AthleteDetail.tsx:940`:
```ts
{tournamentResults[0].position === 1 ? '🏆' : `T${tournamentResults[0].position}`}
```
When `position` is null (results imported without a numeric position — common for team-format / WD / DQ entries per the existing total-score-validation memory), the template literal evaluates to `"Tnull"`.

| File | Line | Current | Fix |
|---|---|---|---|
| `src/pages/AthleteDetail.tsx` | 940 | unguarded `T${position}` | Wrap the `<p>` in `{position != null && (...)}` so the position line is hidden entirely when null. Score, vs Par, vs CR remain visible. |

Other surfaces that render `T${position}` already null-guard correctly:
- `Athletes.tsx:995` → `{recent.position ? \`T${recent.position}\` : 'Recent result'}` ✅
- `TournamentResultsTable` and admin tables use existing utilities — not in coach detail-page scope of this report.

No admin surfaces touched.

## Acceptance

1. `tsc --noEmit` clean
2. Coach Dashboard / Athletes browse / AthleteDetail / Favorites / SavedSearches preview / SearchResultsModal — athletes with no GPA in DB display `N/A`, never `3.50`. Athletes with real GPA display their real value.
3. Coach AthleteDetail — Recent Tournament Highlight: never displays `Tnull`. When position is null, the position line is hidden; tournament name, year/location, score and vs Par/CR remain visible.
4. No regressions on admin surfaces (no admin file touched).

