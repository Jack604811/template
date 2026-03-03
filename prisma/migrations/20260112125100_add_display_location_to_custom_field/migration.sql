-- CreateEnum
CREATE TYPE "CustomFieldDisplayLocation" AS ENUM ('BOOKING', 'CUSTOMER');

-- AlterTable
ALTER TABLE "custom_field" ADD COLUMN "displayLocation" "CustomFieldDisplayLocation" NOT NULL DEFAULT 'BOOKING';
