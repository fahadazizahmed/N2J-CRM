-- ============================================================
-- Fix: Rename enum values from snake_case → camelCase
-- Run this BEFORE `prisma db push` on production
-- ============================================================

-- ─── BillingType ─────────────────────────────────────────────
ALTER TYPE "BillingType" RENAME VALUE 'per_tonne' TO 'perTonne';
ALTER TYPE "BillingType" RENAME VALUE 'per_load'  TO 'perLoad';

-- ─── TollHandling ────────────────────────────────────────────
ALTER TYPE "TollHandling" RENAME VALUE 'pass_through' TO 'passThrough';
