ALTER TABLE "application" DROP CONSTRAINT "application_job_title_id_job_title_id_fk";
--> statement-breakpoint
ALTER TABLE "application" ALTER COLUMN "job_title_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_job_title_id_job_title_id_fk" FOREIGN KEY ("job_title_id") REFERENCES "public"."job_title"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Treat existing soft-deleted Job Titles as permanently unavailable while retaining audit logs.
DELETE FROM "recommendation"
WHERE "job_title_id" IN (SELECT "id" FROM "job_title" WHERE "deleted_at" IS NOT NULL)
   OR "processing_result_id" IN (
     SELECT "processing_result"."id"
     FROM "processing_result"
     INNER JOIN "processing_job"
       ON "processing_job"."id" = "processing_result"."processing_job_id"
     WHERE "processing_job"."job_title_id" IN (
       SELECT "id" FROM "job_title" WHERE "deleted_at" IS NOT NULL
     )
   );--> statement-breakpoint
DELETE FROM "processing_result"
WHERE "processing_job_id" IN (
  SELECT "id" FROM "processing_job"
  WHERE "job_title_id" IN (SELECT "id" FROM "job_title" WHERE "deleted_at" IS NOT NULL)
);--> statement-breakpoint
DELETE FROM "processing_job"
WHERE "job_title_id" IN (SELECT "id" FROM "job_title" WHERE "deleted_at" IS NOT NULL);--> statement-breakpoint
DELETE FROM "application_status_history"
WHERE "application_id" IN (
  SELECT "id" FROM "application"
  WHERE "job_title_id" IN (SELECT "id" FROM "job_title" WHERE "deleted_at" IS NOT NULL)
);--> statement-breakpoint
UPDATE "application"
SET "job_title_id" = NULL, "current_status_id" = NULL
WHERE "job_title_id" IN (SELECT "id" FROM "job_title" WHERE "deleted_at" IS NOT NULL);--> statement-breakpoint
DELETE FROM "job_title_status"
WHERE "job_title_id" IN (SELECT "id" FROM "job_title" WHERE "deleted_at" IS NOT NULL);--> statement-breakpoint
DELETE FROM "job_title_headcount_history"
WHERE "job_title_id" IN (SELECT "id" FROM "job_title" WHERE "deleted_at" IS NOT NULL);--> statement-breakpoint
DELETE FROM "job_title_lifecycle_history"
WHERE "job_title_id" IN (SELECT "id" FROM "job_title" WHERE "deleted_at" IS NOT NULL);--> statement-breakpoint
DELETE FROM "job_title_sla_history"
WHERE "job_title_id" IN (SELECT "id" FROM "job_title" WHERE "deleted_at" IS NOT NULL);
