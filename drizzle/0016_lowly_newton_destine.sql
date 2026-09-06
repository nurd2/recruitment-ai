CREATE TABLE "job_title_sla_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_title_id" uuid NOT NULL,
	"recruitment_start_date" date NOT NULL,
	"sla_working_days" integer NOT NULL,
	"effective_from" date NOT NULL,
	"changed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "job_title_sla_history" ("job_title_id", "recruitment_start_date", "sla_working_days", "effective_from")
SELECT "id", COALESCE("recruitment_start_date", ((("created_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::date), "sla_working_days", COALESCE("recruitment_start_date", ((("created_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::date) FROM "job_title";--> statement-breakpoint
ALTER TABLE "job_title_sla_history" ADD CONSTRAINT "job_title_sla_history_job_title_id_job_title_id_fk" FOREIGN KEY ("job_title_id") REFERENCES "public"."job_title"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_title_sla_history" ADD CONSTRAINT "job_title_sla_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_title_sla_history_job_idx" ON "job_title_sla_history" USING btree ("job_title_id","effective_from");
