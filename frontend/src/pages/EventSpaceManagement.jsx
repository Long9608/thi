// src/pages/EventSpaceManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Users, Clock, CheckCircle2, X,
  RefreshCw, Search, Plus, Eye, Edit, Trash2,
  FileText, User, Phone, Mail, AlertCircle,
  MapPin, Tag, DollarSign
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money } from '../utils/formatters';

export default function EventSpaceManagement({ flash }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    eventDate: '',
    endDate: '',
    location: '',
    capacity: '',
    price: '',
    status: 'SCHEDULED'
  });

  // Dữ liệu mẫu
  useEffect(() => {
    const mockData = [
      {
        id: 1,
        title: 'Họp mặt cư dân',
        description: 'Họp mặt cư dân định kỳ quý 2/2026',
        eventDate: '2026-05-15T09:00:00',
        endDate: '2026-05-15T11:00:00',
        location: 'Phòng sinh hoạt cộng đồng',
        capacity: 50,
        price: 0,
        status: 'SCHEDULED',
        registered: 32
      },
      {
        id: 2,
        title: 'Tiệc sinh nhật',
        description: 'Tiệc sinh nhật cho bé',
        eventDate: '2026-05-20T18:00:00',
        endDate: '2026-05-20T22:00:00',
        location: 'Khu vực BBQ',
        capacity: 30,
        price: 500000,
        status: 'ONGOING',
        registered: 25
      }
    ];
    setEvents(mockData);
    setLoading(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    flash('✅ Đã tạo sự kiện mới!');
    setModalOpen(false);
  };

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: events.length,
    scheduled: events.filter(e => e.status === 'SCHEDULED').length,
    ongoing: events.filter(e => e.status === 'ONGOING').length,
    completed: events.filter(e => e.status === 'COMPLETED').length
  };

  const getStatusBadge = (status) => {
    const map = {
      'SCHEDULED': { tone: 'blue', label: 'Đã lên lịch' },
      'ONGOING': { tone: 'green', label: 'Đang diễn ra' },
      'COMPLETED': { tone: 'slate', label: 'Đã kết thúc' },
      'CANCELLED': { tone: 'red', label: 'Đã hủy' }
    };
    const info = map[status] || { tone: 'slate', label: status };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý Event Space</h3>
            <p className="text-sm text-slate-500">
              Quản lý sự kiện và đặt phòng.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {stats.scheduled} sự kiện sắp diễn ra
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm sự kiện..."
              className="w-48"
            />
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Tạo sự kiện
            </Button>
            <Button variant="secondary">
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Calendar} label="Tổng sự kiện" value={stats.total} hint="Đã tạo" />
        <StatCard icon={Clock} label="Sắp diễn ra" value={stats.scheduled} hint="Đã lên lịch" />
        <StatCard icon={CheckCircle2} label="Đang diễn ra" value={stats.ongoing} hint="Hiện tại" />
        <StatCard icon={Users} label="Đã tham gia" value="57" hint="Tổng lượt đăng ký" />
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải dữ liệu...</p>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có sự kiện</h3>
          <p className="text-sm text-slate-500">Tạo sự kiện mới để bắt đầu</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                      {event.title}
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <MapPin size={14} /> {event.location}
                    </p>
                  </div>
                  {getStatusBadge(event.status)}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Thời gian</span>
                    <span className="text-slate-700">
                      {formatDate(event.eventDate)} → {formatDate(event.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Sức chứa</span>
                    <span className="font-bold text-slate-950">{event.capacity} người</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Đã đăng ký</span>
                    <span className="font-bold text-[#1f4f46]">{event.registered}/{event.capacity}</span>
                  </div>
                  {event.price > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Giá</span>
                      <span className="font-bold text-slate-950">{money(event.price)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1">Đăng ký</Button>
                  <Button variant="secondary" className="flex-1">Xem</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="Tạo sự kiện mới" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Tiêu đề *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Tiêu đề sự kiện"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Mô tả</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#1f4f46]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả sự kiện..."
              rows="3"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Thời gian bắt đầu</label>
              <Input
                type="datetime-local"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
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
            <label className="mb-1 block text-sm font-semibold text-slate-700">Địa điểm *</label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Phòng sinh hoạt cộng đồng"
              required
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Sức chứa</label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Giá (VND)</label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="SCHEDULED">Đã lên lịch</option>
              <option value="ONGOING">Đang diễn ra</option>
              <option value="COMPLETED">Đã kết thúc</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit">Tạo sự kiện</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}