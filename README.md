# NCA Prep Hub

A community-maintained, awesome-list-style index of prep resources for **NVIDIA certification exams** — study guides, practice repos, flashcards, and simulations. Entries are ranked by real signal (stars, freshness, uptime), not submission order.

**[Browse the live index →](https://kyle-law.github.io/awesome-nvidia-certification/)**

This project is fully static: a GitHub repo, GitHub Actions, and GitHub Pages. No backend, no database, zero hosting cost.

## How it works

1. Contributors add one entry to [`data/entries.yaml`](data/entries.yaml) via PR — just `url`, `title`, `certs`, `type`, `description`.
2. `validate.yml` checks the PR: schema, reachable URL, no duplicates.
3. On merge, `enrich-on-merge.yml` runs [`scripts/enrich.js`](scripts/enrich.js), which fetches GitHub metadata (stars, last updated, archived status) or does an alive-check for external sites, and writes the result to `data/data.json`.
4. `enrich-scheduled.yml` re-runs the same enrichment weekly so stats don't go stale.
5. `deploy-pages.yml` publishes [`site/`](site/) (plus the latest `data.json`) to GitHub Pages.

See [`plan.md`](plan.md) for the full build spec and [`CONTRIBUTING.md`](CONTRIBUTING.md) to add a resource.

## Repo structure

```
├─ data/
│  ├─ entries.yaml   # source of truth — contribution target
│  └─ data.json      # generated: entries.yaml + fetched metadata
├─ scripts/
│  ├─ enrich.js       # fetch metadata, rewrite data.json
│  └─ validate.js     # PR gate: schema, url resolves, no dupes
├─ site/              # static frontend (reads data.json)
└─ .github/workflows/ # validate, enrich-on-merge, enrich-scheduled, deploy-pages
```

## Local development

```bash
npm install
node scripts/validate.js   # lint data/entries.yaml
node scripts/enrich.js     # regenerate data/data.json (set GITHUB_TOKEN to avoid rate limits)

# serve the frontend against local data
cp data/data.json site/data.json
npx serve site
```

## Constraints

- No braindumps or leaked exam questions — legitimate prep material only.
- Stats are always auto-derived, never contributor-entered.
- NVIDIA certifications only.
