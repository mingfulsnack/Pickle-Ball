-- Migration: add customer_contacts and contact snapshot fields to phieu_dat_san
BEGIN;

-- Create contacts table
CREATE TABLE IF NOT EXISTS customer_contacts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  note TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add contact reference and snapshot fields to phieu_dat_san
ALTER TABLE phieu_dat_san
  ADD COLUMN IF NOT EXISTS contact_id BIGINT REFERENCES customer_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

-- Index to speed up user lookup
CREATE INDEX IF NOT EXISTS idx_customer_contacts_user ON customer_contacts(user_id, is_default);

COMMIT;
