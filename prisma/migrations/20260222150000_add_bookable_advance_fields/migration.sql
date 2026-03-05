-- AlterTable
ALTER TABLE "bookable" ADD COLUMN "requirePayment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookable" ADD COLUMN "requireDeposit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookable" ADD COLUMN "depositPercent" INTEGER;
ALTER TABLE "bookable" ADD COLUMN "success_redirect_url" TEXT;
ALTER TABLE "bookable" ADD COLUMN "cancel_redirect_url" TEXT;
