// Export tất cả models
const BaseModel = require('./BaseModel');
const Employee = require('./Employee');
const Customer = require('./Customer');
const Table = require('./Table');
const Booking = require('./Booking');
const Menu = require('./Menu');

// New models for court booking system
const San = require('./San');
const BangGiaSan = require('./BangGiaSan');
const DichVu = require('./DichVu');
const PhieuDatSan = require('./PhieuDatSan');
const ChiTietPhieuSan = require('./ChiTietPhieuSan');
const ChiTietPhieuDichVu = require('./ChiTietPhieuDichVu');
const HoaDon = require('./HoaDon');
const ChiTietHoaDon = require('./ChiTietHoaDon');
const PhieuHuyDatSan = require('./PhieuHuyDatSan');
const AvailabilityCache = require('./AvailabilityCache');

module.exports = {
  BaseModel,
  Employee,
  Customer,
  Table,
  Booking,
  Menu,
  San,
  BangGiaSan,
  DichVu,
  PhieuDatSan,
  ChiTietPhieuSan,
  ChiTietPhieuDichVu,
  HoaDon,
  ChiTietHoaDon,
  PhieuHuyDatSan,
  AvailabilityCache,
};
