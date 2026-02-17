-- Run this in Supabase Dashboard > SQL Editor
-- This adds the airport column and reloads PostgREST schema cache

-- Add airport column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS airport TEXT;

-- Add airport column to customers table (if it exists)
DO $$ BEGIN
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS airport TEXT;
EXCEPTION WHEN undefined_table THEN
  -- customers table doesn't exist, skip
  NULL;
END $$;

-- Reload PostgREST schema cache so it picks up the customers table
NOTIFY pgrst, 'reload schema';
