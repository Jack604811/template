-- AlterTable
ALTER TABLE "bookable" ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "bookable" ADD COLUMN "allowMultipleGuests" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "bookable" ADD COLUMN "minGuests" INTEGER;

-- AlterTable
ALTER TABLE "bookable" ADD COLUMN "maxGuestsPerBooking" INTEGER;
