-- Ensure compound unique indexes exist (idempotent; safe if migration 20260202120000 was marked applied without running)
CREATE UNIQUE INDEX IF NOT EXISTS "custom_field_value_clientId_fieldId_key" ON "custom_field_value"("clientId", "fieldId");
