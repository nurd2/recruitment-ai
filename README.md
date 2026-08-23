# AI Recruitment Monitoring System (MVP)

Single-tenant recruitment platform: manage job titles and hiring criteria, upload PDF/DOCX resumes, extract candidate data with text/OCR + AI validation, review AI job-title recommendations, and monitor candidates in a per-job-title pipeline. AI is decision support only — an application is created only after a recruiter explicitly confirms a job title.

Built on Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui (base-maia / Base UI), Drizzle ORM + PostgreSQL, Better Auth, Redis + BullMQ, Google Cloud Storage, and a provider-abstracted AI layer (OpenAI-compatible, DeepSeek, Gemini).

## Architecture

```
Upload (PDF/DOCX)
  → stored privately in GCS
  → Processing Job (BullMQ) staged steps:
      extract  → PDF text layer (pdfjs) / DOCX (mammoth); OCR fallback (tesseract.js or Python worker)
      validate → AI returns structured draft + per-field confidence/evidence (schema-validated)
      recommend→ AI scores active job titles (decision support only)
  → Review page: recruiter edits/confirms the draft
  → Confirm → Candidate created (or dedup reuse) + Application (only if a job title is chosen)
  → /job-title/[id] pipeline table: status changes, status history, audit log
```

Key design decisions are recorded in [docs/adr](./docs/adr/); the domain glossary is in [CONTEXT.md](./CONTEXT.md).

## Prerequisites

- Node 20+ / Bun 1.4+
- Docker (Postgres, Redis, fake-gcs-server for local dev)

## Setup

```bash
bun install
cp .env.example .env          # then fill in secrets (BETTER_AUTH_SECRET, API keys)
docker compose up -d          # postgres, redis, fake-gcs-server
bun run db:migrate            # apply Drizzle migrations
bun run db:seed               # demo admin + recruiter + job title
bun run dev                   # app on http://localhost:3000
bun run dev:worker            # app + processing worker
```

Demo accounts (from the seed):

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@recruitment.local` | `admin123!` |
| Recruiter | `recruiter@recruitment.local` | `recruiter123!` |

## Environment

See `.env.example` for the full list. Notable variables:

- `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `GCS_BUCKET`, `GCS_ENDPOINT` (set to `http://localhost:8000` for the local emulator), `GCS_PROJECT_ID`, `GCS_CREDENTIALS_JSON` (Railway service-account secret)
- `APP_ENCRYPTION_KEY` — AES-256-GCM key (from `openssl rand -hex 32`) used to encrypt AI provider API keys at rest. Providers, models, URLs, and keys are configured directly in **Admin → AI Provider** and are never stored or displayed in plaintext.
- `OCR_RUNTIME` (`node` = tesseract.js, self-contained | `python` = workers/ocr-python with pytesseract). For the Python path: `cd workers/ocr-python && pip install -r requirements.txt` and install the `tesseract` binary (e.g. `brew install tesseract`).
- `MAX_UPLOAD_SIZE_BYTES` (default 10 MB)

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run dev` | Next.js dev server |
| `bun run dev:worker` | Next.js dev server + BullMQ processing worker |
| `bun run worker` | BullMQ processing worker (extract → validate → recommend) |
| `bun run start:worker` | Production Next.js server + BullMQ processing worker |
| `bun run db:generate` | Generate a Drizzle migration from `src/db/schema.ts` |
| `bun run db:migrate` | Apply migrations |
| `bun run db:seed` | Seed demo data (idempotent) |
| `bun run lint` / `bun run build` | oxlint / production build |
| `bun run test` | Vitest unit tests |
| `bunx playwright test` | E2E smoke tests (needs dev server + seeded DB) |

## Railway production deployment

Railway runs the web server and BullMQ processing worker as separate services
from the shared `Dockerfile`. The image includes the Python OCR runtime and
Tesseract language data. PostgreSQL and Redis are Railway-managed services;
resume files remain in a private Google Cloud Storage bucket because Railway's
filesystem is ephemeral.

See [docs/railway-deployment.md](./docs/railway-deployment.md) for the service
setup, environment variables, GCS credentials, migration, admin bootstrap, and
post-deploy smoke test. Do not set `GCS_ENDPOINT` in production; it is only for
the local fake GCS emulator.

## Project structure

```
src/
  app/                # routes: login, job-titles, job-title/[id], upload,
                      # review/[resumeDocumentId], candidates, processing, admin/*
  components/         # shadcn UI + app components
  lib/
    auth.ts           # Better Auth (email/password, admin roles, Drizzle adapter)
    authz.ts          # server-side requireUser / requireRole guards
    storage.ts        # GCS private upload / download
    extract.ts        # PDF (pdfjs) + DOCX (mammoth) text extraction
    ocr/              # node (tesseract.js) + python workers, OCR_RUNTIME selected
    ai/               # provider abstraction, masking, validation, recommendations
    validation.ts     # zod schemas (domain + AI output)
    pii.ts            # email/phone local extraction + PII redaction
    dedup.ts          # candidate deduplication matching
  worker/             # BullMQ queue + processor
  db/                 # Drizzle schema, client, seed
workers/ocr-python/   # Python OCR worker (pypdfium2 + pytesseract)
tests/fixtures/       # sample resume.pdf used by tests / manual checks
docs/adr/             # architecture decision records
CONTEXT.md            # domain glossary
```

## Privacy & responsible AI

- Resumes are stored in a private GCS bucket and served only through an authenticated download endpoint.
- Address, date-of-birth/age, and phone are masked before text is sent to external AI providers (configurable per provider in Admin → AI).
- Age and address are never used for recommendation scoring; recommendations are labeled as decision support.
- All mutating actions (candidates, applications, statuses, documents, AI config, users) are written to the audit log with actor + timestamp.

## Roadmap gaps (documented in the PRD)

- OCR language data for `tesseract.js` is fetched from a CDN on first use; set `TESSERACT_LANG_PATH` for offline use.
- Retention/purge of soft-deleted records is deferred (kept forever in the MVP).
- Status transitions are free-form; a per-job-title transition matrix is a future option.
