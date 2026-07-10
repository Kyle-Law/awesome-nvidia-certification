# NVIDIA Cert Prep Hub — build spec

Community-driven awesome-list aggregator for NVIDIA certification prep. Collects links to community repos/sites, ranked and categorized by cert. Fully static: GitHub repo + Actions + Pages. No backend, no database, zero cost.

## Repo structure
```
nvidia-cert-hub/
├─ README.md                 # awesome-list, grouped by cert
├─ data/
│  ├─ entries.yaml           # source of truth (contribution target)
│  └─ data.json              # generated state + auto-fetched metadata
├─ scripts/enrich.(js|py)    # fetch GitHub metadata, rewrite data.json
├─ .github/workflows/
│  ├─ validate.yml           # PR check: schema, url resolves, no dupes
│  ├─ enrich-on-merge.yml    # run enrich after merge
│  └─ enrich-scheduled.yml   # weekly cron: refresh all metadata
├─ site/ (or docs/)          # static frontend for GitHub Pages
│  ├─ index.html  app.js  style.css
└─ CONTRIBUTING.md
```

## Data model
Contributors edit `entries.yaml` and supply only human fields:
- `url` — GitHub repo, GitHub Pages, or external site
- `title`
- `certs` — list, e.g. `[NCA-GENL, NCA-AIIO]`
- `type` — `repo | simulation | flashcards | study-guide | site`
- `description` — one line

Auto-derived into `data.json` by the script (never hand-entered):
`source` (github/external), `stars`, `last_updated` (pushed_at), `language`, `topics`, `archived`, `alive` (http 200 check), `date_added` (first sighting, never overwritten), `last_checked`.

## Entry types
1. GitHub repo → full stats via API.
2. GitHub Pages (`user.github.io/project`) → resolve to backing repo `github.com/user/project`, use its stats.
3. External site → no stars/last_updated; store title, description, date_added, alive-check only.

## Enrich script (single, idempotent)
Reads `entries.yaml`. For GitHub-backed entries, batch-fetch via GitHub API using the Action's `GITHUB_TOKEN` (~5,000 req/hr). For external, alive-check only. Flag `archived` and dead links. Preserve `date_added`. Write `data.json`.

## CI/CD
- `validate.yml` — on PR: validate schema, url resolves, not duplicate.
- `enrich-on-merge.yml` — on merge to main: run enrich, commit data.json.
- `enrich-scheduled.yml` — weekly cron: re-run enrich across all entries (required, or stats freeze at add-time).

## Frontend (static, reads data.json)
Pure HTML/CSS/JS. Loads precomputed `data.json` — no client-side API calls, no rate limits. Categorized/filterable by cert. Three sort views: Top (stars), Recently updated (last_updated), Newly added (date_added). De-emphasize or hide archived/dead entries.

## Contribution flow
Contributor opens PR adding one entry to `entries.yaml` → `validate.yml` checks → maintainer merges → `enrich-on-merge.yml` fetches metadata → README + frontend update.

## Constraints
- No braindumps / leaked exam questions — legitimate prep only.
- Stats always auto-derived, never contributor-entered.
- Zero-server, zero-cost (public repo → free Actions + Pages).
- NVIDIA certs only.

## Build first
1. Entry schema (shape of one `entries.yaml` record + its `data.json` form).
2. The enrich script.