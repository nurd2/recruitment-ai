ALTER TABLE "candidate" ADD COLUMN "source" text;

UPDATE "candidate" AS c
SET "source" = d."source"
FROM "resume_document" AS d
WHERE c."primary_resume_document_id" = d."id"
  AND c."source" IS NULL
  AND d."source" IS NOT NULL;

ALTER TABLE "resume_document" DROP COLUMN "source";