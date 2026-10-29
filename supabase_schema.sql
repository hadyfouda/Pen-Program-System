-- ===================================================================
-- EVA Pharma Insulin Pen Program - Supabase Database Schema
-- Run this script in the Supabase SQL Editor: Dashboard ➔ SQL Editor ➔ New query ➔ Run
-- ===================================================================

-- 1. Corporate Registered Users (MRs, DMs, Admins)
CREATE TABLE IF NOT EXISTS corporate_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'Medical Rep',
  assigned_bricks JSONB DEFAULT '[]'::jsonb,
  department TEXT DEFAULT 'EVA Insulin Pen Program',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enrolled Facilities (Clinics, Pharmacies, Medical Centers)
CREATE TABLE IF NOT EXISTS enrolled_accounts (
  account_id TEXT PRIMARY KEY,
  account_type TEXT NOT NULL,
  account_name TEXT NOT NULL,
  specialty TEXT,
  territory TEXT NOT NULL,
  phone TEXT NOT NULL,
  enrolled_by_rep TEXT,
  pin_hash TEXT NOT NULL,
  raw_pin TEXT,
  allocated_pens INTEGER DEFAULT 0,
  dispensed_count INTEGER DEFAULT 0,
  current_balance INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Patient Dispenses Records
CREATE TABLE IF NOT EXISTS dispenses (
  record_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES enrolled_accounts(account_id) ON DELETE CASCADE,
  account_type TEXT,
  account_name TEXT,
  recorded_by TEXT,
  prescribing_doctor TEXT,
  patient_name TEXT,
  patient_phone TEXT,
  national_id TEXT,
  product_name TEXT,
  dispensed_qty INTEGER DEFAULT 1,
  rx_image_id TEXT,
  id_image_id TEXT,
  consent_image_id TEXT,
  status TEXT DEFAULT 'approved',
  is_exception BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Stock Quota Requests
CREATE TABLE IF NOT EXISTS stock_requests (
  request_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES enrolled_accounts(account_id) ON DELETE CASCADE,
  account_name TEXT,
  account_type TEXT,
  requested_by TEXT,
  requested_qty INTEGER DEFAULT 20,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Clinical & Duplicate Exceptions
CREATE TABLE IF NOT EXISTS dispense_exceptions (
  exception_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES enrolled_accounts(account_id) ON DELETE CASCADE,
  account_name TEXT,
  account_type TEXT,
  patient_name TEXT,
  patient_phone TEXT,
  national_id TEXT,
  prescribing_doctor TEXT,
  product_name TEXT,
  pens_count INTEGER DEFAULT 1,
  exception_reason TEXT,
  admin_status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ
);

-- Create helpful indexes for fast lookup and territory scoping
CREATE INDEX IF NOT EXISTS idx_accounts_territory ON enrolled_accounts(territory);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON enrolled_accounts(status);
CREATE INDEX IF NOT EXISTS idx_dispenses_account ON dispenses(account_id);
CREATE INDEX IF NOT EXISTS idx_dispenses_patient ON dispenses(national_id, patient_phone);
CREATE INDEX IF NOT EXISTS idx_exceptions_account ON dispense_exceptions(account_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON dispense_exceptions(admin_status);

-- Enable Row Level Security (RLS) with open public access policies for anon key
ALTER TABLE corporate_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrolled_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispense_exceptions ENABLE ROW LEVEL SECURITY;

-- Allow anon read/write access (controlled by client RBAC & corporate email verification)
CREATE POLICY "Allow public read/write on corporate_users" ON corporate_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on enrolled_accounts" ON enrolled_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on dispenses" ON dispenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on stock_requests" ON stock_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on dispense_exceptions" ON dispense_exceptions FOR ALL USING (true) WITH CHECK (true);
