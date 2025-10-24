-- Migration: add updated_at column to users table to support updates that set updated_at
BEGIN;

-- Add updated_at column if it doesn't exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

COMMIT;
