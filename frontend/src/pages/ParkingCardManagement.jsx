// src/pages/ParkingCardManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Plus, Search, Download, Edit, Trash2, Eye,
  RefreshCw, CheckCircle2, X, AlertCircle,
  User, Car, Calendar, MapPin, Printer,
  Clock, Shield, Key, Lock
} from 'lucide-react';
import { vehicleAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money, getInitials } from '../utils/formatters';

export default function ParkingCardManagement({ flash }) {
  const [cards, setCards] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [form, setForm] = useState({
    vehicleId: '',
    cardCode: '',
    slotId: '',
    issueDate: new Date().toISOString().split('T')[0],
    expiredDate: '',
    status: 1
  });

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await vehicleAPI.getAll('', '', '', page, 20);
      const data = res?.data || res || [];
      // Chỉ lấy xe có thẻ
      const withCards = Array.isArray(data) ? data.filter(v => v.CardID) : [];
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
      // Chỉ lấy xe chưa có thẻ
      const noCard = Array.isArray(data) ? data.filter(v => !v.CardID) : [];
      setVehicles(noCard);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  }, []);

  useEffect(() => {
    fetchCards();
    fetchVehicles();
  }, [fetchCards, fetchVehicles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Gọi API cấp thẻ
      await vehicleAPI.update(form.vehicleId, {
        slotId: form.slotId,
        cardExpiryDate: form.expiredDate
      });
      
      if (flash) flash('✅ Cấp thẻ xe thành công!');
      setModalOpen(false);
      resetForm();
      fetchCards();
      fetchVehicles();
    } catch (error) {
      console.error('Submit error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Có lỗi xảy ra'));
    } finally {
      setLoading(false);
    }
  };

  const handleLockCard = async (id) => {
    if (!confirm('Bạn có chắc muốn khóa thẻ này?')) return;
    try {
      await vehicleAPI.update(id, { status: 0 });
      if (flash) flash('✅ Khóa thẻ thành công!');
      fetchCards();
    } catch (error) {
      console.error('Lock error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể khóa thẻ'));
    }
  };

  const handleUnlockCard = async (id) => {
    try {
      await vehicleAPI.update(id, { status: 1 });
      if (flash) flash('✅ Mở khóa thẻ thành công!');
      fetchCards();
    } catch (error) {
      console.error('Unlock error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể mở khóa thẻ'));
    }
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

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
  };

  const openViewModal = (card) => {
    setSelectedCard(card);
    setModalMode('view');
    setModalOpen(true);
  };

  const generateCardCode = () => {
    const prefix = 'CARD';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
  };

  // Filtered data
  const filteredCards = useMemo(() => {
    const q = search.toLowerCase();
    return cards.filter(c => {
      const cardCode = (c.CardCode || '').toLowerCase();
      const plate = (c.PlateNumber || '').toLowerCase();
      const owner = (c.OwnerName || '').toLowerCase();
      return cardCode.includes(q) || plate.includes(q) || owner.includes(q);
    });
  }, [cards, search]);

  // Stats
  const stats = useMemo(() => {
    const total = cards.length;
    const active = cards.filter(c => c.IsActiveCard === 1).length;
    const expired = cards.filter(c => c.IsActiveCard === 0 && c.CardID).length;
    return { total, active, expired };
  }, [cards]);

  const getStatusBadge = (card) => {
    if (!card.CardID) return <Badge tone="slate">Chưa có thẻ</Badge>;
    if (card.IsActiveCard) return <Badge tone="green">Còn hiệu lực</Badge>;
    return <Badge tone="red">Hết hạn</Badge>;
  };

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
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={CreditCard} label="Tổng thẻ" value={stats.total} hint="Đã cấp" />
        <StatCard icon={CheckCircle2} label="Còn hiệu lực" value={stats.active} hint="Đang sử dụng" />
        <StatCard icon={Clock} label="Hết hạn" value={stats.expired} hint="Cần gia hạn" />
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
          {filteredCards.map((card) => (
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
                  {getStatusBadge(card)}
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
                      card.IsActiveCard ? 'text-emerald-600' : 'text-rose-600'
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
                  {card.IsActiveCard ? (
                    <Button variant="danger" className="flex-1" onClick={() => handleLockCard(card.VehicleID)}>
                      <Lock size={14} /> Khóa thẻ
                    </Button>
                  ) : (
                    <Button variant="success" className="flex-1" onClick={() => handleUnlockCard(card.VehicleID)}>
                      <Key size={14} /> Mở khóa
                    </Button>
                  )}
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

      {/* Modal - Create Card */}
      <Modal
        open={modalOpen}
        title="Cấp thẻ xe mới"
        description="Cấp thẻ xe cho cư dân"
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Chọn xe *</label>
            <select
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
              required
            >
              <option value="">Chọn xe</option>
              {vehicles.map(v => (
                <option key={v.VehicleID} value={v.VehicleID}>
                  {v.PlateNumber} - {v.OwnerName} ({v.VehicleType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Mã thẻ</label>
            <Input
              value={form.cardCode || generateCardCode()}
              onChange={(e) => setForm({ ...form, cardCode: e.target.value })}
              placeholder="CARD-XXXXXX"
              onFocus={() => {
                if (!form.cardCode) {
                  setForm({ ...form, cardCode: generateCardCode() });
                }
              }}
            />
            <p className="mt-1 text-xs text-slate-500">Tự động tạo nếu để trống</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày cấp</label>
              <Input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
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
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <CreditCard size={16} />}
              Cấp thẻ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}