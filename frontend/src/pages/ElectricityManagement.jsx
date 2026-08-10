// src/pages/ElectricityManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Bolt, Search, Plus, Edit, Trash2, RefreshCw,
  Calendar, Download, Eye, CheckCircle2, AlertCircle,
  FileText, Home, Users, TrendingUp, BarChart3,
  Zap, Clock, DollarSign
} from 'lucide-react';
import { utilityAPI, apartmentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money } from '../utils/formatters';

export default function ElectricityManagement({ flash }) {
  const [readings, setReadings] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedApartment, setSelectedApartment] = useState('');
  const [selectedReading, setSelectedReading] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [form, setForm] = useState({
    apartmentId: '',
    utilityTypeId: 1, // Điện
    readingMonth: new Date().getMonth() + 1,
    readingYear: new Date().getFullYear(),
    oldIndex: 0,
    newIndex: '',
    readingDate: new Date().toISOString().split('T')[0]
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchReadings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await utilityAPI.getReadings(
        selectedApartment,
        1, // Điện
        '',
        '',
        page,
        20
      );
      console.log('📊 Electricity readings:', res);
      
      const data = res?.data || res || [];
      setReadings(Array.isArray(data) ? data : []);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching readings:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải dữ liệu điện'));
      setReadings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedApartment, page, flash]);

  const fetchApartments = useCallback(async () => {
    try {
      const res = await apartmentAPI.getAll('', '', 1, 999);
      const data = res?.data || res || [];
      setApartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching apartments:', error);
    }
  }, []);

  useEffect(() => {
    fetchReadings();
    fetchApartments();
  }, [fetchReadings, fetchApartments]);

  // src/pages/ElectricityManagement.jsx
const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const data = {
            apartmentId: parseInt(form.apartmentId),
            utilityTypeId: 1, // hoặc 2 cho nước
            readingMonth: parseInt(form.readingMonth),
            readingYear: parseInt(form.readingYear),
            oldIndex: parseFloat(form.oldIndex) || 0,
            newIndex: parseFloat(form.newIndex),
            readingDate: form.readingDate
        };

        const res = await utilityAPI.createReading(data);
        console.log('📊 Create reading response:', res);

        if (res?.data?.invoiceId) {
            // Hiển thị thông báo có hóa đơn
            const total = res.data.totalAmount || 0;
            const msg = `✅ Thêm chỉ số thành công! Hóa đơn #${res.data.invoiceId} được tạo với tổng ${total.toLocaleString('vi-VN')} đ`;
            if (flash) flash(msg);
        } else {
            if (flash) flash('✅ Thêm chỉ số thành công!');
        }
        setModalOpen(false);
        resetForm();
        fetchReadings();
    } catch (error) {
        console.error('Submit error:', error);
        const errMsg = error.response?.data?.message || error.message || 'Không thể thêm chỉ số';
        if (flash) flash('❌ ' + errMsg);
    } finally {
        setLoading(false);
    }
};

  const resetForm = () => {
    setForm({
      apartmentId: '',
      utilityTypeId: 1,
      readingMonth: new Date().getMonth() + 1,
      readingYear: new Date().getFullYear(),
      oldIndex: 0,
      newIndex: '',
      readingDate: new Date().toISOString().split('T')[0]
    });
    setSelectedReading(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
  };

  const openViewModal = (reading) => {
    setSelectedReading(reading);
    setModalMode('view');
    setModalOpen(true);
  };

  const filteredReadings = useMemo(() => {
    const q = search.toLowerCase();
    return readings.filter(r =>
      (r.ApartmentCode || '').toLowerCase().includes(q) ||
      (r.EmployeeName || '').toLowerCase().includes(q)
    );
  }, [readings, search]);

  const stats = useMemo(() => {
    const total = readings.length;
    const totalConsumption = readings.reduce((sum, r) => sum + (r.Consumption || 0), 0);
    const avgConsumption = total > 0 ? totalConsumption / total : 0;
    const maxConsumption = total > 0 ? Math.max(...readings.map(r => r.Consumption || 0)) : 0;
    return { total, totalConsumption, avgConsumption, maxConsumption };
  }, [readings]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý điện</h3>
            <p className="text-sm text-slate-500">
              Quản lý chỉ số điện tiêu thụ của các căn hộ.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {stats.totalConsumption.toFixed(0)} kWh tổng tiêu thụ
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm căn hộ..."
              className="w-48"
            />
            <select
              value={selectedApartment}
              onChange={(e) => setSelectedApartment(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả căn hộ</option>
              {apartments.map(a => (
                <option key={a.ApartmentID} value={a.ApartmentID}>
                  {a.ApartmentCode}
                </option>
              ))}
            </select>
            <Button onClick={openCreateModal}>
              <Plus size={16} /> Nhập chỉ số
            </Button>
            <Button variant="secondary" onClick={fetchReadings} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={FileText} label="Số lần nhập" value={stats.total} hint="Tổng số lần nhập chỉ số" />
        <StatCard icon={Zap} label="Tổng tiêu thụ" value={`${stats.totalConsumption.toFixed(0)} kWh`} hint="Tất cả căn hộ" />
        <StatCard icon={TrendingUp} label="Trung bình" value={`${stats.avgConsumption.toFixed(1)} kWh`} hint="Mỗi lần nhập" />
        <StatCard icon={BarChart3} label="Cao nhất" value={`${stats.maxConsumption.toFixed(0)} kWh`} hint="Một lần nhập" />
      </div>

      {/* Readings List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải dữ liệu...</p>
        </Card>
      ) : filteredReadings.length === 0 ? (
        <Card className="p-8 text-center">
          <Bolt size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có dữ liệu điện</h3>
          <p className="text-sm text-slate-500">Nhập chỉ số điện để bắt đầu theo dõi</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredReadings.map((reading) => (
            <Card key={reading.ReadingID} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge tone="blue" className="mb-1">Tháng {reading.ReadingMonth}/{reading.ReadingYear}</Badge>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                      {reading.ApartmentCode}
                    </h3>
                    <p className="text-sm text-slate-500">{reading.EmployeeName || 'Chưa phân công'}</p>
                  </div>
                  <Badge tone="green">
                    {reading.Consumption ? `${reading.Consumption.toFixed(0)} kWh` : '0 kWh'}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chỉ số cũ</span>
                    <span className="font-bold text-slate-950">{reading.OldIndex?.toFixed(1)} kWh</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chỉ số mới</span>
                    <span className="font-bold text-slate-950">{reading.NewIndex?.toFixed(1)} kWh</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ngày nhập</span>
                    <span className="text-slate-700">{formatDate(reading.ReadingDate)}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openViewModal(reading)}>
                    <Eye size={14} /> Xem
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {[...Array(Math.min(totalPages, 10))].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                page === i + 1
                  ? 'bg-[#1f4f46] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={modalMode === 'create' ? 'Nhập chỉ số điện' : 'Chi tiết chỉ số điện'}
        description={modalMode === 'create' ? 'Nhập chỉ số điện tiêu thụ cho căn hộ' : 'Xem chi tiết chỉ số điện'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {modalMode === 'view' && selectedReading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-950">{selectedReading.ApartmentCode}</h3>
                <p className="text-sm text-slate-500">
                  Tháng {selectedReading.ReadingMonth}/{selectedReading.ReadingYear}
                </p>
              </div>
              <Badge tone="green">
                {selectedReading.Consumption?.toFixed(0)} kWh
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Chỉ số</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Chỉ số cũ:</span> {selectedReading.OldIndex?.toFixed(1)} kWh</div>
                  <div><span className="text-slate-500">Chỉ số mới:</span> {selectedReading.NewIndex?.toFixed(1)} kWh</div>
                  <div><span className="text-slate-500">Tiêu thụ:</span> <span className="font-bold text-[#1f4f46]">{selectedReading.Consumption?.toFixed(1)} kWh</span></div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thông tin</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Ngày nhập:</span> {formatDate(selectedReading.ReadingDate)}</div>
                  <div><span className="text-slate-500">Nhân viên:</span> {selectedReading.EmployeeName || 'Chưa phân công'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Căn hộ *</label>
              <select
                value={form.apartmentId}
                onChange={(e) => setForm({ ...form, apartmentId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                required
              >
                <option value="">Chọn căn hộ</option>
                {apartments.map(a => (
                  <option key={a.ApartmentID} value={a.ApartmentID}>
                    {a.ApartmentCode} - {a.BuildingName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Tháng</label>
                <select
                  value={form.readingMonth}
                  onChange={(e) => setForm({ ...form, readingMonth: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Năm</label>
                <select
                  value={form.readingYear}
                  onChange={(e) => setForm({ ...form, readingYear: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                >
                  {[2023, 2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Chỉ số cũ (kWh)</label>
                <Input
                  type="number"
                  value={form.oldIndex}
                  onChange={(e) => setForm({ ...form, oldIndex: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Chỉ số mới (kWh) *</label>
                <Input
                  type="number"
                  value={form.newIndex}
                  onChange={(e) => setForm({ ...form, newIndex: e.target.value })}
                  placeholder="Nhập chỉ số mới"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày nhập</label>
              <Input
                type="date"
                value={form.readingDate}
                onChange={(e) => setForm({ ...form, readingDate: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Lưu chỉ số
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}