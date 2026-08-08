// src/pages/ApartmentManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Plus, Search, Download, Edit, Trash2, Eye,
  Home, Layers, ChevronRight, RefreshCw, AlertCircle,
  CheckCircle2, X, Users, FileText, CreditCard, Clock,
  Calendar, MapPin, User, Phone, Mail, Shield, ArrowLeft
} from 'lucide-react';
import { apartmentAPI, contractAPI, residentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money, getInitials } from '../utils/formatters';

export default function ApartmentManagement({ flash }) {
  // State
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [statuses, setStatuses] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [areas, setAreas] = useState([]);
  const [floors, setFloors] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalApartments, setTotalApartments] = useState(0);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'status' | 'history'

  // Form state
  const [form, setForm] = useState({
    apartmentCode: '',
    area: '',
    floorId: '',
    buildingId: '',
    statusId: 1
  });

  // Fetch data
  const fetchApartments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apartmentAPI.getAll(search, statusFilter, page, 20);
      console.log('📊 Apartment API response:', res);
      
      if (res && res.data) {
        const data = Array.isArray(res.data) ? res.data : [];
        setApartments(data);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalApartments(res.pagination?.total || data.length);
      } else {
        setApartments([]);
      }
    } catch (error) {
      console.error('Error fetching apartments:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách căn hộ'));
      setApartments([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, flash]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await apartmentAPI.getStatuses();
      const data = res?.data || res || [];
      setStatuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  }, []);

  const fetchBuildings = useCallback(async () => {
    try {
      const res = await apartmentAPI.getBuildings();
      const data = res?.data || res || [];
      setBuildings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  }, []);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await apartmentAPI.getAreas();
      const data = res?.data || res || [];
      setAreas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  }, []);

  const fetchFloors = useCallback(async (buildingId) => {
    try {
      const res = await apartmentAPI.getFloors(buildingId);
      const data = res?.data || res || [];
      setFloors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching floors:', error);
    }
  }, []);

  useEffect(() => {
    fetchApartments();
    fetchStatuses();
    fetchBuildings();
    fetchAreas();
  }, [fetchApartments, fetchStatuses, fetchBuildings, fetchAreas]);

  useEffect(() => {
    if (form.buildingId) {
      fetchFloors(form.buildingId);
    } else {
      setFloors([]);
    }
  }, [form.buildingId, fetchFloors]);

  // Handlers
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apartmentAPI.create(form);
      if (flash) flash('✅ Tạo căn hộ thành công!');
      setModalOpen(false);
      resetForm();
      fetchApartments();
    } catch (error) {
      console.error('Create error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tạo căn hộ'));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await apartmentAPI.update(selectedApartment.ApartmentID, form);
      if (flash) flash('✅ Cập nhật căn hộ thành công!');
      setModalOpen(false);
      resetForm();
      fetchApartments();
    } catch (error) {
      console.error('Update error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể cập nhật căn hộ'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa căn hộ này?')) return;
    try {
      await apartmentAPI.delete(id);
      if (flash) flash('✅ Xóa căn hộ thành công!');
      fetchApartments();
    } catch (error) {
      console.error('Delete error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa căn hộ'));
    }
  };

  const resetForm = () => {
    setForm({
      apartmentCode: '',
      area: '',
      floorId: '',
      buildingId: '',
      statusId: 1
    });
    setSelectedApartment(null);
    setFloors([]);
  };

  const openViewModal = (apartment) => {
    setSelectedApartment(apartment);
    setModalMode('view');
    setModalOpen(true);
  };

  const openEditModal = (apartment) => {
    setSelectedApartment(apartment);
    setForm({
      apartmentCode: apartment.ApartmentCode || '',
      area: apartment.Area || '',
      floorId: apartment.FloorID || '',
      buildingId: apartment.BuildingID || '',
      statusId: apartment.StatusID || 1
    });
    if (apartment.BuildingID) {
      fetchFloors(apartment.BuildingID);
    }
    setModalMode('edit');
    setModalOpen(true);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
  };

  const handleStatusChange = async (apartmentId, statusId) => {
    try {
      await apartmentAPI.update(apartmentId, { statusId });
      if (flash) flash('✅ Cập nhật trạng thái thành công!');
      fetchApartments();
    } catch (error) {
      console.error('Status change error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể cập nhật trạng thái'));
    }
  };

  // Get status badge
  const getStatusBadge = (statusName) => {
    const map = {
      'Còn trống': 'blue',
      'Đang ở': 'green',
      'Đang bảo trì': 'amber',
      'Đang thuê': 'green',
    };
    const tone = map[statusName] || 'slate';
    return <Badge tone={tone}>{statusName}</Badge>;
  };

  // Stats
  const stats = useMemo(() => {
    const total = apartments.length;
    const occupied = apartments.filter(a => a.StatusID === 2 || a.Status === 'Đang ở').length;
    const vacant = apartments.filter(a => a.StatusID === 1 || a.Status === 'Còn trống').length;
    const maintenance = apartments.filter(a => a.StatusID === 3 || a.Status === 'Đang bảo trì').length;
    const rented = apartments.filter(a => a.StatusID === 4 || a.Status === 'Đang thuê').length;
    return { total, occupied, vacant, maintenance, rented };
  }, [apartments]);

  // Status distribution for chart
  const statusDistribution = useMemo(() => {
    return statuses.map(s => ({
      name: s.StatusName,
      count: apartments.filter(a => a.StatusID === s.StatusID).length
    })).filter(item => item.count > 0);
  }, [apartments, statuses]);

  // Lấy lịch sử thuê cho một căn hộ
  const getRentalHistory = async (apartmentId) => {
    try {
      const res = await apartmentAPI.getById(apartmentId);
      return res?.data?.RentalHistory || [];
    } catch (error) {
      console.error('Error fetching rental history:', error);
      return [];
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý căn hộ</h3>
            <p className="text-sm text-slate-500">
              Quản lý danh sách căn hộ, trạng thái và thông tin liên quan.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {stats.occupied + stats.rented} đã thuê / {stats.total} tổng
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả trạng thái</option>
              {statuses.map(s => (
                <option key={s.StatusID} value={s.StatusID}>{s.StatusName}</option>
              ))}
            </select>
            <Button onClick={openCreateModal}>
              <Plus size={16} /> Thêm căn hộ
            </Button>
            <Button variant="secondary" onClick={fetchApartments} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'list'
              ? 'border-[#1f4f46] text-[#1f4f46]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Home size={16} /> Danh sách căn hộ
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'status'
              ? 'border-[#1f4f46] text-[#1f4f46]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <CheckCircle2 size={16} /> Trạng thái
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'history'
              ? 'border-[#1f4f46] text-[#1f4f46]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Clock size={16} /> Lịch sử thuê
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={Building2} label="Tổng căn hộ" value={stats.total} hint="Đang quản lý" />
        <StatCard icon={Users} label="Đã thuê" value={stats.occupied + stats.rented} hint="Có người ở" />
        <StatCard icon={Home} label="Trống" value={stats.vacant} hint="Chưa có người thuê" />
        <StatCard icon={AlertCircle} label="Đang bảo trì" value={stats.maintenance} hint="Cần sửa chữa" />
        <StatCard icon={FileText} label="Đang thuê" value={stats.rented} hint="Đang cho thuê" />
      </div>

      {/* TAB: Danh sách căn hộ */}
      {activeTab === 'list' && (
        <>
          {loading ? (
            <Card className="p-8 text-center">
              <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
              <p className="mt-3 font-bold text-slate-900">Đang tải danh sách căn hộ...</p>
            </Card>
          ) : apartments.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 size={48} className="text-slate-300 mx-auto" />
              <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có căn hộ</h3>
              <p className="text-sm text-slate-500">Nhấn "Thêm căn hộ" để tạo mới</p>
              <Button className="mt-4" onClick={openCreateModal}>
                <Plus size={16} /> Thêm căn hộ
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {apartments.map((apartment) => {
                const statusName = apartment.Status || 'Chưa xác định';
                return (
                  <Card key={apartment.ApartmentID || apartment.id} className="group hover:border-[#1f4f46]/30 transition-all">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-2xl font-black text-slate-950 group-hover:text-[#1f4f46]">
                            {apartment.ApartmentCode}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {apartment.BuildingName} - Tầng {apartment.FloorNumber}
                          </p>
                        </div>
                        {getStatusBadge(statusName)}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-500">Diện tích</p>
                          <p className="font-bold text-slate-900">{apartment.Area} m²</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Khu vực</p>
                          <p className="font-bold text-slate-900">{apartment.AreaName}</p>
                        </div>
                        {apartment.CurrentRent && (
                          <div className="col-span-2">
                            <p className="text-slate-500">Giá thuê hiện tại</p>
                            <p className="font-bold text-[#1f4f46]">{money(apartment.CurrentRent)}/tháng</p>
                          </div>
                        )}
                        {apartment.CurrentResidents && (
                          <div className="col-span-2">
                            <p className="text-slate-500">Cư dân</p>
                            <p className="font-bold text-slate-900 truncate">{apartment.CurrentResidents}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button variant="secondary" className="flex-1" onClick={() => openViewModal(apartment)}>
                          <Eye size={14} /> Xem
                        </Button>
                        <Button variant="secondary" className="flex-1" onClick={() => openEditModal(apartment)}>
                          <Edit size={14} /> Sửa
                        </Button>
                        <Button variant="danger" className="flex-1" onClick={() => handleDelete(apartment.ApartmentID)}>
                          <Trash2 size={14} />
                        </Button>
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
                      ? 'bg-[#1f4f46] text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB: Trạng thái căn hộ */}
      {activeTab === 'status' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statusDistribution.length === 0 ? (
            <Card className="col-span-4 p-8 text-center">
              <CheckCircle2 size={48} className="text-slate-300 mx-auto" />
              <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có dữ liệu</h3>
              <p className="text-sm text-slate-500">Chưa có căn hộ hoặc chưa cập nhật trạng thái</p>
            </Card>
          ) : (
            statusDistribution.map((item) => (
              <Card key={item.name} className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{item.name}</p>
                    <p className="text-3xl font-bold text-slate-950">{item.count}</p>
                    <p className="text-xs text-slate-500">
                      {stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#eef5f2] p-3 text-[#1f4f46]">
                    <CheckCircle2 size={24} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB: Lịch sử thuê */}
      {activeTab === 'history' && (
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={20} className="text-[#1f4f46]" />
            <h3 className="text-base font-bold text-slate-950">Lịch sử thuê</h3>
          </div>
          {apartments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock size={48} className="mx-auto mb-3 text-slate-300" />
              <p>Chưa có dữ liệu lịch sử thuê</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Căn hộ</th>
                    <th className="px-5 py-3">Chủ hộ</th>
                    <th className="px-5 py-3">Giá thuê</th>
                    <th className="px-5 py-3">Thời hạn</th>
                    <th className="px-5 py-3">Trạng thái</th>
                    <th className="px-5 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {apartments.map((apartment) => (
                    <tr key={apartment.ApartmentID} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-bold text-slate-950">{apartment.ApartmentCode}</td>
                      <td className="px-5 py-4 text-slate-600">{apartment.CurrentResidents || 'Chưa có'}</td>
                      <td className="px-5 py-4 font-semibold text-[#1f4f46]">
                        {apartment.CurrentRent ? money(apartment.CurrentRent) : 'Chưa có'}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {apartment.ContractStart && apartment.ContractEnd ? (
                          `${formatDate(apartment.ContractStart)} → ${formatDate(apartment.ContractEnd)}`
                        ) : (
                          'Chưa có hợp đồng'
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(apartment.Status || 'Chưa xác định')}
                      </td>
                      <td className="px-5 py-4">
                        <Button variant="secondary" size="sm" onClick={() => openViewModal(apartment)}>
                          <Eye size={14} /> Chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal - View/Edit/Create */}
      <Modal
        open={modalOpen}
        title={modalMode === 'view' ? 'Chi tiết căn hộ' : modalMode === 'create' ? 'Thêm căn hộ mới' : 'Cập nhật căn hộ'}
        description={modalMode === 'view' ? 'Xem thông tin chi tiết căn hộ' : 'Nhập thông tin căn hộ'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {modalMode === 'view' && selectedApartment ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-950">{selectedApartment.ApartmentCode}</h3>
                <p className="text-sm text-slate-500">
                  {selectedApartment.BuildingName} - Tầng {selectedApartment.FloorNumber}
                </p>
              </div>
              {getStatusBadge(selectedApartment.Status || 'Chưa xác định')}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin cơ bản</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Diện tích:</span> {selectedApartment.Area} m²</div>
                  <div><span className="text-slate-500">Khu vực:</span> {selectedApartment.AreaName}</div>
                  <div><span className="text-slate-500">Địa chỉ:</span> {selectedApartment.AreaAddress}</div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">Hợp đồng hiện tại</p>
                {selectedApartment.CurrentContract ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <div><span className="text-slate-500">Số HĐ:</span> {selectedApartment.CurrentContract.ContractNumber}</div>
                    <div><span className="text-slate-500">Chủ hộ:</span> {selectedApartment.CurrentContract.OwnerName}</div>
                    <div><span className="text-slate-500">Giá thuê:</span> {money(selectedApartment.CurrentContract.Rent)}</div>
                    <div><span className="text-slate-500">Thời hạn:</span> {formatDate(selectedApartment.CurrentContract.StartDate)} → {formatDate(selectedApartment.CurrentContract.EndDate)}</div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-2">Chưa có hợp đồng</p>
                )}
              </div>
            </div>

            {selectedApartment.RentalHistory && selectedApartment.RentalHistory.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-500">Lịch sử thuê</p>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {selectedApartment.RentalHistory.map((history, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold">{history.ContractNumber}</span>
                        <Badge tone={history.ContractStatus === 'Hiệu lực' ? 'green' : 'red'}>
                          {history.ContractStatus}
                        </Badge>
                      </div>
                      <div className="mt-1 text-slate-500">
                        {history.OwnerName} - {money(history.Rent)}/tháng
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDate(history.StartDate)} → {formatDate(history.EndDate)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={modalMode === 'create' ? handleCreate : handleUpdate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Mã căn hộ *</label>
              <Input
                value={form.apartmentCode}
                onChange={(e) => setForm({...form, apartmentCode: e.target.value.toUpperCase()})}
                placeholder="A-1201"
                required
                disabled={modalMode === 'edit'}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Khu vực</label>
                <select
                  value={form.areaId}
                  onChange={(e) => setForm({...form, areaId: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                >
                  <option value="">Chọn khu vực</option>
                  {areas.map(a => (
                    <option key={a.AreaID} value={a.AreaID}>{a.AreaName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Tòa nhà</label>
                <select
                  value={form.buildingId}
                  onChange={(e) => {
                    setForm({...form, buildingId: e.target.value, floorId: ''});
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                >
                  <option value="">Chọn tòa nhà</option>
                  {buildings.map(b => (
                    <option key={b.BuildingID} value={b.BuildingID}>{b.BuildingName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Tầng</label>
                <select
                  value={form.floorId}
                  onChange={(e) => setForm({...form, floorId: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                >
                  <option value="">Chọn tầng</option>
                  {floors.map(f => (
                    <option key={f.FloorID} value={f.FloorID}>Tầng {f.FloorNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Diện tích (m²) *</label>
                <Input
                  type="number"
                  value={form.area}
                  onChange={(e) => setForm({...form, area: e.target.value})}
                  placeholder="75.5"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái</label>
              <select
                value={form.statusId}
                onChange={(e) => setForm({...form, statusId: parseInt(e.target.value)})}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
              >
                {statuses.map(s => (
                  <option key={s.StatusID} value={s.StatusID}>{s.StatusName}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit">
                {modalMode === 'create' ? 'Thêm căn hộ' : 'Cập nhật'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}