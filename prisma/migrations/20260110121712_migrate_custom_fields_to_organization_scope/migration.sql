-- AlterTable: Add new columns to CustomField
ALTER TABLE "custom_field" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "custom_field" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "custom_field" ADD COLUMN "identifier" TEXT;

-- Migrate existing collectionId to organizationId
-- Get organizationId from BookableCollection for each CustomField
UPDATE "custom_field" cf
SET "organizationId" = bc."organizationId"
FROM "bookable_collection" bc
WHERE cf."collectionId" = bc.id;

-- Generate identifier from name (slugify) for existing records
UPDATE "custom_field"
SET "identifier" = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE("name", '[^a-zA-Z0-9\s-]', '', 'g'),
      '[\s_-]+', '_', 'g'
    ),
    '^-+|-+$', '', 'g'
  )
) || '_' || SUBSTRING("id", 1, 8);

-- Ensure identifier uniqueness
DO $$
DECLARE
  r RECORD;
  counter INTEGER;
  new_identifier TEXT;
BEGIN
  FOR r IN SELECT "id", "identifier" FROM "custom_field" WHERE "identifier" IS NOT NULL LOOP
    counter := 1;
    new_identifier := r."identifier";
    
    WHILE EXISTS (SELECT 1 FROM "custom_field" WHERE "identifier" = new_identifier AND "id" != r."id") LOOP
      new_identifier := SPLIT_PART(r."identifier", '_', 1) || '_' || counter;
      counter := counter + 1;
    END LOOP;
    
    IF new_identifier != r."identifier" THEN
      UPDATE "custom_field" SET "identifier" = new_identifier WHERE "id" = r."id";
    END IF;
  END LOOP;
END $$;

-- Make columns required after data migration
ALTER TABLE "custom_field" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "custom_field" ALTER COLUMN "identifier" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "custom_field" ADD CONSTRAINT "custom_field_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_identifier_key" ON "custom_field"("identifier");

-- AlterTable: Remove bookableId from CustomFieldValue
ALTER TABLE "custom_field_value" DROP CONSTRAINT IF EXISTS "custom_field_value_bookableId_fkey";
DROP INDEX IF EXISTS "custom_field_value_bookableId_fieldId_key";
ALTER TABLE "custom_field_value" DROP COLUMN "bookableId";

-- AlterTable: Remove collectionId from CustomField
ALTER TABLE "custom_field" DROP CONSTRAINT IF EXISTS "custom_field_collectionId_fkey";
ALTER TABLE "custom_field" DROP COLUMN "collectionId";
