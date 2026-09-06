ALTER TABLE "application" ADD COLUMN "withdrawal_date" date;
--> statement-breakpoint
UPDATE "application"
SET "withdrawal_date" = (("withdrawn_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date
WHERE "withdrawn" = true AND "withdrawn_at" IS NOT NULL;
