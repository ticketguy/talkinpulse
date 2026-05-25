-- ─────────────────────────────────────────────
-- TalkinPulse migration — run in Supabase SQL Editor
-- ─────────────────────────────────────────────

-- 1. Wipe all demo data
TRUNCATE TABLE "comments" CASCADE;
TRUNCATE TABLE "votes" CASCADE;
TRUNCATE TABLE "posts" CASCADE;
TRUNCATE TABLE "users" CASCADE;

-- 2. Add new enums
DO $$ BEGIN
  CREATE TYPE "RepLevel" AS ENUM ('NEW_WEB3','WEB3_ASSOCIATE','CALLER','SIGNAL_CALLER','VERIFIED_VOICE','CT_ORACLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN','MODERATOR','POINTS_MANAGER','READ_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Update users table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "customBio" TEXT,
  ADD COLUMN IF NOT EXISTS "customImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "repLevel" TEXT NOT NULL DEFAULT 'NEW_WEB3',
  ADD COLUMN IF NOT EXISTS "talkinPoints" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "xProfileData" JSONB,
  ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "adminRole" TEXT;

-- Reset repScore default
ALTER TABLE "users" ALTER COLUMN "repScore" SET DEFAULT 0;

-- 4. Update posts table
ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "xPostId" TEXT,
  ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolvedOutcome" TEXT,
  ADD COLUMN IF NOT EXISTS "resolutionNote" TEXT,
  ADD COLUMN IF NOT EXISTS "pointsPool" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "originator" TEXT,
  ADD COLUMN IF NOT EXISTS "notableReplies" TEXT;

-- Remove volume if it exists
ALTER TABLE "posts" DROP COLUMN IF EXISTS "volume";

-- 5. Update votes table
ALTER TABLE "votes"
  ADD COLUMN IF NOT EXISTS "pointsWagered" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pointsWon" INTEGER NOT NULL DEFAULT 0;

-- 6. Update comments table
ALTER TABLE "comments"
  ADD COLUMN IF NOT EXISTS "xReplyId" TEXT;

-- 7. Create new tables
CREATE TABLE IF NOT EXISTS "point_transactions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "postId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "point_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "admin_access" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "grantedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_access_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "signupPoints" INTEGER NOT NULL DEFAULT 100,
  "commentPoints" INTEGER NOT NULL DEFAULT 2,
  "voteNeutralPts" INTEGER NOT NULL DEFAULT 5,
  "weeklyRewardAmt" INTEGER NOT NULL DEFAULT 50,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- Insert default settings
INSERT INTO "platform_settings" ("id") VALUES ('singleton') ON CONFLICT DO NOTHING;

-- 8. Prisma migrations table
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

SELECT 'Migration complete ✓' AS status;
