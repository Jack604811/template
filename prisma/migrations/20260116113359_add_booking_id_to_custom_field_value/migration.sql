-- AlterTable: Add bookingId to custom_field_value
ALTER TABLE "custom_field_value" ADD COLUMN "bookingId" TEXT;

-- AddForeignKey: Create foreign key to booking table
ALTER TABLE "custom_field_value" ADD CONSTRAINT "custom_field_value_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: Add unique constraint on (bookingId, fieldId)
CREATE UNIQUE INDEX "custom_field_value_bookingId_fieldId_key" ON "custom_field_value"("bookingId", "fieldId");
