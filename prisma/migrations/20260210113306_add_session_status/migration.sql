-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "status" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "user_sessions_status_idx" ON "user_sessions"("status");
