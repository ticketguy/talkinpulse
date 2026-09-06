-- Run in Supabase SQL editor before deploy relies on NOT NULL sourceUrl.
-- Drops sourceless rows so ALTER succeeds.

DELETE FROM "posts" WHERE "sourceUrl" IS NULL OR btrim("sourceUrl") = '';

ALTER TABLE "posts" ALTER COLUMN "sourceUrl" SET NOT NULL;
