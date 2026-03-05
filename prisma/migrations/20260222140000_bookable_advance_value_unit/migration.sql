-- CreateEnum
CREATE TYPE "MinAdvanceUnit" AS ENUM ('MINUTES', 'HOURS', 'DAYS');

-- CreateEnum
CREATE TYPE "MaxAdvanceUnit" AS ENUM ('DAYS', 'WEEKS');

-- AlterTable: add new columns (nullable)
ALTER TABLE "bookable" ADD COLUMN "minAdvanceValue" INTEGER;
ALTER TABLE "bookable" ADD COLUMN "minAdvanceUnit" "MinAdvanceUnit";
ALTER TABLE "bookable" ADD COLUMN "maxAdvanceValue" INTEGER;
ALTER TABLE "bookable" ADD COLUMN "maxAdvanceUnit" "MaxAdvanceUnit";

-- Migrate existing data: copy old columns to new (value + unit)
UPDATE "bookable"
SET
  "minAdvanceValue" = "minAdvanceBookingHours",
  "minAdvanceUnit" = 'HOURS'
WHERE "minAdvanceBookingHours" IS NOT NULL;

UPDATE "bookable"
SET
  "maxAdvanceValue" = "maxAdvanceBookingDays",
  "maxAdvanceUnit" = 'DAYS'
WHERE "maxAdvanceBookingDays" IS NOT NULL;

-- Drop old columns
ALTER TABLE "bookable" DROP COLUMN "minAdvanceBookingHours";
ALTER TABLE "bookable" DROP COLUMN "maxAdvanceBookingDays";
