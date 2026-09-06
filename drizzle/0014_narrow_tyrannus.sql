CREATE TABLE "holiday_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holiday_id" uuid NOT NULL,
	"holiday_date" date NOT NULL,
	"active" boolean NOT NULL,
	"effective_from" date NOT NULL,
	"changed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "holiday_history" ("holiday_id", "holiday_date", "active", "effective_from")
SELECT "id", "date", true, "created_at"::date FROM "holiday";--> statement-breakpoint
ALTER TABLE "holiday_history" ADD CONSTRAINT "holiday_history_holiday_id_holiday_id_fk" FOREIGN KEY ("holiday_id") REFERENCES "public"."holiday"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holiday_history" ADD CONSTRAINT "holiday_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "holiday_history_date_idx" ON "holiday_history" USING btree ("holiday_date","effective_from");
