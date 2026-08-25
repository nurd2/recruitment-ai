ALTER TABLE "job_title" ADD COLUMN "lifecycle_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
UPDATE "job_title" SET "lifecycle_status" = CASE WHEN "active" THEN 'active' ELSE 'fulfilled' END;
UPDATE "job_title" AS jt
SET "lifecycle_status" = 'fulfilled'
WHERE "active" = true
	AND EXISTS (
		SELECT 1
		FROM "application" AS a
		INNER JOIN "job_title_status" AS jts ON jts."id" = a."current_status_id"
		WHERE a."job_title_id" = jt."id"
			AND a."withdrawn" = false
			AND jts."name" = 'Hired'
	);