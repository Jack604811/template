-- Drop customFields columns if they exist (single source of truth is custom_field_value)
ALTER TABLE "booking" DROP COLUMN IF EXISTS "customFields";
ALTER TABLE "client" DROP COLUMN IF EXISTS "customFields";

-- AlterTable
ALTER TABLE "custom_field_value" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_value_clientId_fieldId_key" ON "custom_field_value"("clientId", "fieldId");

-- AddForeignKey
ALTER TABLE "custom_field_value" ADD CONSTRAINT "custom_field_value_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
