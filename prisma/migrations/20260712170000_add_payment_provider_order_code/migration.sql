CREATE SEQUENCE "payment_provider_order_code_seq" START 100000 INCREMENT 1;

ALTER TABLE "payment_transactions"
ADD COLUMN "provider_order_code" BIGINT NOT NULL
DEFAULT nextval('payment_provider_order_code_seq');

CREATE UNIQUE INDEX "payment_transactions_provider_order_code_key"
ON "payment_transactions"("provider_order_code");

ALTER SEQUENCE "payment_provider_order_code_seq"
OWNED BY "payment_transactions"."provider_order_code";
