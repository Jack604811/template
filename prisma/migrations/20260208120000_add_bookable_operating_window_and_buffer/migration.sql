-- AlterTable
ALTER TABLE "bookable" ADD COLUMN     "operatingStartTime" TEXT,
ADD COLUMN     "operatingEndTime" TEXT,
ADD COLUMN     "bufferMinutes" INTEGER DEFAULT 0,
ADD COLUMN     "allowMultipleDays" BOOLEAN NOT NULL DEFAULT false;
