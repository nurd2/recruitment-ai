# Railway Deployment

This application runs as two Railway services from the same repository:

- `web`: `bun run start`
- `worker`: `bun run worker`

The worker is required for every `Processing Job`. PostgreSQL and Redis are separate Railway-managed services. Resume files remain in the private Google Cloud Storage bucket; the Railway filesystem is ephemeral and must not be used for resume storage.

## 1. Create Railway services

1. Create a Railway project.
2. Add a PostgreSQL service and a Redis service.
3. Create a `web` service from this repository.
4. Create a second `worker` service from the same repository.
5. Both application services use the repository `Dockerfile`.
6. Set the service start commands:
   - `web`: `bun run start`
   - `worker`: `bun run worker`
7. Add a healthcheck to `web` for `/api/health`. Railway supplies the `PORT` value used by Next.js.
8. Give both application services the same variables below. Use Railway variable references for the PostgreSQL and Redis URLs rather than copying credentials.

## 2. Environment variables

Set these on both `web` and `worker`:

```text
DATABASE_URL=<Railway PostgreSQL connection string>
REDIS_URL=<Railway Redis connection string>
BETTER_AUTH_SECRET=<random secret, at least 32 bytes>
BETTER_AUTH_URL=https://<railway-generated-web-domain>
APP_ENCRYPTION_KEY=<64 hex characters from: openssl rand -hex 32>
GCS_BUCKET=<existing private bucket name>
GCS_PROJECT_ID=<Google Cloud project id>
GCS_CREDENTIALS_JSON=<service account JSON, stored as a Railway secret>
OCR_RUNTIME=python
OCR_LANGS=ind+eng
OCR_SCALE=3
AI_MAX_TOKENS=8192
AI_MAX_TOKENS_REASONING=16384
MAX_UPLOAD_SIZE_BYTES=10485760
``` 

Do not set `GCS_ENDPOINT` in production. It is only for the local `fake-gcs-server`. Keep the same `APP_ENCRYPTION_KEY` on both services permanently; changing it makes encrypted AI provider keys in the database unreadable.

The `GCS_CREDENTIALS_JSON` value is the complete service-account JSON. Do not commit it, put it in a Dockerfile, or print it in logs.

## 3. Configure Google Cloud Storage

Use an existing private bucket or create one in the selected Google Cloud project. Create a dedicated service account for this application and grant it the least-privilege bucket-level access required by the application. The current application uploads, downloads, signs, and deletes objects, so object create/read/delete access is required. Create a JSON key only if workload identity is not available under the organization's policy, then paste the JSON into `GCS_CREDENTIALS_JSON` in Railway.

Do not make the bucket public. Resume downloads go through the authenticated application endpoint.

## 4. Migrate and bootstrap the first admin

After the PostgreSQL service is ready, run the migration once from a shell using the production environment variables:

```bash
bun run db:migrate
```

Run the production seed once with strong, temporary variables:

```bash
SEED_MODE=production \
SEED_ADMIN_EMAIL=admin@example.com \
SEED_ADMIN_PASSWORD='<strong-password>' \
bun run db:seed
```

Production mode creates only the configured admin and is idempotent. It does not create the local demo recruiter or demo job title. Remove or rotate the seed password variable after the bootstrap. Configure Gemini from **Admin -> AI Provider** after logging in. Its API key is encrypted using `APP_ENCRYPTION_KEY` before being stored in PostgreSQL.

## 5. Deploy order

1. Add Railway PostgreSQL and Redis.
2. Set shared variables on `web` and `worker`.
3. Deploy `web` and confirm `/api/health` returns `{"ok":true}`.
4. Run `bun run db:migrate` once.
5. Run the production admin-only seed once.
6. Deploy and confirm `worker` is connected and running.
7. Log in using `BETTER_AUTH_URL`.
8. Configure Gemini in the admin screen.

## 6. Smoke test

Verify the full path with a real, non-sensitive test resume:

1. Log in as the bootstrapped admin.
2. Configure and test the Gemini provider.
3. Upload a PDF or DOCX resume.
4. Confirm the `Processing Job` progresses after the worker receives it from Redis.
5. Open the review page and confirm a Candidate.
6. Download the resume and confirm it is served only through the authenticated endpoint.
7. Restart the worker and verify retry processing does not create duplicate results.

If the web service is healthy but processing remains pending, inspect the worker logs first. If storage fails, verify bucket IAM, project ID, and the complete JSON value in `GCS_CREDENTIALS_JSON`.

## Account access boundary

Railway and Google Cloud login, billing, project selection, secret entry, and deployment approvals must be performed by an operator with access to those accounts. This repository contains the configuration and runbook, but it cannot deploy into an external account without an authenticated Railway/GCP session.
