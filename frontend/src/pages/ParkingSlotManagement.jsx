// src/pages/ParkingSlotManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Home, Plus, Search, Download, Edit, Trash2, Eye,
  RefreshCw, CheckCircle2, X, AlertCircle,
  Car, MapPin, Building2, Filter, Grid3x3,
  Square, Circle, ParkingCircle
} from 'lucide-react';
import { vehicleAPI, apartmentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, getInitials } from '../utils/formatters';

export default function ParkingSlotManagement({ flash }) {
  const [slots, setSlots] = useState([]);
  const [areas, setAreas] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [form, setForm] = useState({
    areaId: '',
    slotNumber: '',
    vehicleTypeId: '',
    isOccupied: 0
  });

  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true);
      const res = await vehicleAPI.getParkingSlots(
        areaFilter,
        typeFilter,
        statusFilter
      );
      console.log('📊 Parking slots:', res);
      
      const data = res?.data || res || [];
      setSlots(Array.isArray(data) ? data : []);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching slots:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách bãi xe'));
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [areaFilter, typeFilter, statusFilter, flash]);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await apartmentAPI.getAreas();
      const data = res?.data || res || [];
      setAreas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  }, []);

  const fetchVehicleTypes = useCallback(async () => {
    try {
      const res = await vehicleAPI.getTypes();
      const data = res?.data || res || [];
      setVehicleTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
    fetchAreas();
    fetchVehicleTypes();
  }, [fetchSlots, fetchAreas, fetchVehicleTypes]);

  // 🔥 SỬA: Gọi API tạo vị trí đỗ thực tế
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Gọi API tạo parking slot
      const response = await vehicleAPI.createParkingSlot({
        areaId: parseInt(form.areaId),
        slotNumber: form.slotNumber,
        vehicleTypeId: parseInt(form.vehicleTypeId),
        isOccupied: form.isOccupied
      });
      
      console.log('📊 Create parking slot response:', response);
      
      if (flash) flash('✅ Tạo vị trí đỗ thành công!');
      setModalOpen(false);
      resetForm();
      fetchSlots();
    } catch (error) {
      console.error('Submit error:', error);
      const errMsg = error.response?.data?.message || error.message || 'Không thể tạo vị trí đỗ';
      if (flash) flash('❌ ' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 SỬA: Gọi API xóa vị trí đỗ
  const handleDeleteSlot = async (slotId) => {
    if (!confirm('Bạn có chắc muốn xóa vị trí đỗ này?')) return;
    try {
      await vehicleAPI.deleteParkingSlot(slotId);
      if (flash) flash('✅ Xóa vị trí đỗ thành công!');
      fetchSlots();
    } catch (error) {
      console.error('Delete slot error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa vị trí đỗ'));
    }
  };

  // 🔥 SỬA: Gọi API cập nhật trạng thái vị trí đỗ
  const handleToggleOccupied = async (slot) => {
    try {
      await vehicleAPI.updateParkingSlot(slot.SlotID, {
        isOccupied: slot.IsOccupied ? 0 : 1
      });
      if (flash) flash(`✅ ${slot.IsOccupied ? 'Mở' : 'Đóng'} vị trí đỗ thành công!`);
      fetchSlots();
    } catch (error) {
      console.error('Toggle error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Có lỗi xảy ra'));
    }
  };

  // 🔥 SỬA: Gọi API cập nhật vị trí đỗ
  const handleUpdateSlot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await vehicleAPI.updateParkingSlot(selectedSlot.SlotID, {
        slotNumber: form.slotNumber,
        vehicleTypeId: parseInt(form.vehicleTypeId),
        isOccupied: form.isOccupied
      });
      if (flash) flash('✅ Cập nhật vị trí đỗ thành công!');
      setModalOpen(false);
      resetForm();
      fetchSlots();
    } catch (error) {
      console.error('Update error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể cập nhật vị trí đỗ'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      areaId: '',
      slotNumber: '',
      vehicleTypeId: '',
      isOccupied: 0
    });
    setSelectedSlot(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditModal = (slot) => {
    setSelectedSlot(slot);
    setForm({
      areaId: slot.AreaID || '',
      slotNumber: slot.SlotNumber || '',
      vehicleTypeId: slot.VehicleTypeID || '',
      isOccupied: slot.IsOccupied || 0
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const openViewModal = (slot) => {
    setSelectedSlot(slot);
    setModalMode('view');
    setModalOpen(true);
  };

  // Filtered data
  const filteredSlots = useMemo(() => {
    const q = search.toLowerCase();
    return slots.filter(s => {
      const slot = (s.SlotNumber || '').toLowerCase();
      const area = (s.AreaName || '').toLowerCase();
      return slot.includes(q) || area.includes(q);
    });
  }, [slots, search]);

  // Stats
  const stats = useMemo(() => {
    const total = slots.length;
    const occupied = slots.filter(s => s.IsOccupied === 1).length;
    const available = slots.filter(s => s.IsOccupied === 0).length;
    const carSlots = slots.filter(s => s.VehicleType?.includes('Ô tô')).length;
    const motoSlots = slots.filter(s => s.VehicleType?.includes('Xe máy')).length;
    return { total, occupied, available, carSlots, motoSlots };
  }, [slots]);

  const getStatusBadge = (slot) => {
    return slot.IsOccupied ? 
      <Badge tone="red">Đã có xe</Badge> : 
      <Badge tone="green">Còn trống</Badge>;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý bãi xe</h3>
            <p className="text-sm text-slate-500">
              Quản lý vị trí đỗ xe.
              <span className="ml-2 text-emerald-600 font-semibold">
                {stats.available} chỗ trống
              </span>
              <span className="ml-2 text-rose-600 font-semibold">
                / {stats.occupied} đã có xe
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm vị trí, khu vực..."
              className="w-48"
            />
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả khu vực</option>
              {areas.map(a => (
                <option key={a.AreaID} value={a.AreaID}>
                  {a.AreaName}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả loại xe</option>
              {vehicleTypes.map(t => (
                <option key={t.VehicleTypeID} value={t.VehicleTypeID}>
                  {t.TypeName}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="0">Còn trống</option>
              <option value="1">Đã có xe</option>
            </select>
            <Button onClick={openCreateModal}>
              <Plus size={16} /> Thêm vị trí
            </Button>
            <Button variant="secondary" onClick={fetchSlots} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={ParkingCircle} label="Tổng vị trí" value={stats.total} hint="Đang quản lý" />
        <StatCard icon={CheckCircle2} label="Còn trống" value={stats.available} hint="Sẵn sàng" />
        <StatCard icon={X} label="Đã có xe" value={stats.occupied} hint="Đang sử dụng" />
        <StatCard icon={Car} label="Ô tô" value={stats.carSlots} hint="Vị trí ô tô" />
        <StatCard icon={Car} label="Xe máy" value={stats.motoSlots} hint="Vị trí xe máy" />
      </div>

      {/* Slot List - Grid View */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải sơ đồ bãi xe...</p>
        </Card>
      ) : filteredSlots.length === 0 ? (
        <Card className="p-8 text-center">
          <Home size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có vị trí đỗ</h3>
          <p className="text-sm text-slate-500">Nhấn "Thêm vị trí" để tạo mới</p>
          <Button className="mt-4" onClick={openCreateModal}>
            <Plus size={16} /> Thêm vị trí
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {filteredSlots.map((slot) => (
            <Card
              key={slot.SlotID}
              className={`group hover:border-[#1f4f46]/30 transition-all cursor-pointer ${
                slot.IsOccupied ? 'border-rose-200 bg-rose-50/30' : 'border-emerald-200 bg-emerald-50/30'
              }`}
              onClick={() => openViewModal(slot)}
            >
              <div className="p-4 text-center">
                <div className="flex justify-between items-start">
                  <div className={`text-2xl font-black ${
                    slot.IsOccupied ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {slot.SlotNumber}
                  </div>
                  {getStatusBadge(slot)}
                </div>
                
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-medium text-slate-700">{slot.VehicleType || 'Chưa xác định'}</p>
                  <p className="text-slate-500">{slot.AreaName}</p>
                </div>

                <div className="mt-3 flex gap-2 justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      openViewModal(slot);
                    }}
                  >
                    <Eye size={14} /> Xem
                  </Button>
                  <Button
                    variant={slot.IsOccupied ? 'warning' : 'success'}
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleOccupied(slot);
                    }}
                  >
                    {slot.IsOccupied ? 'Trả chỗ' : 'Đóng chỗ'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={modalMode === 'create' ? 'Thêm vị trí đỗ mới' : modalMode === 'edit' ? 'Cập nhật vị trí đỗ' : 'Chi tiết vị trí đỗ'}
        description={modalMode === 'view' ? 'Xem thông tin vị trí đỗ' : 'Nhập thông tin vị trí đỗ'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {modalMode === 'view' && selectedSlot ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-950">{selectedSlot.SlotNumber}</h3>
                <p className="text-sm text-slate-500">{selectedSlot.AreaName}</p>
              </div>
              {getStatusBadge(selectedSlot)}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin vị trí</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Loại xe:</span> {selectedSlot.VehicleType || 'Chưa xác định'}</div>
                  <div><span className="text-slate-500">Khu vực:</span> {selectedSlot.AreaName}</div>
                  <div><span className="text-slate-500">Trạng thái:</span> {selectedSlot.IsOccupied ? 'Đã có xe' : 'Còn trống'}</div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin xe (nếu có)</p>
                {selectedSlot.Vehicle ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <div><span className="text-slate-500">Biển số:</span> {selectedSlot.Vehicle.PlateNumber}</div>
                    <div><span className="text-slate-500">Chủ xe:</span> {selectedSlot.Vehicle.OwnerName}</div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-2">Đang trống</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => {
                setModalMode('edit');
                setForm({
                  areaId: selectedSlot.AreaID || '',
                  slotNumber: selectedSlot.SlotNumber || '',
                  vehicleTypeId: selectedSlot.VehicleTypeID || '',
                  isOccupied: selectedSlot.IsOccupied || 0
                });
                setSelectedSlot(selectedSlot);
              }}>
                <Edit size={16} /> Sửa
              </Button>
              <Button variant="danger" onClick={() => {
                setModalOpen(false);
                handleDeleteSlot(selectedSlot.SlotID);
              }}>
                <Trash2 size={16} /> Xóa
              </Button>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={modalMode === 'create' ? handleSubmit : handleUpdateSlot} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Khu vực *</label>
                <select
                  value={form.areaId}
                  onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                  required
                >
                  <option value="">Chọn khu vực</option>
                  {areas.map(a => (
                    <option key={a.AreaID} value={a.AreaID}>
                      {a.AreaName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Số vị trí *</label>
                <Input
                  value={form.slotNumber}
                  onChange={(e) => setForm({ ...form, slotNumber: e.target.value.toUpperCase() })}
                  placeholder="A1-01"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Loại xe *</label>
                <select
                  value={form.vehicleTypeId}
                  onChange={(e) => setForm({ ...form, vehicleTypeId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                  required
                >
                  <option value="">Chọn loại xe</option>
                  {vehicleTypes.map(t => (
                    <option key={t.VehicleTypeID} value={t.VehicleTypeID}>
                      {t.TypeName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái</label>
                <select
                  value={form.isOccupied}
                  onChange={(e) => setForm({ ...form, isOccupied: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                >
                  <option value={0}>Còn trống</option>
                  <option value={1}>Đã có xe</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {modalMode === 'create' ? 'Thêm vị trí' : 'Cập nhật'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}