import { PermissionGate } from '../permissions';
// src/pages/VehicleManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Car, Plus, Search, Download, Edit, Trash2, Eye,
  RefreshCw, CheckCircle2, X, AlertCircle,
  User, Home, Calendar, CreditCard, MapPin,
  Filter, Upload, FileText, Printer, Lock, Key
} from 'lucide-react';
import { vehicleAPI, residentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money, getInitials } from '../utils/formatters';

const isBitOn = (value) => {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true'
  );
};
export default function VehicleManagement({ flash }) {
  // State
  const [vehicles, setVehicles] = useState([]);
  const [residents, setResidents] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [form, setForm] = useState({
    residentId: '',
    plateNumber: '',
    vehicleTypeId: '',
    cardExpiryMonths: 1
  });

  // ============================================
  // 🔥 HÀM KIỂM TRA TRẠNG THÁI XE
  // ============================================
  const getVehicleStatus = useCallback((vehicle) => {
    if (!vehicle) {
      return { label: 'Không xác định', tone: 'slate' };
    }

    // Kiểm tra Status (0 = không hoạt động, 1 = hoạt động)
    if (!isBitOn(vehicle.Status)) {
  return { label: 'Không hoạt động', tone: 'red' };
}

    // Kiểm tra thẻ xe
    if (vehicle.CardID) {
      const now = new Date();
      const expiredDate = new Date(vehicle.CardExpiredDate);
      
      if (isNaN(expiredDate.getTime())) {
        return { label: 'Hoạt động (Không có hạn thẻ)', tone: 'green' };
      }
      
      if (expiredDate < now) {
        return { label: 'Hoạt động (Thẻ hết hạn)', tone: 'amber' };
      }
      
      return { label: 'Hoạt động', tone: 'green' };
    }

    return { label: 'Hoạt động', tone: 'green' };
  }, []);

  // ============================================
  // 🔥 BADGE HIỂN THỊ
  // ============================================
  const getStatusBadge = useCallback((vehicle) => {
    const status = getVehicleStatus(vehicle);
    return <Badge tone={status.tone}>{status.label}</Badge>;
  }, [getVehicleStatus]);

  // ============================================
  // 🔥 THỐNG KÊ CHÍNH XÁC
  // ============================================
  const stats = useMemo(() => {
    const total = vehicles.length;
    let active = 0;
    let inactive = 0;
    let hasCard = 0;

vehicles.forEach(v => {
  if (isBitOn(v.Status)) {
    active++;
  } else {
    inactive++;
  }

  if (v.CardID) {
    hasCard++;
  }
});

    return { total, active, inactive, hasCard };
  }, [vehicles]);

  // ============================================
  // 🔥 FETCH DATA
  // ============================================
  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await vehicleAPI.getAll(
        '', // residentId
        typeFilter || '', // vehicleTypeId
        statusFilter !== '' ? statusFilter : '', // status
        page,
        20
      );
      console.log('📊 Vehicles response:', res);
      
      if (res && res.success !== false) {
        const data = res?.data || [];
        setVehicles(Array.isArray(data) ? data : []);
        setTotalPages(res?.pagination?.totalPages || 1);
      } else {
        setVehicles([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('❌ Error fetching vehicles:', error);
      const message = error.response?.data?.message || error.message || 'Không thể tải danh sách xe';
      if (flash) flash('❌ ' + message);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, page, flash]);

  const fetchResidents = useCallback(async () => {
    try {
      const permissions=JSON.parse(localStorage.getItem('user') || '{}').permissions || [];
      const res = permissions.some(p=>['RESIDENT_VIEW_ALL','RESIDENT_VIEW_OWN'].includes(p)) ? await residentAPI.getAll('', 1, 999) : await vehicleAPI.getEligibleResidents();
      const data = res?.data || res || [];
      setResidents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching residents:', error);
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
    fetchVehicles();
    if ((JSON.parse(localStorage.getItem('user') || '{}').permissions || []).some(p => ['RESIDENT_VIEW_ALL','RESIDENT_VIEW_OWN','VEHICLE_CREATE'].includes(p))) fetchResidents();
    fetchVehicleTypes();
  }, [fetchVehicles, fetchResidents, fetchVehicleTypes]);

  // ============================================
  // 🔥 CRUD OPERATIONS
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cardExpiryDate = form.cardExpiryMonths
        ? new Date(new Date().setMonth(new Date().getMonth() + Number(form.cardExpiryMonths)))
        : null;
      const payload = {
        residentId: form.residentId,
        plateNumber: form.plateNumber,
        vehicleTypeId: form.vehicleTypeId,
        cardExpiryDate: cardExpiryDate ? cardExpiryDate.toISOString().slice(0, 10) : ''
      };

      if (modalMode === 'create') {
        await vehicleAPI.create(payload);
        if (flash) flash('✅ Đăng ký xe thành công!');
      } else {
        await vehicleAPI.update(selectedVehicle.VehicleID, payload);
        if (flash) flash('✅ Cập nhật xe thành công!');
      }
      setModalOpen(false);
      resetForm();
      fetchVehicles();
    } catch (error) {
      console.error('Submit error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Có lỗi xảy ra'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa xe này?')) return;
    try {
      await vehicleAPI.delete(id);
      if (flash) flash('✅ Xóa xe thành công!');
      fetchVehicles();
    } catch (error) {
      console.error('Delete error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa xe'));
    }
  };

const handleToggleStatus = async (vehicle) => {
  const newStatus = isBitOn(vehicle.Status) ? 0 : 1;
    const action = newStatus === 1 ? 'Kích hoạt' : 'Vô hiệu hóa';
    
    if (!confirm(`Bạn có chắc muốn ${action} xe ${vehicle.PlateNumber}?`)) return;
    
    setLoading(true);
    try {
      await vehicleAPI.update(vehicle.VehicleID, { status: newStatus });
      if (flash) flash(`✅ ${action} xe thành công!`);
      fetchVehicles();
    } catch (error) {
      console.error('Toggle status error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể cập nhật trạng thái xe'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      residentId: '',
      plateNumber: '',
      vehicleTypeId: '',
      cardExpiryMonths: 1
    });
    setSelectedVehicle(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setForm({
      residentId: vehicle.ResidentID || '',
      plateNumber: vehicle.PlateNumber || '',
      vehicleTypeId: vehicle.VehicleTypeID || '',
      cardExpiryMonths: 1
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const openViewModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setModalMode('view');
    setModalOpen(true);
  };

  // ============================================
  // 🔧 UTILITY
  // ============================================
  const getVehicleTypeIcon = (typeName) => {
    if (!typeName) return <Car size={20} />;
    const name = typeName.toLowerCase();
    if (name.includes('ôtô') || name.includes('o to')) {
      return <Car size={20} className="text-blue-600" />;
    }
    if (name.includes('xe máy') || name.includes('xe may')) {
      return <Car size={20} className="text-emerald-600" />;
    }
    return <Car size={20} className="text-purple-600" />;
  };

const getCardStatusBadge = (vehicle) => {
  // Chưa được cấp thẻ
  if (!vehicle.CardID) {
    return <Badge tone="slate">Chưa có thẻ</Badge>;
  }

  // Thẻ đã bị khóa / ngừng
  if (
    vehicle.CardStatus === 0 ||
    vehicle.CardStatus === false ||
    vehicle.CardStatus === '0'
  ) {
    return <Badge tone="red">Đã khóa</Badge>;
  }

  // Kiểm tra ngày hết hạn
  if (vehicle.CardExpiredDate) {
    const expiredDate = String(vehicle.CardExpiredDate).slice(0, 10);

    const now = new Date();
    const today =
      `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, '0')}-` +
      `${String(now.getDate()).padStart(2, '0')}`;

    if (expiredDate < today) {
      return <Badge tone="red">Hết hạn</Badge>;
    }
  }

  // Thẻ đang hoạt động và chưa hết hạn
  return <Badge tone="green">Còn hiệu lực</Badge>;
};

  const VEHICLE_TYPE_OPTIONS = [
    { key: 'car', label: 'Xe hơi', vehicleTypeId: 4, fee: 300000 },
    { key: 'motorbike', label: 'Xe máy', vehicleTypeId: 5, fee: 150000 },
    { key: 'bicycle', label: 'Xe đạp', vehicleTypeId: 6, fee: 0 }
  ];

  const resolveVehicleTypeOption = useCallback((name) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('xe máy') || lower.includes('xe may') || lower.includes('motor')) return VEHICLE_TYPE_OPTIONS[1];
    if (lower.includes('xe đạp') || lower.includes('xe dap') || lower.includes('bicycle')) return VEHICLE_TYPE_OPTIONS[2];
    return VEHICLE_TYPE_OPTIONS[0];
  }, []);

  const selectedVehicleTypeOption = useMemo(() => {
    return resolveVehicleTypeOption(
      vehicleTypes.find(t => String(t.VehicleTypeID) === String(form.vehicleTypeId))?.TypeName
    );
  }, [form.vehicleTypeId, vehicleTypes, resolveVehicleTypeOption]);

  // ============================================
  // 📊 FILTER & RENDER
  // ============================================
  const filteredVehicles = useMemo(() => {
    if (!search) return vehicles;
    const q = search.toLowerCase();
    return vehicles.filter(v => {
      const plate = (v.PlateNumber || '').toLowerCase();
      const owner = (v.OwnerName || '').toLowerCase();
      const type = (v.VehicleType || '').toLowerCase();
      return plate.includes(q) || owner.includes(q) || type.includes(q);
    });
  }, [vehicles, search]);

  if (loading && vehicles.length === 0) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw size={32} className="animate-spin text-[#635bff] mx-auto" />
        <p className="mt-3 font-bold text-slate-900">Đang tải danh sách xe...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý xe cư dân</h3>
            <p className="text-sm text-slate-500">
              Quản lý biển số, loại xe, vị trí đỗ và trạng thái thẻ xe.
              <span className="ml-2 text-[#635bff] font-semibold">
                {stats.active} xe đang hoạt động
              </span>
              {stats.inactive > 0 && (
                <span className="ml-2 text-rose-600 font-semibold">
                  {stats.inactive} xe không hoạt động
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm biển số, chủ xe..."
              className="w-48"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#635bff]"
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
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#635bff]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="1">Hoạt động</option>
              <option value="0">Không hoạt động</option>
            </select>
            <PermissionGate permission="VEHICLE_CREATE"><Button onClick={openCreateModal}>
              <Plus size={16} /> Đăng ký xe
            </Button></PermissionGate>
            <Button variant="secondary" onClick={fetchVehicles} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Car} label="Tổng xe" value={stats.total} hint="Đã đăng ký" />
        <StatCard icon={CheckCircle2} label="Hoạt động" value={stats.active} hint="Đang sử dụng" />
        <StatCard icon={X} label="Không hoạt động" value={stats.inactive} hint="Đã khóa" />
        <StatCard icon={CreditCard} label="Có thẻ" value={stats.hasCard} hint="Đã cấp thẻ" />
      </div>

      {/* Vehicle List */}
      {vehicles.length === 0 ? (
        <Card className="p-8 text-center">
          <Car size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có xe</h3>
          <p className="text-sm text-slate-500">Nhấn "Đăng ký xe" để thêm mới</p>
          <PermissionGate permission="VEHICLE_CREATE"><Button className="mt-4" onClick={openCreateModal}>
            <Plus size={16} /> Đăng ký xe
          </Button></PermissionGate>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredVehicles.map((vehicle) => {
            const status = getVehicleStatus(vehicle);
            const typeOption = resolveVehicleTypeOption(vehicle.VehicleType);
            return (
              <Card key={vehicle.VehicleID} className="group hover:border-[#635bff]/30 transition-all overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0efff] text-[#635bff]">
                        {getVehicleTypeIcon(vehicle.VehicleType)}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-950 group-hover:text-[#635bff] transition">
                          {vehicle.PlateNumber}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {vehicle.VehicleType}
                          <span className="ml-2 text-[#635bff] font-semibold">
                            {money(typeOption.fee).replace('₫', '')}/tháng
                          </span>
                        </p>
                      </div>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Chủ xe</span>
                      <span className="font-medium text-slate-950">{vehicle.OwnerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Căn hộ</span>
                      <span className="font-medium text-slate-950">{vehicle.ApartmentCode || 'Chưa có'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Thẻ xe</span>
                      {getCardStatusBadge(vehicle)}
                    </div>
                    {vehicle.SlotNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Vị trí đỗ</span>
                        <span className="font-medium text-slate-950 flex items-center gap-1">
                          <MapPin size={14} className="text-[#635bff]" />
                          {vehicle.SlotNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => openViewModal(vehicle)}>
                      <Eye size={14} /> Xem
                    </Button>
                    <PermissionGate permission="VEHICLE_UPDATE"><Button variant="secondary" className="flex-1" onClick={() => openEditModal(vehicle)}>
                      <Edit size={14} /> Sửa
                    </Button></PermissionGate>
                    <PermissionGate permission="VEHICLE_UPDATE"><Button 
  variant={isBitOn(vehicle.Status) ? 'warning' : 'success'} 
  className="flex-1" 
  onClick={() => handleToggleStatus(vehicle)}
>
  {isBitOn(vehicle.Status) ? <Lock size={14} /> : <Key size={14} />}
  {isBitOn(vehicle.Status) ? 'Vô hiệu' : 'Kích hoạt'}
</Button></PermissionGate>
                    <PermissionGate permission="VEHICLE_DELETE"><Button variant="danger" className="flex-1" onClick={() => handleDelete(vehicle.VehicleID)}>
                      <Trash2 size={14} />
                    </Button></PermissionGate>
                  </div>
                </div>
              </Card>
            );
          })}
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
                  ? 'bg-[#635bff] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modal - View */}
      <Modal
        open={modalOpen}
        title={modalMode === 'create' ? 'Đăng ký xe mới' : modalMode === 'edit' ? 'Cập nhật xe' : 'Chi tiết xe'}
        description={modalMode === 'view' ? 'Xem thông tin chi tiết xe' : 'Nhập thông tin xe'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {modalMode === 'view' && selectedVehicle ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-950">{selectedVehicle.PlateNumber}</h3>
                <p className="text-sm text-slate-500">{selectedVehicle.VehicleType}</p>
              </div>
              {getStatusBadge(selectedVehicle)}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin chủ xe</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Họ tên:</span> {selectedVehicle.OwnerName}</div>
                  <div><span className="text-slate-500">SĐT:</span> {selectedVehicle.OwnerPhone || 'Chưa có'}</div>
                  <div><span className="text-slate-500">Căn hộ:</span> {selectedVehicle.ApartmentCode || 'Chưa có'}</div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin xe</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Ngày đăng ký:</span> {formatDate(selectedVehicle.RegisterDate)}</div>
                  <div>
  <span className="text-slate-500">Trạng thái:</span> 
  {isBitOn(selectedVehicle.Status) ? 'Hoạt động' : 'Không hoạt động'}
</div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-500">Thông tin thẻ xe</p>
              {selectedVehicle.CardID ? (
                <div className="mt-2 space-y-2 text-sm rounded-xl border border-slate-200 p-4">
                  <div><span className="text-slate-500">Mã thẻ:</span> <span className="font-bold">{selectedVehicle.CardCode}</span></div>
                  <div><span className="text-slate-500">Ngày cấp:</span> {formatDate(selectedVehicle.CardIssueDate)}</div>
                  <div><span className="text-slate-500">Hết hạn:</span> {formatDate(selectedVehicle.CardExpiredDate)}</div>
                  <div><span className="text-slate-500">Vị trí đỗ:</span> {selectedVehicle.SlotNumber || 'Chưa có'}</div>
                  <div><span className="text-slate-500">Trạng thái:</span> {getCardStatusBadge(selectedVehicle)}</div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-2">Chưa có thẻ xe</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {isBitOn(selectedVehicle.Status) ? (
                <PermissionGate permission="VEHICLE_UPDATE"><Button variant="warning" onClick={() => handleToggleStatus(selectedVehicle)}>
                  <Lock size={16} /> Vô hiệu hóa
                </Button></PermissionGate>
              ) : (
                <PermissionGate permission="VEHICLE_UPDATE"><Button variant="success" onClick={() => handleToggleStatus(selectedVehicle)}>
                  <Key size={16} /> Kích hoạt
                </Button></PermissionGate>
              )}
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Chủ xe *</label>
                <select
                  value={form.residentId}
                  onChange={(e) => setForm({ ...form, residentId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#635bff]"
                  required
                >
                  <option value="">Chọn chủ xe</option>
                  {residents.map(r => (
                    <option key={r.ResidentID} value={r.ResidentID}>
                      {r.FullName} - {r.ApartmentCode || 'Chưa có căn hộ'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Biển số *</label>
                <Input
                  value={form.plateNumber}
                  onChange={(e) => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })}
                  placeholder="30H-123.45"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Loại xe *</label>
                <div className="grid gap-2 md:grid-cols-3">
                  {VEHICLE_TYPE_OPTIONS.map((option) => {
                    const active = String(form.vehicleTypeId) === String(option.vehicleTypeId);
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setForm(prev => ({
                          ...prev,
                          vehicleTypeId: String(option.vehicleTypeId),
                        }))}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? 'border-[#635bff] bg-[#f0efff]'
                            : 'border-slate-200 bg-white hover:border-[#635bff]/40'
                        }`}
                      >
                        <div className="font-bold text-slate-950">{option.label}</div>
                        <div className="text-sm text-slate-500">
                          {option.fee === 0 ? 'Miễn phí' : `${money(option.fee).replace('₫', '')}/tháng`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Hạn thẻ</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 6].map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, cardExpiryMonths: months }))}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      Number(form.cardExpiryMonths) === months
                        ? 'border-[#635bff] bg-[#635bff] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-[#635bff]/40'
                    }`}
                  >
                    {months} tháng
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {modalMode === 'create' ? 'Đăng ký xe' : 'Cập nhật'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
