CREATE TABLE "job_title_headcount_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_title_id" uuid NOT NULL,
	"openings" integer NOT NULL,
	"effective_from" date NOT NULL,
	"changed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_title_lifecycle_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_title_id" uuid NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"changed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "application_candidate_job_unique";--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "recruitment_cycle" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "hired_date" date;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "hire_canceled_at" timestamp;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "hire_cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "withdrawal_type" text;--> statement-breakpoint
UPDATE "application" a
SET "hired_date" = hired."hired_date"
FROM (
  SELECT ash."application_id", MAX(((ash."changed_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::date AS "hired_date"
  FROM "application_status_history" ash
  INNER JOIN "job_title_status" status ON status."id" = ash."to_status_id"
  WHERE status."name" = 'Hired'
  GROUP BY ash."application_id"
) hired
WHERE hired."application_id" = a."id";--> statement-breakpoint
UPDATE "application" SET "withdrawal_type" = 'standard' WHERE "withdrawn" = true;--> statement-breakpoint
INSERT INTO "job_title_headcount_history" ("job_title_id", "openings", "effective_from")
SELECT "id", "openings", COALESCE("recruitment_start_date", ((("created_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::date) FROM "job_title";--> statement-breakpoint
INSERT INTO "job_title_lifecycle_history" ("job_title_id", "status", "effective_from")
SELECT "id", "lifecycle_status", COALESCE("recruitment_start_date", ((("created_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::date) FROM "job_title";--> statement-breakpoint
ALTER TABLE "job_title_headcount_history" ADD CONSTRAINT "job_title_headcount_history_job_title_id_job_title_id_fk" FOREIGN KEY ("job_title_id") REFERENCES "public"."job_title"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_title_headcount_history" ADD CONSTRAINT "job_title_headcount_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_title_lifecycle_history" ADD CONSTRAINT "job_title_lifecycle_history_job_title_id_job_title_id_fk" FOREIGN KEY ("job_title_id") REFERENCES "public"."job_title"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_title_lifecycle_history" ADD CONSTRAINT "job_title_lifecycle_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_title_headcount_history_job_idx" ON "job_title_headcount_history" USING btree ("job_title_id","effective_from");--> statement-breakpoint
CREATE INDEX "job_title_lifecycle_history_job_idx" ON "job_title_lifecycle_history" USING btree ("job_title_id","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "application_candidate_job_cycle_unique" ON "application" USING btree ("candidate_id","job_title_id","recruitment_cycle");
