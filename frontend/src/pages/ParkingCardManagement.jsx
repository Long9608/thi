// src/pages/ParkingCardManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Plus, Search, Edit, Trash2, Eye,
  RefreshCw, CheckCircle2, X, AlertCircle,
  User, Car, Calendar, MapPin, Printer,
  Clock, Shield, Key, Lock, Save
} from 'lucide-react';
import { vehicleAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money, getInitials } from '../utils/formatters';

export default function ParkingCardManagement({ flash }) {
  const [cards, setCards] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [parkingSlots, setParkingSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [form, setForm] = useState({
    vehicleId: '',
    cardCode: '',
    slotId: '',
    issueDate: new Date().toISOString().split('T')[0],
    expiredDate: '',
    status: 1
  });

  // ============================================
  // 🔥 HÀM KIỂM TRA TRẠNG THÁI THẺ
  // ============================================
  const getCardStatus = useCallback((card) => {
    if (!card || !card.CardID) {
      return { label: 'Chưa có thẻ', tone: 'slate' };
    }

    // 1. Kiểm tra thẻ bị khóa
    if (card.CardStatus === 0) {
      return { label: 'Đã khóa', tone: 'red' };
    }

    // 2. Kiểm tra ngày hết hạn
    const now = new Date();
    const expiredDate = new Date(card.CardExpiredDate);
    
    if (isNaN(expiredDate.getTime())) {
      return { label: 'Không xác định', tone: 'slate' };
    }

    if (expiredDate < now) {
      return { label: 'Hết hạn', tone: 'red' };
    }

    // 3. Kiểm tra sắp hết hạn (dưới 30 ngày)
    const daysRemaining = Math.ceil((expiredDate - now) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 30) {
      return { label: `Sắp hết hạn (${daysRemaining} ngày)`, tone: 'amber' };
    }

    return { label: 'Còn hiệu lực', tone: 'green' };
  }, []);

  // ============================================
  // 🔥 BADGE HIỂN THỊ
  // ============================================
  const getStatusBadge = useCallback((card) => {
    const status = getCardStatus(card);
    return <Badge tone={status.tone}>{status.label}</Badge>;
  }, [getCardStatus]);

  // ============================================
  // 🔥 THỐNG KÊ CHÍNH XÁC
  // ============================================
  const stats = useMemo(() => {
    const total = cards.length;
    let active = 0;
    let expired = 0;
    let locked = 0;

    cards.forEach(card => {
      if (!card.CardID) return;
      
      // Kiểm tra khóa
      if (card.CardStatus === 0) {
        locked++;
        return;
      }
      
      // Kiểm tra hết hạn
      const now = new Date();
      const expiredDate = new Date(card.CardExpiredDate);
      if (isNaN(expiredDate.getTime()) || expiredDate < now) {
        expired++;
      } else {
        active++;
      }
    });

    return { total, active, expired, locked };
  }, [cards]);

  // ============================================
  // 🔥 FETCH DATA
  // ============================================
  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await vehicleAPI.getAll('', '', '', page, 20);
      const data = res?.data || res || [];
      const allVehicles = Array.isArray(data) ? data : [];
      const withCards = allVehicles.filter(v => v.CardID);
      setCards(withCards);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching cards:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách thẻ'));
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [page, flash]);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await vehicleAPI.getAll('', '', '', 1, 999);
      const data = res?.data || res || [];
      const allVehicles = Array.isArray(data) ? data : [];
      const noCard = allVehicles.filter(v => !v.CardID);
      setVehicles(noCard);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    }
  }, []);

  const fetchParkingSlots = useCallback(async () => {
    try {
      const res = await vehicleAPI.getParkingSlots('', '', '0');
      let slotsData = [];
      if (res) {
        if (Array.isArray(res)) {
          slotsData = res;
        } else if (res.data && Array.isArray(res.data)) {
          slotsData = res.data;
        } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
          slotsData = res.data.data;
        } else if (res.recordset && Array.isArray(res.recordset)) {
          slotsData = res.recordset;
        }
      }
      setParkingSlots(slotsData);
    } catch (error) {
      console.error('❌ Error fetching parking slots:', error);
      setParkingSlots([]);
    }
  }, []);

  useEffect(() => {
    fetchCards();
    fetchVehicles();
    fetchParkingSlots();
  }, [fetchCards, fetchVehicles, fetchParkingSlots]);

  // ============================================
  // 🔥 CRUD OPERATIONS
  // ============================================
  const handleCreateCard = async (e) => {
    e.preventDefault();
    
    if (!form.vehicleId) {
      flash('⚠️ Vui lòng chọn xe');
      return;
    }
    if (!form.expiredDate) {
      flash('⚠️ Vui lòng chọn ngày hết hạn');
      return;
    }

    setLoading(true);
    try {
      let cardCode = form.cardCode;
      if (!cardCode) {
        const prefix = 'CARD';
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        cardCode = `${prefix}-${random}`;
      }

      const payload = {
        cardCode: cardCode,
        slotId: form.slotId || null,
        issueDate: form.issueDate,
        expiredDate: form.expiredDate,
        status: 1
      };
      
      await vehicleAPI.createParkingCard(form.vehicleId, payload);
      
      if (flash) flash('✅ Cấp thẻ xe thành công!');
      setModalOpen(false);
      resetForm();
      fetchCards();
      fetchVehicles();
      fetchParkingSlots();
    } catch (error) {
      console.error('❌ Submit error:', error);
      const errMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi cấp thẻ';
      if (flash) flash('❌ ' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCard = async (e) => {
    e.preventDefault();
    
    if (!selectedCard) {
      flash('⚠️ Không tìm thấy thẻ cần sửa');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        slotId: form.slotId || null,
        expiredDate: form.expiredDate,
        status: parseInt(form.status)
      };
      
      await vehicleAPI.updateParkingCard(selectedCard.CardID, payload);
      
      if (flash) flash('✅ Cập nhật thẻ xe thành công!');
      setModalOpen(false);
      resetForm();
      fetchCards();
      fetchParkingSlots();
    } catch (error) {
      console.error('❌ Update error:', error);
      const errMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi cập nhật thẻ';
      if (flash) flash('❌ ' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Bạn có chắc muốn xóa thẻ xe này? Hành động này không thể hoàn tác.')) return;
    
    setLoading(true);
    try {
      await vehicleAPI.deleteParkingCard(cardId);
      if (flash) flash('✅ Xóa thẻ xe thành công!');
      fetchCards();
      fetchParkingSlots();
    } catch (error) {
      console.error('❌ Delete error:', error);
      const errMsg = error.response?.data?.message || error.message || 'Không thể xóa thẻ';
      if (flash) flash('❌ ' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCardStatus = async (card) => {
    const newStatus = card.CardStatus === 1 ? 0 : 1;
    const action = newStatus === 1 ? 'Mở khóa' : 'Khóa';
    
    if (!confirm(`Bạn có chắc muốn ${action} thẻ ${card.CardCode}?`)) return;
    
    setLoading(true);
    try {
      await vehicleAPI.updateParkingCard(card.CardID, { status: newStatus });
      if (flash) flash(`✅ ${action} thẻ thành công!`);
      fetchCards();
    } catch (error) {
      console.error('❌ Toggle status error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể cập nhật trạng thái thẻ'));
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 🔥 MODAL CONTROL
  // ============================================
  const openViewModal = (card) => {
    setSelectedCard(card);
    setModalMode('view');
    setModalOpen(true);
  };

  const openEditModal = (card) => {
    setSelectedCard(card);
    setForm({
      vehicleId: card.VehicleID || '',
      cardCode: card.CardCode || '',
      slotId: card.SlotID || '',
      issueDate: card.CardIssueDate ? card.CardIssueDate.split('T')[0] : new Date().toISOString().split('T')[0],
      expiredDate: card.CardExpiredDate ? card.CardExpiredDate.split('T')[0] : '',
      status: card.CardStatus || 1
    });
    setModalMode('edit');
    setModalOpen(true);
    fetchParkingSlots();
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
    fetchParkingSlots();
    fetchVehicles();
  };

  const resetForm = () => {
    setForm({
      vehicleId: '',
      cardCode: '',
      slotId: '',
      issueDate: new Date().toISOString().split('T')[0],
      expiredDate: '',
      status: 1
    });
    setSelectedCard(null);
  };

  // ============================================
  // 🔧 UTILITY
  // ============================================
  const generateCardCode = () => {
    const prefix = 'CARD';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
  };

  const filteredCards = useMemo(() => {
    const q = search.toLowerCase();
    return cards.filter(c => {
      const cardCode = (c.CardCode || '').toLowerCase();
      const plate = (c.PlateNumber || '').toLowerCase();
      const owner = (c.OwnerName || '').toLowerCase();
      return cardCode.includes(q) || plate.includes(q) || owner.includes(q);
    });
  }, [cards, search]);

  // ============================================
  // 🎨 RENDER
  // ============================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý thẻ xe</h3>
            <p className="text-sm text-slate-500">
              Quản lý thẻ xe của cư dân.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {stats.active} thẻ đang hoạt động
              </span>
              {stats.expired > 0 && (
                <span className="ml-2 text-rose-600 font-semibold">
                  {stats.expired} thẻ hết hạn
                </span>
              )}
              {stats.locked > 0 && (
                <span className="ml-2 text-amber-600 font-semibold">
                  {stats.locked} thẻ bị khóa
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã thẻ, biển số..."
              className="w-48"
            />
            <Button onClick={openCreateModal}>
              <Plus size={16} /> Cấp thẻ mới
            </Button>
            <Button variant="secondary" onClick={fetchCards} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={CreditCard} label="Tổng thẻ" value={stats.total} hint="Đã cấp" />
        <StatCard icon={CheckCircle2} label="Còn hiệu lực" value={stats.active} hint="Đang sử dụng" />
        <StatCard icon={Clock} label="Hết hạn" value={stats.expired} hint="Cần gia hạn" />
        <StatCard icon={Lock} label="Đã khóa" value={stats.locked} hint="Bị khóa" />
      </div>

      {/* Card List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách thẻ...</p>
        </Card>
      ) : filteredCards.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có thẻ xe</h3>
          <p className="text-sm text-slate-500">Nhấn "Cấp thẻ mới" để tạo</p>
          <Button className="mt-4" onClick={openCreateModal}>
            <Plus size={16} /> Cấp thẻ mới
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((card) => {
            const status = getCardStatus(card);
            return (
              <Card key={card.CardID} className="group hover:border-[#1f4f46]/30 transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-[#1f4f46]" />
                        <h3 className="text-lg font-bold text-slate-950 group-hover:text-[#1f4f46]">
                          {card.CardCode}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-500">{card.PlateNumber}</p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Chủ xe</span>
                      <span className="font-medium text-slate-950">{card.OwnerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ngày cấp</span>
                      <span className="text-slate-700">{formatDate(card.CardIssueDate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Hết hạn</span>
                      <span className={`font-semibold ${
                        status.tone === 'green' ? 'text-emerald-600' : 
                        status.tone === 'amber' ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {formatDate(card.CardExpiredDate)}
                      </span>
                    </div>
                    {card.SlotNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Vị trí đỗ</span>
                        <span className="font-medium text-slate-950 flex items-center gap-1">
                          <MapPin size={14} className="text-[#1f4f46]" />
                          {card.SlotNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => openViewModal(card)}>
                      <Eye size={14} /> Xem
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => openEditModal(card)}>
                      <Edit size={14} /> Sửa
                    </Button>
                    {card.CardStatus === 1 ? (
                      <Button variant="warning" className="flex-1" onClick={() => handleToggleCardStatus(card)}>
                        <Lock size={14} /> Khóa
                      </Button>
                    ) : (
                      <Button variant="success" className="flex-1" onClick={() => handleToggleCardStatus(card)}>
                        <Key size={14} /> Mở khóa
                      </Button>
                    )}
                  </div>
                  <div className="mt-2">
                    <Button variant="danger" className="w-full" onClick={() => handleDeleteCard(card.CardID)}>
                      <Trash2 size={14} /> Xóa thẻ
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

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

      {/* ============================================ */}
      {/* 🔥 MODAL - XEM CHI TIẾT */}
      {/* ============================================ */}
      <Modal
        open={modalOpen && modalMode === 'view'}
        title="Chi tiết thẻ xe"
        description="Xem thông tin chi tiết thẻ xe"
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {selectedCard && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Shield size={20} className="text-[#1f4f46]" />
                  <h3 className="text-2xl font-black text-slate-950">{selectedCard.CardCode}</h3>
                </div>
                <p className="text-sm text-slate-500">{selectedCard.PlateNumber}</p>
              </div>
              {getStatusBadge(selectedCard)}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thông tin thẻ</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Mã thẻ:</span> <span className="font-bold">{selectedCard.CardCode}</span></div>
                  <div><span className="text-slate-500">Ngày cấp:</span> {formatDate(selectedCard.CardIssueDate)}</div>
                  <div><span className="text-slate-500">Hết hạn:</span> {formatDate(selectedCard.CardExpiredDate)}</div>
                  <div><span className="text-slate-500">Trạng thái:</span> {
                    selectedCard.CardStatus === 0 ? 'Đã khóa' :
                    new Date(selectedCard.CardExpiredDate) < new Date() ? 'Hết hạn' : 'Còn hiệu lực'
                  }</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thông tin xe</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Biển số:</span> {selectedCard.PlateNumber}</div>
                  <div><span className="text-slate-500">Chủ xe:</span> {selectedCard.OwnerName}</div>
                  <div><span className="text-slate-500">Loại xe:</span> {selectedCard.VehicleType}</div>
                  {selectedCard.SlotNumber && (
                    <div><span className="text-slate-500">Vị trí đỗ:</span> {selectedCard.SlotNumber}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
              <Button variant="secondary" onClick={() => {
                setModalMode('edit');
                setForm({
                  vehicleId: selectedCard.VehicleID || '',
                  cardCode: selectedCard.CardCode || '',
                  slotId: selectedCard.SlotID || '',
                  issueDate: selectedCard.CardIssueDate ? selectedCard.CardIssueDate.split('T')[0] : new Date().toISOString().split('T')[0],
                  expiredDate: selectedCard.CardExpiredDate ? selectedCard.CardExpiredDate.split('T')[0] : '',
                  status: selectedCard.CardStatus || 1
                });
                fetchParkingSlots();
              }}>
                <Edit size={16} /> Sửa thẻ
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================ */}
      {/* 🔥 MODAL - TẠO / SỬA THẺ XE */}
      {/* ============================================ */}
      <Modal
        open={modalOpen && (modalMode === 'create' || modalMode === 'edit')}
        title={modalMode === 'create' ? 'Cấp thẻ xe mới' : 'Chỉnh sửa thẻ xe'}
        description={modalMode === 'create' ? 'Cấp thẻ xe cho cư dân' : 'Cập nhật thông tin thẻ xe'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        <form onSubmit={modalMode === 'create' ? handleCreateCard : handleUpdateCard} className="space-y-4">
          {modalMode === 'create' && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Chọn xe *</label>
              <select
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                required
              >
                <option value="">Chọn xe</option>
                {vehicles.length === 0 ? (
                  <option value="" disabled>Không có xe chưa có thẻ</option>
                ) : (
                  vehicles.map(v => (
                    <option key={v.VehicleID} value={v.VehicleID}>
                      {v.PlateNumber} - {v.OwnerName} ({v.VehicleType})
                    </option>
                  ))
                )}
              </select>
              {vehicles.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠️ Tất cả xe đã có thẻ. Vui lòng đăng ký xe mới trước.
                </p>
              )}
            </div>
          )}

          {modalMode === 'edit' && selectedCard && (
            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã thẻ</span>
                <span className="font-bold text-slate-950">{selectedCard.CardCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Biển số</span>
                <span className="font-bold text-slate-950">{selectedCard.PlateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chủ xe</span>
                <span className="font-bold text-slate-950">{selectedCard.OwnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái hiện tại</span>
                <Badge tone={selectedCard.CardStatus === 1 ? 'green' : 'red'}>
                  {selectedCard.CardStatus === 1 ? 'Hoạt động' : 'Đã khóa'}
                </Badge>
              </div>
            </div>
          )}

          {modalMode === 'create' && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Mã thẻ</label>
              <div className="flex gap-2">
                <Input
                  value={form.cardCode || generateCardCode()}
                  onChange={(e) => setForm({ ...form, cardCode: e.target.value })}
                  placeholder="CARD-XXXXXX"
                  className="flex-1"
                  onFocus={() => {
                    if (!form.cardCode) {
                      setForm({ ...form, cardCode: generateCardCode() });
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setForm({ ...form, cardCode: generateCardCode() })}
                >
                  Tạo mới
                </Button>
              </div>
              <p className="mt-1 text-xs text-slate-500">Tự động tạo nếu để trống</p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày cấp</label>
              <Input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                disabled={modalMode === 'edit'}
                className={modalMode === 'edit' ? 'bg-slate-100' : ''}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày hết hạn *</label>
              <Input
                type="date"
                value={form.expiredDate}
                onChange={(e) => setForm({ ...form, expiredDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Vị trí đỗ</label>
            <select
              value={form.slotId}
              onChange={(e) => setForm({ ...form, slotId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Chọn vị trí</option>
              {parkingSlots.length === 0 ? (
                <option value="" disabled>Không có vị trí trống</option>
              ) : (
                parkingSlots.map(slot => (
                  <option key={slot.SlotID} value={slot.SlotID}>
                    {slot.SlotNumber} - {slot.AreaName} ({slot.VehicleType})
                  </option>
                ))
              )}
            </select>
            {parkingSlots.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                ⚠️ Không có vị trí đỗ trống. Vui lòng tạo vị trí trong "Bãi xe" trước.
              </p>
            )}
          </div>

          {modalMode === 'edit' && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: parseInt(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
              >
                <option value={1}>Hoạt động</option>
                <option value={0}>Khóa</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={loading || (modalMode === 'create' && vehicles.length === 0)}>
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {modalMode === 'create' ? 'Cấp thẻ' : 'Cập nhật'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}