-- Migration: Replace UNIQUE(ngay_ap_dung) constraint with a partial unique index
-- Allow multiple rows per day as long as only one is active at a time

BEGIN;

-- Drop the legacy unique constraint if it exists (constraint name from initial migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'khung_gio_ngay_ap_dung_key'
  ) THEN
    ALTER TABLE khung_gio DROP CONSTRAINT khung_gio_ngay_ap_dung_key;
  END IF;
END;
$$;

-- Drop the non-partial index if present (created in migration 002)
DROP INDEX IF EXISTS idx_khung_gio_ngay_ap_dung;

-- Ensure there are no conflicting active rows before creating the partial unique index
DO $$
DECLARE
  dup_days TEXT;
BEGIN
  SELECT string_agg(ngay_ap_dung::text, ',') INTO dup_days
  FROM (
    SELECT ngay_ap_dung FROM khung_gio
    WHERE is_active = true
    GROUP BY ngay_ap_dung
    HAVING COUNT(*) > 1
  ) t;

  IF dup_days IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot create unique index: multiple active khung_gio rows exist for days: %', dup_days;
  END IF;
END;
$$;

-- Create a partial unique index that enforces uniqueness only for active time frames
CREATE UNIQUE INDEX IF NOT EXISTS uq_khung_gio_ngay_ap_dung_active
  ON khung_gio(ngay_ap_dung)
  WHERE is_active = true;

COMMIT;
