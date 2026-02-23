/*
  Warnings:

  - A unique constraint covering the columns `[user_id,company_name]` on the table `clients` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "clients_user_id_company_name_key" ON "clients"("user_id", "company_name");
