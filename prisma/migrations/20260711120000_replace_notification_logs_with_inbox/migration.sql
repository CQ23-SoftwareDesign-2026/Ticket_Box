-- The previous tables modelled templates and delivery logs, not user-visible notifications.
DROP TABLE IF EXISTS "notification_logs";
DROP TABLE IF EXISTS "notification_templates";

CREATE TYPE "NotificationType" AS ENUM ('TICKET_PURCHASED', 'CONCERT_REMINDER');

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "concert_id" UUID,
    "type" "NotificationType" NOT NULL,
    "deduplication_key" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_deduplication_key_key"
ON "notifications"("deduplication_key");

CREATE INDEX "notifications_user_id_read_at_created_at_idx"
ON "notifications"("user_id", "read_at", "created_at");

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_concert_id_fkey"
FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
