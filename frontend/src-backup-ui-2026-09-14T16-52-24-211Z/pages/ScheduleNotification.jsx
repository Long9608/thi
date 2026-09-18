// src/pages/ScheduleNotification.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, Plus, Search, Edit, Trash2, Eye,
  RefreshCw, CheckCircle2, X, AlertCircle,
  Send, Users, Building2, User, Bell,
  Mail, MessageSquare, FileText, Timer,
  Play, Pause, StopCircle
} from 'lucide-react';
import { notificationAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, formatDateTime, getInitials, timeAgo } from '../utils/formatters';

export default function ScheduleNotification({ flash }) {
  // State
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [form, setForm] = useState({
    title: '',
    content: '',
    targetScope: 'ALL',
    scheduledDate: '',
    endDate: '',
    timezone: 'Asia/Ho_Chi_Minh',
    status: 'pending'
  });

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const res = await notificationAPI.getAll('', 1, 999);
        const data = res?.data || res || [];
        const normalized = Array.isArray(data) ? data.map(item => ({
          id: item.NotificationID,
          title: item.Title,
          content: item.Content,
          targetScope: item.TargetScope,
          scheduledDate: item.CreatedDate,
          endDate: item.CreatedDate,
          timezone: 'Asia/Ho_Chi_Minh',
          status: 'sent',
          recipientsCount: item.RecipientsCount || 0,
          sentCount: item.RecipientsCount || 0
        })) : [];
        setSchedules(normalized);
      } catch (error) {
        console.error('Error fetching notification schedules:', error);
        if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải lịch gửi thông báo'));
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [flash]);

  const filteredData = useMemo(() => {
    let filtered = schedules;
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    return filtered;
  }, [schedules, search, statusFilter]);

  const stats = useMemo(() => {
    const total = schedules.length;
    const pending = schedules.filter(s => s.status === 'pending').length;
    const sent = schedules.filter(s => s.status === 'sent').length;
    const cancelled = schedules.filter(s => s.status === 'cancelled').length;
    return { total, pending, sent, cancelled };
  }, [schedules]);

  const getStatusBadge = (status) => {
    const map = {
      'pending': { tone: 'amber', label: 'Chờ gửi' },
      'sent': { tone: 'green', label: 'Đã gửi' },
      'cancelled': { tone: 'red', label: 'Đã hủy' }
    };
    const info = map[status] || { tone: 'slate', label: status };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  const getScopeBadge = (scope) => {
    const map = {
      'ALL': { tone: 'purple', label: 'Tất cả' },
      'BUILDING': { tone: 'blue', label: 'Tòa nhà' },
      'USER': { tone: 'green', label: 'Cá nhân' }
    };
    const info = map[scope] || { tone: 'slate', label: scope || 'Tất cả' };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  const handleSendNow = (id) => {
    const updated = schedules.map(s => 
      s.id === id ? { ...s, status: 'sent', sentCount: s.recipientsCount } : s
    );
    setSchedules(updated);
    flash('✅ Đã gửi thông báo!');
  };

  const handleCancel = (id) => {
    if (!confirm('Bạn có chắc muốn hủy lịch gửi này?')) return;
    const updated = schedules.map(s => 
      s.id === id ? { ...s, status: 'cancelled' } : s
    );
    setSchedules(updated);
    flash('✅ Đã hủy lịch gửi');
  };

  const handleDelete = (id) => {
    if (!confirm('Bạn có chắc muốn xóa lịch gửi này?')) return;
    setSchedules(schedules.filter(s => s.id !== id));
    flash('✅ Đã xóa lịch gửi');
  };

  const openViewModal = (schedule) => {
    setSelectedSchedule(schedule);
    setModalMode('view');
    setModalOpen(true);
  };

  const openCreateModal = () => {
    setForm({
      title: '',
      content: '',
      targetScope: 'ALL',
      scheduledDate: '',
      endDate: '',
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'pending'
    });
    setModalMode('create');
    setModalOpen(true);
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content || !form.scheduledDate) {
      flash('⚠️ Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: form.title,
        content: form.content,
        targetScope: form.targetScope,
        targetUserIds: form.targetScope === 'USER' ? form.targetUserIds || [] : undefined,
        targetBuildingIds: form.targetScope === 'BUILDING' ? form.targetBuildingIds || [] : undefined
      };
      const res = await notificationAPI.create(payload);
      const newSchedule = {
        id: res?.data?.notificationId || Date.now(),
        title: form.title,
        content: form.content,
        targetScope: form.targetScope,
        scheduledDate: new Date().toISOString(),
        endDate: form.endDate || form.scheduledDate,
        timezone: form.timezone,
        status: 'sent',
        recipientsCount: res?.data?.recipientsCount || 0,
        sentCount: res?.data?.recipientsCount || 0
      };
      setSchedules([newSchedule, ...schedules]);
      setModalOpen(false);
      flash('✅ Đã tạo lịch gửi thông báo!');
    } catch (error) {
      console.error('Create schedule error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tạo lịch gửi'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Lịch gửi thông báo</h3>
            <p className="text-sm text-slate-500">
              Quản lý lịch gửi thông báo.
              <span className="ml-2 text-amber-600 font-semibold">
                {stats.pending} lịch chờ gửi
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm lịch gửi..."
              className="w-48"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ gửi</option>
              <option value="sent">Đã gửi</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <Button onClick={openCreateModal}>
              <Plus size={16} /> Tạo lịch gửi
            </Button>
            <Button variant="secondary">
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Calendar} label="Tổng lịch" value={stats.total} hint="Đã tạo" />
        <StatCard icon={Clock} label="Chờ gửi" value={stats.pending} hint="Chưa gửi" />
        <StatCard icon={Send} label="Đã gửi" value={stats.sent} hint="Đã gửi" />
        <StatCard icon={X} label="Đã hủy" value={stats.cancelled} hint="Đã hủy" />
      </div>

      {/* Schedule List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách...</p>
        </Card>
      ) : filteredData.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có lịch gửi</h3>
          <p className="text-sm text-slate-500">Tạo lịch gửi thông báo để bắt đầu</p>
          <Button className="mt-4" onClick={openCreateModal}>
            <Plus size={16} /> Tạo lịch gửi
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredData.map((schedule) => (
            <Card key={schedule.id} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(schedule.status)}
                      {getScopeBadge(schedule.targetScope)}
                    </div>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                      {schedule.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {schedule.content}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Thời gian gửi</span>
                    <span className="text-slate-700">{formatDateTime(schedule.scheduledDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Số người nhận</span>
                    <span className="font-medium text-slate-950">{schedule.recipientsCount} người</span>
                  </div>
                  {schedule.status === 'sent' && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Đã gửi</span>
                      <span className="font-medium text-emerald-600">{schedule.sentCount}/{schedule.recipientsCount}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Múi giờ</span>
                    <span className="text-slate-700">{schedule.timezone}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openViewModal(schedule)}>
                    <Eye size={14} /> Xem
                  </Button>
                  {schedule.status === 'pending' && (
                    <>
                      <Button className="flex-1" onClick={() => handleSendNow(schedule.id)}>
                        <Send size={14} /> Gửi ngay
                      </Button>
                      <Button variant="warning" className="flex-1" onClick={() => handleCancel(schedule.id)}>
                        <X size={14} /> Hủy
                      </Button>
                    </>
                  )}
                  {(schedule.status === 'sent' || schedule.status === 'cancelled') && (
                    <Button variant="danger" className="flex-1" onClick={() => handleDelete(schedule.id)}>
                      <Trash2 size={14} /> Xóa
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        title={modalMode === 'create' ? 'Tạo lịch gửi thông báo' : 'Chi tiết lịch gửi'}
        description={modalMode === 'create' ? 'Lên lịch gửi thông báo' : 'Xem chi tiết lịch gửi'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {modalMode === 'view' && selectedSchedule ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(selectedSchedule.status)}
                  {getScopeBadge(selectedSchedule.targetScope)}
                </div>
                <h3 className="text-2xl font-black text-slate-950">{selectedSchedule.title}</h3>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-500">Nội dung</p>
              <p className="mt-2 text-sm text-slate-700">{selectedSchedule.content}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thời gian</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Gửi lúc:</span> {formatDateTime(selectedSchedule.scheduledDate)}</div>
                  <div><span className="text-slate-500">Kết thúc:</span> {formatDateTime(selectedSchedule.endDate)}</div>
                  <div><span className="text-slate-500">Múi giờ:</span> {selectedSchedule.timezone}</div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thống kê</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Đối tượng:</span> {
                    selectedSchedule.targetScope === 'ALL' ? 'Tất cả cư dân' :
                    selectedSchedule.targetScope === 'BUILDING' ? 'Theo tòa nhà' :
                    'Cá nhân'
                  }</div>
                  <div><span className="text-slate-500">Số người nhận:</span> {selectedSchedule.recipientsCount}</div>
                  {selectedSchedule.status === 'sent' && (
                    <div><span className="text-slate-500">Đã gửi:</span> {selectedSchedule.sentCount} người</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateSchedule} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Tiêu đề *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nhập tiêu đề..."
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Nội dung *</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#1f4f46] min-h-[100px]"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Nhập nội dung thông báo..."
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Đối tượng</label>
              <select
                value={form.targetScope}
                onChange={(e) => setForm({ ...form, targetScope: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
              >
                <option value="ALL">Tất cả cư dân</option>
                <option value="BUILDING">Theo tòa nhà</option>
                <option value="USER">Cá nhân</option>
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Thời gian gửi *</label>
                <Input
                  type="datetime-local"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Thời gian kết thúc</label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Múi giờ</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
              >
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
                <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit">
                <Calendar size={16} /> Tạo lịch gửi
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}