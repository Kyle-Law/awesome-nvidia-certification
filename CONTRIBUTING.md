# Contributing

Adding a resource is one PR, one entry in [`data/entries.yaml`](data/entries.yaml).

## Add an entry

Append to the `entries` list:

```yaml
  - url: https://github.com/owner/repo
    title: Display Name
    certs: [NCA-GENL]
    type: repo
    description: One plain sentence — what it is, no marketing.
```

| Field | Required | Notes |
|---|---|---|
| `url` | yes | GitHub repo, GitHub Pages site, or external URL. Must be unique and resolve (HTTP 2xx). |
| `title` | yes | Display name. |
| `certs` | yes | List of NVIDIA cert codes this applies to, e.g. `[NCA-GENL, NCA-AIIO]`. |
| `type` | yes | One of `repo`, `simulation`, `flashcards`, `study-guide`, `site`. |
| `description` | yes | One sentence. |

Do **not** add `stars`, `last_updated`, `date_added`, `alive`, or similar — those are computed automatically after merge. Adding them yourself will fail schema validation.

## What gets accepted

- Legitimate, original prep material: study notes, practice repos, simulations, flashcard decks, official docs.
- One resource per PR, so review stays fast.

## What gets rejected

- Braindumps or leaked/verbatim exam questions.
- Duplicate URLs (checked automatically).
- Entries for non-NVIDIA certifications.

## Before opening a PR

```bash
npm install
node scripts/validate.js
```

This runs the same schema/duplicate/URL check as CI. Fix anything it flags before pushing — `validate.yml` blocks the merge otherwise.

After merge, `enrich-on-merge.yml` fetches metadata and the live index updates automatically — no further action needed.
