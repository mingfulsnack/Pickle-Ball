-- Migration: Create time frame and shift management tables
-- This replaces the hardcoded pricing logic with flexible time frames and shifts

-- Table for time frames (khung_gio)
-- Each day of week can have different operating hours
CREATE TABLE IF NOT EXISTS khung_gio (
    id SERIAL PRIMARY KEY,
    ten_khung_gio VARCHAR(100) NOT NULL,
    start_at TIME NOT NULL,
    end_at TIME NOT NULL,
    ngay_ap_dung INTEGER NOT NULL CHECK (ngay_ap_dung >= 0 AND ngay_ap_dung <= 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ngay_ap_dung) -- Only one time frame per day of week
);

-- Table for shifts (ca)
-- Each shift has its own pricing within a time frame
CREATE TABLE IF NOT EXISTS ca (
    id SERIAL PRIMARY KEY,
    khung_gio_id INTEGER NOT NULL REFERENCES khung_gio(id) ON DELETE CASCADE,
    ten_ca VARCHAR(100) NOT NULL,
    gia_tien DECIMAL(10,2) NOT NULL CHECK (gia_tien >= 0), -- Price per hour
    start_at TIME NOT NULL,
    end_at TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (start_at < end_at)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_khung_gio_ngay_ap_dung ON khung_gio(ngay_ap_dung);
CREATE INDEX IF NOT EXISTS idx_ca_khung_gio_id ON ca(khung_gio_id);
CREATE INDEX IF NOT EXISTS idx_ca_time_range ON ca(start_at, end_at);

-- Insert default data to match current pricing logic
-- Monday to Friday (1-5)
INSERT INTO khung_gio (ten_khung_gio, start_at, end_at, ngay_ap_dung) VALUES
('Thứ Hai', '05:00', '22:00', 1),
('Thứ Ba', '05:00', '22:00', 2),
('Thứ Tư', '05:00', '22:00', 3),
('Thứ Năm', '05:00', '22:00', 4),
('Thứ Sáu', '05:00', '22:00', 5),
('Thứ Bảy', '05:00', '22:00', 6),
('Chủ Nhật', '05:00', '22:00', 0)
ON CONFLICT (ngay_ap_dung) DO NOTHING;

-- Insert shifts for weekdays (Monday-Friday)
INSERT INTO ca (khung_gio_id, ten_ca, gia_tien, start_at, end_at)
SELECT kg.id, 'Ca sáng', 120000, '05:00', '16:00'
FROM khung_gio kg 
WHERE kg.ngay_ap_dung BETWEEN 1 AND 5;

INSERT INTO ca (khung_gio_id, ten_ca, gia_tien, start_at, end_at)
SELECT kg.id, 'Ca tối', 160000, '16:00', '22:00'
FROM khung_gio kg 
WHERE kg.ngay_ap_dung BETWEEN 1 AND 5;

-- Insert shifts for weekend (Saturday=6, Sunday=0)
INSERT INTO ca (khung_gio_id, ten_ca, gia_tien, start_at, end_at)
SELECT kg.id, 'Ca sáng', 140000, '05:00', '16:00'
FROM khung_gio kg 
WHERE kg.ngay_ap_dung IN (0, 6);

INSERT INTO ca (khung_gio_id, ten_ca, gia_tien, start_at, end_at)
SELECT kg.id, 'Ca tối', 180000, '16:00', '22:00'
FROM khung_gio kg 
WHERE kg.ngay_ap_dung IN (0, 6);

COMMENT ON TABLE khung_gio IS 'Time frames for each day of week with operating hours';
COMMENT ON TABLE ca IS 'Shifts within time frames with specific pricing per hour';
COMMENT ON COLUMN khung_gio.ngay_ap_dung IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN ca.gia_tien IS 'Price per hour in VND';