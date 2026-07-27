// src/pages/TicketManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, Plus, Search, Download, Edit, Trash2, Eye,
  RefreshCw, CheckCircle2, X, AlertCircle,  
  User, Home, Calendar, Clock, Filter,
  MessageSquare, Phone, Mail, Tag, Flag, FileText,
  ArrowUp, ArrowDown, MoreHorizontal
} from 'lucide-react';
import { ticketAPI, residentAPI, apartmentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, formatDateTime, getInitials, timeAgo } from '../utils/formatters';

// ... phần còn lại giữ nguyên

export default function TicketManagement({ flash }) {
  // State
  const [tickets, setTickets] = useState([]);
  const [residents, setResidents] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    apartmentId: '',
    residentId: '',
    priority: 'Trung bình',
    statusId: 1,
    assignedEmployeeId: ''
  });

  // Fetch data
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ticketAPI.getAll(statusFilter, page, 20);
      console.log('📊 Tickets:', res);
      
      const data = res?.data || res || [];
      setTickets(Array.isArray(data) ? data : []);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách ticket'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, flash]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await ticketAPI.getStatuses();
      const data = res?.data || res || [];
      setStatuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  }, []);

  const fetchResidents = useCallback(async () => {
    try {
      const res = await residentAPI.getAll('', 1, 999);
      const data = res?.data || res || [];
      setResidents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching residents:', error);
    }
  }, []);

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
    fetchTickets();
    fetchStatuses();
    fetchResidents();
    fetchApartments();
  }, [fetchTickets, fetchStatuses, fetchResidents, fetchApartments]);

  // Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modalMode === 'create') {
        await ticketAPI.create(form);
        if (flash) flash('✅ Tạo ticket thành công!');
      } else {
        await ticketAPI.update(selectedTicket.RequestID, form);
        if (flash) flash('✅ Cập nhật ticket thành công!');
      }
      setModalOpen(false);
      resetForm();
      fetchTickets();
    } catch (error) {
      console.error('Submit error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Có lỗi xảy ra'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa ticket này?')) return;
    try {
      await ticketAPI.delete(id);
      if (flash) flash('✅ Xóa ticket thành công!');
      fetchTickets();
    } catch (error) {
      console.error('Delete error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa ticket'));
    }
  };

  const handleUpdateStatus = async (id, statusId) => {
    try {
      await ticketAPI.update(id, { statusId });
      if (flash) flash('✅ Cập nhật trạng thái thành công!');
      fetchTickets();
    } catch (error) {
      console.error('Update status error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể cập nhật trạng thái'));
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      apartmentId: '',
      residentId: '',
      priority: 'Trung bình',
      statusId: 1,
      assignedEmployeeId: ''
    });
    setSelectedTicket(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditModal = (ticket) => {
    setSelectedTicket(ticket);
    setForm({
      title: ticket.Title || '',
      description: ticket.Description || '',
      apartmentId: ticket.ApartmentID || '',
      residentId: ticket.ResidentID || '',
      priority: ticket.Priority || 'Trung bình',
      statusId: ticket.StatusID || 1,
      assignedEmployeeId: ticket.AssignedEmployeeID || ''
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const openViewModal = (ticket) => {
    setSelectedTicket(ticket);
    setModalMode('view');
    setModalOpen(true);
  };

  // Filtered data
  const filteredTickets = useMemo(() => {
    let filtered = tickets;
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t =>
        (t.Title || '').toLowerCase().includes(q) ||
        (t.ResidentName || '').toLowerCase().includes(q) ||
        (t.ApartmentCode || '').toLowerCase().includes(q)
      );
    }

    if (priorityFilter) {
      filtered = filtered.filter(t => t.Priority === priorityFilter);
    }

    return filtered;
  }, [tickets, search, priorityFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = tickets.length;
    const newTickets = tickets.filter(t => t.StatusID === 1).length;
    const processing = tickets.filter(t => t.StatusID === 2).length;
    const completed = tickets.filter(t => t.StatusID === 3).length;
    const cancelled = tickets.filter(t => t.StatusID === 4).length;
    return { total, newTickets, processing, completed, cancelled };
  }, [tickets]);

  const getStatusBadge = (statusId, statusName) => {
    const map = {
      1: { tone: 'blue', label: 'Mới' },
      2: { tone: 'amber', label: 'Đang xử lý' },
      3: { tone: 'green', label: 'Hoàn tất' },
      4: { tone: 'red', label: 'Đã hủy' }
    };
    const info = map[statusId] || { tone: 'slate', label: statusName || 'Chưa xác định' };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const map = {
      'Cao': { tone: 'red', label: 'Cao' },
      'Trung bình': { tone: 'amber', label: 'Trung bình' },
      'Thấp': { tone: 'blue', label: 'Thấp' }
    };
    const info = map[priority] || { tone: 'slate', label: priority || 'Trung bình' };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'Cao') return <Flag size={14} className="text-rose-600" />;
    if (priority === 'Trung bình') return <Flag size={14} className="text-amber-600" />;
    return <Flag size={14} className="text-blue-600" />;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Ticket hỗ trợ</h3>
            <p className="text-sm text-slate-500">
              Quản lý yêu cầu hỗ trợ từ cư dân.
              <span className="ml-2 text-amber-600 font-semibold">
                {stats.newTickets} yêu cầu mới
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm ticket..."
              className="w-48"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả trạng thái</option>
              {statuses.map(s => (
                <option key={s.StatusID} value={s.StatusID}>
                  {s.StatusName}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả ưu tiên</option>
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </select>
            <Button onClick={openCreateModal}>
              <Plus size={16} /> Tạo ticket
            </Button>
            <Button variant="secondary" onClick={fetchTickets} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={FileText} label="Tổng ticket" value={stats.total} hint="Đã tạo" />
        <StatCard icon={AlertCircle} label="Mới" value={stats.newTickets} hint="Chưa xử lý" />
        <StatCard icon={Clock} label="Đang xử lý" value={stats.processing} hint="Đang xử lý" />
        <StatCard icon={CheckCircle2} label="Hoàn tất" value={stats.completed} hint="Đã xong" />
        <StatCard icon={X} label="Đã hủy" value={stats.cancelled} hint="Đã hủy" />
      </div>

      {/* Ticket List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách ticket...</p>
        </Card>
      ) : filteredTickets.length === 0 ? (
        <Card className="p-8 text-center">
          <Wrench size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có ticket</h3>
          <p className="text-sm text-slate-500">Nhấn "Tạo ticket" để tạo mới</p>
          <Button className="mt-4" onClick={openCreateModal}>
            <Plus size={16} /> Tạo ticket
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTickets.map((ticket) => (
            <Card key={ticket.RequestID} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getPriorityBadge(ticket.Priority)}
                      {getStatusBadge(ticket.StatusID, ticket.Status)}
                    </div>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46] transition line-clamp-2">
                      {ticket.Title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {ticket.ResidentName} · {ticket.ApartmentCode}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Loại</span>
                    <span className="font-medium text-slate-950">{ticket.Category || 'Bảo trì'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ngày tạo</span>
                    <span className="text-slate-700">{formatDateTime(ticket.CreatedAt || ticket.RequestDate)}</span>
                  </div>
                  {ticket.DaysPending !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Thời gian</span>
                      <span className={`font-semibold ${
                        ticket.DaysPending > 7 ? 'text-rose-600' :
                        ticket.DaysPending > 3 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {ticket.DaysPending} ngày
                      </span>
                    </div>
                  )}
                  {ticket.AssignedEmployeeName && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Người xử lý</span>
                      <span className="font-medium text-slate-950">{ticket.AssignedEmployeeName}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openViewModal(ticket)}>
                    <Eye size={14} /> Xem
                  </Button>
                  {ticket.StatusID === 1 && (
                    <Button className="flex-1" onClick={() => handleUpdateStatus(ticket.RequestID, 2)}>
                      <Clock size={14} /> Nhận xử lý
                    </Button>
                  )}
                  {ticket.StatusID === 2 && (
                    <Button variant="success" className="flex-1" onClick={() => handleUpdateStatus(ticket.RequestID, 3)}>
                      <CheckCircle2 size={14} /> Hoàn tất
                    </Button>
                  )}
                  {(ticket.StatusID === 1 || ticket.StatusID === 2) && (
                    <Button variant="danger" className="flex-1" onClick={() => handleUpdateStatus(ticket.RequestID, 4)}>
                      <X size={14} /> Hủy
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

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={modalMode === 'create' ? 'Tạo ticket mới' : modalMode === 'edit' ? 'Cập nhật ticket' : 'Chi tiết ticket'}
        description={modalMode === 'view' ? 'Xem thông tin chi tiết ticket' : 'Nhập thông tin ticket'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {modalMode === 'view' && selectedTicket ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getPriorityBadge(selectedTicket.Priority)}
                  {getStatusBadge(selectedTicket.StatusID, selectedTicket.Status)}
                </div>
                <h3 className="text-2xl font-black text-slate-950">{selectedTicket.Title}</h3>
                <p className="text-sm text-slate-500">
                  {selectedTicket.ResidentName} · {selectedTicket.ApartmentCode}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thông tin người yêu cầu</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Họ tên:</span> {selectedTicket.ResidentName}</div>
                  <div><span className="text-slate-500">SĐT:</span> {selectedTicket.ResidentPhone || 'Chưa có'}</div>
                  <div><span className="text-slate-500">Căn hộ:</span> {selectedTicket.ApartmentCode}</div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thông tin ticket</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Loại:</span> {selectedTicket.Category || 'Bảo trì'}</div>
                  <div><span className="text-slate-500">Ngày tạo:</span> {formatDateTime(selectedTicket.RequestDate)}</div>
                  {selectedTicket.AssignedEmployeeName && (
                    <div><span className="text-slate-500">Người xử lý:</span> {selectedTicket.AssignedEmployeeName}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-500">Mô tả</p>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                {selectedTicket.Description || 'Không có mô tả'}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              {selectedTicket.StatusID === 1 && (
                <Button onClick={() => handleUpdateStatus(selectedTicket.RequestID, 2)}>
                  <Clock size={16} /> Nhận xử lý
                </Button>
              )}
              {selectedTicket.StatusID === 2 && (
                <Button variant="success" onClick={() => handleUpdateStatus(selectedTicket.RequestID, 3)}>
                  <CheckCircle2 size={16} /> Hoàn tất
                </Button>
              )}
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Tiêu đề *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nhập tiêu đề ticket"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Mô tả</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#1f4f46] min-h-[100px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả chi tiết vấn đề..."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
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
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Cư dân *</label>
                <select
                  value={form.residentId}
                  onChange={(e) => setForm({ ...form, residentId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                  required
                >
                  <option value="">Chọn cư dân</option>
                  {residents.map(r => (
                    <option key={r.ResidentID} value={r.ResidentID}>
                      {r.FullName} - {r.ApartmentCode || 'Chưa có căn hộ'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Mức độ ưu tiên</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                >
                  <option value="Cao">Cao</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Thấp">Thấp</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái</label>
                <select
                  value={form.statusId}
                  onChange={(e) => setForm({ ...form, statusId: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                >
                  {statuses.map(s => (
                    <option key={s.StatusID} value={s.StatusID}>
                      {s.StatusName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {modalMode === 'create' ? 'Tạo ticket' : 'Cập nhật'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}