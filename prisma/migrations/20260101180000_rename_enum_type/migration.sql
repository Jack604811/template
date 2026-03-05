-- Change the column type from BookableCustomFieldType to CustomFieldType
-- First, alter the column to use the correct enum type
ALTER TABLE "custom_field" 
  ALTER COLUMN "type" TYPE "CustomFieldType" 
  USING "type"::text::"CustomFieldType";

-- Drop the old enum type if it exists and is not used elsewhere
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookableCustomFieldType') THEN
        -- Check if the enum is used by any other columns
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE udt_name = 'BookableCustomFieldType'
        ) THEN
            DROP TYPE "BookableCustomFieldType";
        END IF;
    END IF;
END$$;
