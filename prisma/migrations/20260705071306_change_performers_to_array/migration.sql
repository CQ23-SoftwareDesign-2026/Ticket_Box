/*
  Warnings:

  - The `performers` column on the `concerts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "concerts" DROP COLUMN "performers",
ADD COLUMN     "performers" TEXT[];
