-- Allow order totals and matching payment amounts up to 999,999,999.99 VND.
ALTER TABLE "orders"
ALTER COLUMN "total_amount" TYPE DECIMAL(11, 2);

ALTER TABLE "payment_transactions"
ALTER COLUMN "amount" TYPE DECIMAL(11, 2);
