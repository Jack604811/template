-- AlterTable
ALTER TABLE "bookable" ADD COLUMN "hideBookingType" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookable" ADD COLUMN "internal_notes" TEXT;
