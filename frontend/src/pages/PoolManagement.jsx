// src/pages/PoolManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Waves, Users, Calendar, Clock, CheckCircle2,
  X, RefreshCw, Search, Plus, Eye, Edit, Trash2,
  FileText, User, Phone, Mail, AlertCircle,
  Thermometer, Droplet
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, getInitials } from '../utils/formatters';

export default function PoolManagement({ flash }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 1
  });

  // Dữ liệu mẫu
  useEffect(() => {
    const mockData = [
      {
        id: 1,
        fullName: 'Phạm Văn D',
        phone: '0912345678',
        email: 'vand@example.com',
        startDate: '2025-01-15',
        endDate: '2025-07-15',
        status: 1,
        visits: 12,
        totalVisits: 30
      },
      {
        id: 2,
        fullName: 'Hoàng Thị E',
        phone: '0987654321',
        email: 'thie@example.com',
        startDate: '2025-03-01',
        endDate: '2025-09-01',
        status: 1,
        visits: 8,
        totalVisits: 25
      }
    ];
    setMembers(mockData);
    setLoading(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    flash('✅ Đã lưu thông tin thành viên Hồ bơi!');
    setModalOpen(false);
  };

  const filteredMembers = members.filter(m =>
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
  );

  const stats = {
    total: members.length,
    active: members.filter(m => m.status === 1).length,
    totalVisits: members.reduce((sum, m) => sum + m.visits, 0)
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý Hồ bơi</h3>
            <p className="text-sm text-slate-500">
              Quản lý thành viên sử dụng hồ bơi.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {stats.active} thành viên đang hoạt động
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm thành viên..."
              className="w-48"
            />
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Thêm thành viên
            </Button>
            <Button variant="secondary">
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="Tổng thành viên" value={stats.total} hint="Đã đăng ký" />
        <StatCard icon={CheckCircle2} label="Đang hoạt động" value={stats.active} hint="Có thể sử dụng" />
        <StatCard icon={Waves} label="Lượt sử dụng" value={stats.totalVisits} hint="Tổng lượt" />
        <StatCard icon={Thermometer} label="Nhiệt độ" value="28°C" hint="Hiện tại" />
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải dữ liệu...</p>
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card className="p-8 text-center">
          <Waves size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có thành viên</h3>
          <p className="text-sm text-slate-500">Thêm thành viên để bắt đầu</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-lg">
                      {getInitials(member.fullName)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-950">{member.fullName}</h3>
                      <p className="text-sm text-slate-500">{member.phone}</p>
                    </div>
                  </div>
                  <Badge tone={member.status === 1 ? 'green' : 'red'}>
                    {member.status === 1 ? 'Hoạt động' : 'Hết hạn'}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ngày bắt đầu</span>
                    <span className="text-slate-700">{formatDate(member.startDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ngày kết thúc</span>
                    <span className="text-slate-700">{formatDate(member.endDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Lượt sử dụng</span>
                    <span className="font-bold text-blue-600">{member.visits}/{member.totalVisits}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1">Check-in</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="Thêm thành viên Hồ bơi" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Họ tên *</label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Nguyễn Văn A"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Số điện thoại</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0912345678"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày bắt đầu</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày kết thúc</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit">Lưu</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}