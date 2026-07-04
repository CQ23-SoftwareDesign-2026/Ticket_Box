-- AlterTable
ALTER TABLE "ticket_categories" ADD COLUMN     "position" INTEGER DEFAULT 0,
ADD COLUMN     "status" VARCHAR(50);
