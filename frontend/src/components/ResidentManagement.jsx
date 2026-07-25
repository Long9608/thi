// src/components/ResidentManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Plus, Search, Download, Edit, Trash2, Eye,
  Mail, Phone, Calendar, MapPin, User, Shield, CheckCircle2,
  X, RefreshCw, MoreHorizontal, UserPlus, Building2,
  CreditCard, Clock, AlertCircle, FileText, Home, ChevronRight
} from 'lucide-react';
import { residentAPI, apartmentAPI, userAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard, EmptyState } from './UI';
import { formatDate, formatBirthday, getInitials, money } from '../utils/formatters';

export default function ResidentManagement({ flash }) {
  // State
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedResident, setSelectedResident] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [apartments, setApartments] = useState([]);
  const [birthdayFilter, setBirthdayFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [form, setForm] = useState({
    fullName: '',
    gender: 1,
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    identityNumber: '',
    issueDate: '',
    issuePlace: '',
    expiredDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    username: '',
    password: '',
    apartmentId: '',
    relationship: 'Chủ hộ'
  });

  // 🔥 Hàm helper xác định status - HỖ TRỢ CẢ BOOLEAN VÀ NUMBER
  const getStatusInfo = (resident) => {
    // Status có thể là boolean (true/false) hoặc number (1/0) hoặc string ('true'/'false')
    let isActive = false;
     
    if (resident.Status !== undefined && resident.Status !== null) {
      // Nếu là boolean
      if (typeof resident.Status === 'boolean') {
        isActive = resident.Status === true;
      } 
      // Nếu là number
      else if (typeof resident.Status === 'number') {
        isActive = resident.Status === 1;
      }
      // Nếu là string
      else if (typeof resident.Status === 'string') {
        isActive = resident.Status === 'true' || resident.Status === '1';
      }
    }
    
    return {
      text: isActive ? 'Đang ở' : 'Đã rời',
      tone: isActive ? 'green' : 'red'
    };
  };

  // Fetch data
  const fetchResidents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await residentAPI.getAll(search, page, 20);
      
      // 🔥 Log kiểm tra dữ liệu
      console.log('========================================');
      console.log('📊 API Response:', res);
      
      const data = res?.data || res || [];
      console.log('📊 Raw data:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('📊 Status check:');
        data.forEach((r, idx) => {
          console.log(`   ${idx + 1}. ${r.FullName}: Status = ${r.Status} (${typeof r.Status})`);
        });
      }
      console.log('========================================');
      
      // 🔥 Xử lý dữ liệu - giữ nguyên Status
      const processedData = Array.isArray(data) ? data.map(item => ({
        ...item,
        Status: item.Status,  // Giữ nguyên giá trị gốc
        Gender: item.Gender,
      })) : [];
      
      setResidents(processedData);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching residents:', error);
      if (flash) flash('❌ Không thể tải danh sách cư dân');
      setResidents([]);
    } finally {
      setLoading(false);
    }
  }, [search, page, flash]);

  const fetchApartments = useCallback(async () => {
    try {
      const res = await apartmentAPI.getAll('', '', 1, 999);
      const data = res?.data || res || [];
      setApartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching apartments:', error);
      setApartments([]);
    }
  }, []);

  useEffect(() => {
    fetchResidents();
    fetchApartments();
  }, [fetchResidents, fetchApartments]);

  // Handlers
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = {
        fullName: form.fullName,
        gender: form.gender,
        birthDate: form.birthDate || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        identityNumber: form.identityNumber || null,
        issueDate: form.issueDate || null,
        issuePlace: form.issuePlace || null,
        expiredDate: form.expiredDate || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
      };
      
      if (form.username && form.password) {
        data.username = form.username;
        data.password = form.password;
      }

      await residentAPI.create(data);
      if (flash) flash('✅ Tạo cư dân thành công!');
      setModalOpen(false);
      resetForm();
      fetchResidents();
    } catch (error) {
      console.error('Create error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tạo cư dân'));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const data = {
        fullName: form.fullName,
        gender: form.gender,
        birthDate: form.birthDate || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        identityNumber: form.identityNumber || null,
        issueDate: form.issueDate || null,
        issuePlace: form.issuePlace || null,
        expiredDate: form.expiredDate || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
      };

      await residentAPI.update(selectedResident.ResidentID, data);
      if (flash) flash('✅ Cập nhật cư dân thành công!');
      setModalOpen(false);
      resetForm();
      fetchResidents();
    } catch (error) {
      console.error('Update error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể cập nhật cư dân'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa cư dân này?')) return;
    try {
      await residentAPI.delete(id);
      if (flash) flash('✅ Xóa cư dân thành công!');
      fetchResidents();
    } catch (error) {
      console.error('Delete error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa cư dân'));
    }
  };

  const resetForm = () => {
    setForm({
      fullName: '',
      gender: 1,
      birthDate: '',
      phone: '',
      email: '',
      address: '',
      identityNumber: '',
      issueDate: '',
      issuePlace: '',
      expiredDate: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      username: '',
      password: '',
      apartmentId: '',
      relationship: 'Chủ hộ'
    });
    setSelectedResident(null);
  };

  const openViewModal = (resident) => {
    setSelectedResident(resident);
    setModalMode('view');
    setModalOpen(true);
  };

  const openEditModal = (resident) => {
    setSelectedResident(resident);
    setForm({
      fullName: resident.FullName || '',
      gender: resident.Gender || 1,
      birthDate: resident.BirthDate ? new Date(resident.BirthDate).toISOString().split('T')[0] : '',
      phone: resident.Phone || '',
      email: resident.Email || '',
      address: resident.Address || '',
      identityNumber: resident.IdentityNumber || '',
      issueDate: resident.IssueDate ? new Date(resident.IssueDate).toISOString().split('T')[0] : '',
      issuePlace: resident.IssuePlace || '',
      expiredDate: resident.ExpiredDate ? new Date(resident.ExpiredDate).toISOString().split('T')[0] : '',
      emergencyContactName: resident.EmergencyContactName || '',
      emergencyContactPhone: resident.EmergencyContactPhone || '',
      username: '',
      password: '',
      apartmentId: resident.ApartmentID || '',
      relationship: 'Chủ hộ'
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
  };

  // Filtered data
  const filteredResidents = useMemo(() => {
    let filtered = residents;
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.FullName?.toLowerCase().includes(q) ||
        r.Phone?.includes(q) ||
        r.Email?.toLowerCase().includes(q) ||
        r.IdentityNumber?.includes(q) ||
        r.ApartmentCode?.toLowerCase().includes(q)
      );
    }

    if (birthdayFilter) {
      filtered = filtered.filter(r => {
        if (!r.BirthDate) return false;
        const date = new Date(r.BirthDate);
        const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return monthDay === birthdayFilter;
      });
    }

    return filtered;
  }, [residents, search, birthdayFilter]);

  // Stats - 🔥 SỬA: Dùng helper function để kiểm tra status
  const stats = {
    total: residents.length,
    active: residents.filter(r => {
      const statusInfo = getStatusInfo(r);
      return statusInfo.text === 'Đang ở';
    }).length,
    todayBirthday: residents.filter(r => {
      if (!r.BirthDate) return false;
      const today = new Date();
      const date = new Date(r.BirthDate);
      return date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
    }).length
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý cư dân</h3>
            <p className="text-sm text-slate-500">
              Quản lý hồ sơ cư dân, CCCD, thông tin liên hệ và căn hộ đang ở.
              <span className="ml-2 text-[#1f4f46] font-semibold">{stats.active} đang ở</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm cư dân..."
              className="w-48"
            />
            <Input
              icon={Calendar}
              value={birthdayFilter}
              onChange={(e) => setBirthdayFilter(e.target.value)}
              placeholder="MM-DD"
              className="w-32"
            />
            <Button onClick={openCreateModal}>
              <Plus size={16} /> Thêm cư dân
            </Button>
            <Button variant="secondary" onClick={fetchResidents} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="Tổng cư dân" value={stats.total} hint="Hồ sơ đang quản lý" />
        <StatCard icon={CheckCircle2} label="Đang ở" value={stats.active} hint="Cư dân đang cư trú" />
        <StatCard icon={Calendar} label="Sinh nhật hôm nay" value={stats.todayBirthday} hint="Chúc mừng sinh nhật" />
        <StatCard icon={Building2} label="Căn hộ" value={apartments.length} hint="Đang quản lý" />
      </div>

      {/* Resident List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách cư dân...</p>
        </Card>
      ) : filteredResidents.length === 0 ? (
        <Card className="p-8 text-center">
          <Users size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có cư dân</h3>
          <p className="text-sm text-slate-500">Nhấn "Thêm cư dân" để tạo mới</p>
          <Button className="mt-4" onClick={openCreateModal}>
            <Plus size={16} /> Thêm cư dân
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredResidents.map((resident) => {
            // 🔥 SỬA: Dùng helper function
            const statusInfo = getStatusInfo(resident);
            return (
              <Card key={resident.ResidentID || resident.id} className="group hover:border-[#1f4f46]/30 transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef5f2] text-[#1f4f46] font-bold text-lg">
                        {getInitials(resident.FullName)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                          {resident.FullName}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {resident.ApartmentCode || 'Chưa có căn hộ'}
                        </p>
                      </div>
                    </div>
                    {/* 🔥 SỬA: Dùng statusInfo từ helper */}
                    <Badge tone={statusInfo.tone}>
                      {statusInfo.text}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={14} />
                      <span>{resident.Phone || 'Chưa có'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail size={14} />
                      <span>{resident.Email || 'Chưa có'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Shield size={14} />
                      <span>{resident.IdentityNumber || 'Chưa có CCCD'}</span>
                    </div>
                    {resident.BirthDate && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={14} />
                        <span>{formatDate(resident.BirthDate)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => openViewModal(resident)}>
                      <Eye size={14} /> Xem
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => openEditModal(resident)}>
                      <Edit size={14} /> Sửa
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={() => handleDelete(resident.ResidentID)}>
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
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              page === 1
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            «
          </button>
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
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              page === totalPages
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            »
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={modalMode === 'view' ? 'Chi tiết cư dân' : modalMode === 'create' ? 'Thêm cư dân mới' : 'Cập nhật cư dân'}
        description={modalMode === 'view' ? 'Xem thông tin chi tiết cư dân' : 'Nhập thông tin cư dân'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {modalMode === 'view' && selectedResident ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef5f2] text-[#1f4f46] text-2xl font-bold">
                {getInitials(selectedResident.FullName)}
              </div>
              <div>
                <h3 className="text-xl font-bold">{selectedResident.FullName}</h3>
                <div className="flex items-center gap-2">
                  {/* 🔥 SỬA: Dùng helper function cho modal */}
                  <Badge tone={getStatusInfo(selectedResident).tone}>
                    {getStatusInfo(selectedResident).text}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    Căn hộ {selectedResident.ApartmentCode || 'Chưa có'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin cá nhân</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Họ tên:</span> {selectedResident.FullName}</div>
                  <div><span className="text-slate-500">Giới tính:</span> {selectedResident.Gender ? 'Nam' : 'Nữ'}</div>
                  <div><span className="text-slate-500">Ngày sinh:</span> {formatDate(selectedResident.BirthDate)}</div>
                  <div><span className="text-slate-500">SĐT:</span> {selectedResident.Phone || 'Chưa có'}</div>
                  <div><span className="text-slate-500">Email:</span> {selectedResident.Email || 'Chưa có'}</div>
                  <div><span className="text-slate-500">Địa chỉ:</span> {selectedResident.Address || 'Chưa có'}</div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">CCCD/Hồ sơ</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Số CCCD:</span> {selectedResident.IdentityNumber || 'Chưa có'}</div>
                  <div><span className="text-slate-500">Nơi cấp:</span> {selectedResident.IssuePlace || 'Chưa có'}</div>
                  <div><span className="text-slate-500">Ngày cấp:</span> {formatDate(selectedResident.IssueDate)}</div>
                  <div><span className="text-slate-500">Ngày hết hạn:</span> {formatDate(selectedResident.ExpiredDate)}</div>
                </div>
              </div>
            </div>

            {selectedResident.Contracts && selectedResident.Contracts.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-500">Hợp đồng</p>
                <div className="mt-2 space-y-2">
                  {selectedResident.Contracts.map((contract, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold">{contract.ContractNumber}</span>
                        <Badge tone={contract.ContractStatus === 'Hiệu lực' ? 'green' : 'red'}>
                          {contract.ContractStatus}
                        </Badge>
                      </div>
                      <div className="mt-1 text-slate-500">
                        {contract.BuildingName} - {contract.ApartmentCode} - Tầng {contract.FloorNumber}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDate(contract.StartDate)} → {formatDate(contract.EndDate)}
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
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Họ tên *</label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({...form, fullName: e.target.value})}
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Giới tính</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({...form, gender: parseInt(e.target.value)})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                >
                  <option value={1}>Nam</option>
                  <option value={0}>Nữ</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày sinh</label>
                <Input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({...form, birthDate: e.target.value})}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Số điện thoại</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                  placeholder="0900000000"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Địa chỉ</label>
              <Input
                value={form.address}
                onChange={(e) => setForm({...form, address: e.target.value})}
                placeholder="Số nhà, đường, quận/huyện..."
              />
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Thông tin CCCD</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-500">Số CCCD</label>
                  <Input
                    value={form.identityNumber}
                    onChange={(e) => setForm({...form, identityNumber: e.target.value})}
                    placeholder="012345678901"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-500">Nơi cấp</label>
                  <Input
                    value={form.issuePlace}
                    onChange={(e) => setForm({...form, issuePlace: e.target.value})}
                    placeholder="Cục CS QLHC về TTXH"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-500">Ngày cấp</label>
                  <Input
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => setForm({...form, issueDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-500">Ngày hết hạn</label>
                  <Input
                    type="date"
                    value={form.expiredDate}
                    onChange={(e) => setForm({...form, expiredDate: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Người liên hệ khẩn cấp</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-500">Họ tên</label>
                  <Input
                    value={form.emergencyContactName}
                    onChange={(e) => setForm({...form, emergencyContactName: e.target.value})}
                    placeholder="Người thân"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-500">Số điện thoại</label>
                  <Input
                    value={form.emergencyContactPhone}
                    onChange={(e) => setForm({...form, emergencyContactPhone: e.target.value})}
                    placeholder="0912000000"
                  />
                </div>
              </div>
            </div>

            {modalMode === 'create' && (
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Tài khoản đăng nhập (tùy chọn)</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-500">Tên đăng nhập</label>
                    <Input
                      value={form.username}
                      onChange={(e) => setForm({...form, username: e.target.value})}
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-500">Mật khẩu</label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({...form, password: e.target.value})}
                      placeholder="Mật khẩu"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit">
                {modalMode === 'create' ? 'Thêm cư dân' : 'Cập nhật'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}