-- Migration: add UNIQUE constraint to users.phone
-- This migration will fail with an explanatory error if duplicate phone values exist.

BEGIN;

-- Ensure no duplicate non-null phone numbers exist
DO $$
DECLARE
  dup_count INT;
  dup_list TEXT;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT phone FROM users WHERE phone IS NOT NULL GROUP BY phone HAVING count(*) > 1
  ) t;

  IF dup_count > 0 THEN
    SELECT string_agg(phone::text, ', ') INTO dup_list FROM (
      SELECT phone FROM users WHERE phone IS NOT NULL GROUP BY phone HAVING count(*) > 1
    ) d;
    RAISE EXCEPTION 'Cannot add UNIQUE constraint to users.phone - % duplicate phone value(s) found: %', dup_count, dup_list;
  END IF;
END$$;

-- Add unique constraint on phone
ALTER TABLE users
  ADD CONSTRAINT uq_users_phone UNIQUE (phone);

COMMIT;
