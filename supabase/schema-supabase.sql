-- ======================================================
-- SKEMA SUPABASE: INSPIRA POS (V1)
-- ======================================================
-- Salin dan jalankan skrip SQL ini langsung di Supabase SQL Editor.
-- Skrip ini akan membuat schema baru bernama 'inspirapos_v1' dan 
-- membuat tabel-tabel yang diperlukan di dalamnya.

-- 1. Buat Schema Baru
CREATE SCHEMA IF NOT EXISTS inspirapos_v1;

-- 2. Hapus Tabel Lama jika ada (opsional / untuk fresh setup)
-- DROP TABLE IF EXISTS inspirapos_v1.license_logs CASCADE;
-- DROP TABLE IF EXISTS inspirapos_v1.clients CASCADE;
-- DROP TABLE If EXISTS inspirapos_v1.admins CASCADE;

-- 3. Tabel admins (Untuk Kredensial Dashboard Admin)
CREATE TABLE IF NOT EXISTS inspirapos_v1.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel clients (Untuk Pemantauan Uji Coba & Lisensi Klien)
CREATE TABLE IF NOT EXISTS inspirapos_v1.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name VARCHAR(150) NOT NULL,
  address TEXT,
  phone VARCHAR(30),
  device_id VARCHAR(100) UNIQUE NOT NULL,
  license_status VARCHAR(20) DEFAULT 'TRIAL'::character varying NOT NULL, -- 'TRIAL', 'ACTIVE', 'EXPIRED', 'REVOKED'
  trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  license_key VARCHAR(50),
  plan_tier VARCHAR(10) DEFAULT 'LITE' NOT NULL, -- 'LITE', 'PRO'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT clients_license_status_check CHECK (license_status IN ('TRIAL', 'ACTIVE', 'EXPIRED', 'REVOKED')),
  CONSTRAINT clients_plan_tier_check CHECK (plan_tier IN ('LITE', 'PRO'))
);

-- 5. Tabel license_logs (Untuk Log Penerbitan Lisensi oleh Admin)
CREATE TABLE IF NOT EXISTS inspirapos_v1.license_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES inspirapos_v1.clients(id) ON DELETE CASCADE NOT NULL,
  license_key VARCHAR(50) NOT NULL,
  plan_tier VARCHAR(10) DEFAULT 'LITE' NOT NULL,
  generated_by UUID REFERENCES inspirapos_v1.admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Indeks untuk optimasi pencarian
CREATE INDEX IF NOT EXISTS idx_clients_device_id ON inspirapos_v1.clients(device_id);
CREATE INDEX IF NOT EXISTS idx_clients_license_status ON inspirapos_v1.clients(license_status);

-- 7. Informasi Sukses
COMMENT ON SCHEMA inspirapos_v1 IS 'Skema data utama untuk sistem lisensi dan dashboard admin Inspira POS';

-- 8. Berikan Hak Akses (Privileges) agar API Supabase (anon, authenticated, service_role) bisa mengakses skema
GRANT USAGE ON SCHEMA inspirapos_v1 TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA inspirapos_v1 TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA inspirapos_v1 TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA inspirapos_v1 TO anon, authenticated, service_role;

-- Hak akses otomatis untuk tabel/fungsi baru di masa depan
ALTER DEFAULT PRIVILEGES IN SCHEMA inspirapos_v1 GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA inspirapos_v1 GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA inspirapos_v1 GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- ======================================================
-- SCRIPT MIGRATION: LITE & PRO TIERS (JUNI 2026)
-- ======================================================
-- Jalankan skrip ini di database yang sudah ada untuk memperbarui skema:
--
-- ALTER TABLE inspirapos_v1.clients 
-- ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(10) DEFAULT 'LITE' NOT NULL
-- CONSTRAINT clients_plan_tier_check CHECK (plan_tier IN ('LITE', 'PRO'));
--
-- ALTER TABLE inspirapos_v1.license_logs 
-- ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(10) DEFAULT 'LITE' NOT NULL;
--
-- -- Migrasi klien ACTIVE lama agar otomatis menjadi PRO
-- UPDATE inspirapos_v1.clients
-- SET plan_tier = 'PRO'
-- WHERE license_status = 'ACTIVE';
