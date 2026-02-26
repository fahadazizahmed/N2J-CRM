/*
  Warnings:

  - The values [Pending_Review,Active,Suspended] on the enum `client_status` will be removed. If these variants are still used in the database, this will fail.
  - The values [Net_7,Net_14,Net_30,Net_60] on the enum `credit_terms` will be removed. If these variants are still used in the database, this will fail.
  - The values [Pending,Approved,Not_Approved] on the enum `gst_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `company_name` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `gst_approved` on the `clients` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `client_name` to the `clients` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "client_status_new" AS ENUM ('pending', 'active', 'suspended');
ALTER TABLE "clients" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "clients" ALTER COLUMN "status" TYPE "client_status_new" USING ("status"::text::"client_status_new");
ALTER TYPE "client_status" RENAME TO "client_status_old";
ALTER TYPE "client_status_new" RENAME TO "client_status";
DROP TYPE "client_status_old";
ALTER TABLE "clients" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "credit_terms_new" AS ENUM ('net_7', 'net_14', 'net_30', 'net_60');
ALTER TABLE "clients" ALTER COLUMN "credit_terms" DROP DEFAULT;
ALTER TABLE "clients" ALTER COLUMN "credit_terms" TYPE "credit_terms_new" USING ("credit_terms"::text::"credit_terms_new");
ALTER TYPE "credit_terms" RENAME TO "credit_terms_old";
ALTER TYPE "credit_terms_new" RENAME TO "credit_terms";
DROP TYPE "credit_terms_old";
ALTER TABLE "clients" ALTER COLUMN "credit_terms" SET DEFAULT 'net_30';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "gst_status_new" AS ENUM ('pending', 'approved', 'notApproved');
ALTER TABLE "clients" ALTER COLUMN "gst_approved" DROP DEFAULT;
ALTER TABLE "clients" ALTER COLUMN "gst_status" TYPE "gst_status_new" USING ("gst_status"::text::"gst_status_new");
ALTER TYPE "gst_status" RENAME TO "gst_status_old";
ALTER TYPE "gst_status_new" RENAME TO "gst_status";
DROP TYPE "gst_status_old";
COMMIT;

-- DropIndex
DROP INDEX "clients_user_id_company_name_key";

-- DropIndex
DROP INDEX "clients_user_id_idx";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "company_name",
DROP COLUMN "gst_approved",
ADD COLUMN     "client_name" TEXT NOT NULL,
ADD COLUMN     "country_code" TEXT,
ADD COLUMN     "gst_status" "gst_status" NOT NULL DEFAULT 'pending',
ALTER COLUMN "credit_terms" SET DEFAULT 'net_30',
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active_role" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clients_user_id_key" ON "clients"("user_id");
