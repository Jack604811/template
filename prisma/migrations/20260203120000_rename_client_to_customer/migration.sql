-- Rename client table to customer and related columns to avoid breaking references.

-- 1. Booking: rename clientId -> customerId
ALTER TABLE "booking" RENAME COLUMN "clientId" TO "customerId";

-- 2. CustomFieldValue: drop old unique index, rename clientId -> customerId, add new unique index
DROP INDEX IF EXISTS "custom_field_value_clientId_fieldId_key";
ALTER TABLE "custom_field_value" RENAME COLUMN "clientId" TO "customerId";
CREATE UNIQUE INDEX "custom_field_value_customerId_fieldId_key" ON "custom_field_value"("customerId", "fieldId");

-- 3. Rename table client -> customer
ALTER TABLE "client" RENAME TO "customer";
