-- AlterTable
ALTER TABLE "public"."concerts" ADD COLUMN     "poster_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "public"."ticket_categories" ADD COLUMN     "gate_number" INTEGER;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "refresh_token" TEXT;

-- CreateTable
CREATE TABLE "public"."checker_assignments" (
    "id" UUID NOT NULL,
    "checker_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "gate_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checker_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checker_assignments_checker_id_concert_id_key" ON "public"."checker_assignments"("checker_id", "concert_id");

-- CreateIndex
CREATE UNIQUE INDEX "checker_assignments_concert_id_gate_number_key" ON "public"."checker_assignments"("concert_id", "gate_number");

-- AddForeignKey
ALTER TABLE "public"."checker_assignments" ADD CONSTRAINT "checker_assignments_checker_id_fkey" FOREIGN KEY ("checker_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."checker_assignments" ADD CONSTRAINT "checker_assignments_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "public"."concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
