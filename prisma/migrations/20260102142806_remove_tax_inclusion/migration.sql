-- Remove taxInclusion column and enum
ALTER TABLE "bookable" DROP COLUMN IF EXISTS "taxInclusion";
DROP TYPE IF EXISTS "TaxInclusion";
