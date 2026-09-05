CREATE TABLE "holiday" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "holiday_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "sla_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grade" text NOT NULL,
	"working_days" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sla_policy_grade_unique" UNIQUE("grade")
);
--> statement-breakpoint
ALTER TABLE "job_title" ADD COLUMN "grade" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_title" ADD COLUMN "recruitment_start_date" date;--> statement-breakpoint
ALTER TABLE "job_title" ADD COLUMN "sla_working_days" integer DEFAULT 30 NOT NULL;
--> statement-breakpoint
UPDATE "job_title" SET "grade" = 'staff', "recruitment_start_date" = "created_at", "sla_working_days" = 30;
--> statement-breakpoint
INSERT INTO "sla_policy" ("grade", "working_days") VALUES ('staff', 30), ('manager', 60)
ON CONFLICT ("grade") DO NOTHING;
--> statement-breakpoint
INSERT INTO "job_title_status" ("job_title_id", "name", "position", "is_default", "active", "color")
SELECT jt."id", 'Hired', COALESCE(MAX(js."position"), -1) + 1, true, true, 'green'
FROM "job_title" jt
LEFT JOIN "job_title_status" js ON js."job_title_id" = jt."id"
WHERE NOT EXISTS (
  SELECT 1 FROM "job_title_status" existing
  WHERE existing."job_title_id" = jt."id" AND existing."name" = 'Hired'
)
GROUP BY jt."id";
