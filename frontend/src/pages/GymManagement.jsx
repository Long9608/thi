// src/pages/GymManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Dumbbell, Users, Calendar, Clock, CheckCircle2,
  X, RefreshCw, Search, Plus, Eye, Edit, Trash2,
  FileText, User, Phone, Mail, AlertCircle
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, getInitials } from '../utils/formatters';

// Dữ liệu mẫu cho Gym - sẽ kết nối với API sau
export default function GymManagement({ flash }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
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
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
        email: 'vana@example.com',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 1,
        checkIns: 45,
        totalCheckIns: 120
      },
      {
        id: 2,
        fullName: 'Trần Thị B',
        phone: '0987654321',
        email: 'thib@example.com',
        startDate: '2025-02-15',
        endDate: '2025-08-15',
        status: 1,
        checkIns: 23,
        totalCheckIns: 80
      },
      {
        id: 3,
        fullName: 'Lê Văn C',
        phone: '0905123456',
        email: 'levanc@example.com',
        startDate: '2024-09-01',
        endDate: '2025-03-01',
        status: 0,
        checkIns: 67,
        totalCheckIns: 150
      }
    ];
    setMembers(mockData);
    setLoading(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    flash('✅ Đã lưu thông tin thành viên Gym!');
    setModalOpen(false);
  };

  const handleDelete = (id) => {
    if (!confirm('Bạn có chắc muốn xóa thành viên này?')) return;
    setMembers(members.filter(m => m.id !== id));
    flash('✅ Xóa thành viên thành công!');
  };

  const filteredMembers = members.filter(m =>
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: members.length,
    active: members.filter(m => m.status === 1).length,
    inactive: members.filter(m => m.status === 0).length,
    totalCheckIns: members.reduce((sum, m) => sum + m.checkIns, 0)
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý Gym</h3>
            <p className="text-sm text-slate-500">
              Quản lý thành viên và lịch sử tập luyện.
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
            <Button onClick={() => {
              setModalMode('create');
              setForm({
                fullName: '',
                phone: '',
                email: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                status: 1
              });
              setModalOpen(true);
            }}>
              <Plus size={16} /> Thêm thành viên
            </Button>
            <Button variant="secondary" onClick={() => setLoading(true)}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="Tổng thành viên" value={stats.total} hint="Đã đăng ký" />
        <StatCard icon={CheckCircle2} label="Đang hoạt động" value={stats.active} hint="Có thể tập" />
        <StatCard icon={X} label="Đã hết hạn" value={stats.inactive} hint="Cần gia hạn" />
        <StatCard icon={Dumbbell} label="Lượt tập" value={stats.totalCheckIns} hint="Tổng lượt check-in" />
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải dữ liệu...</p>
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card className="p-8 text-center">
          <Dumbbell size={48} className="text-slate-300 mx-auto" />
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef5f2] text-[#1f4f46] font-bold text-lg">
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
                    <span className="text-slate-500">Lượt tập</span>
                    <span className="font-bold text-[#1f4f46]">{member.checkIns}/{member.totalCheckIns}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1">Check-in</Button>
                  <Button variant="danger" className="flex-1" onClick={() => handleDelete(member.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={modalMode === 'create' ? 'Thêm thành viên Gym' : 'Cập nhật thành viên'}
        onClose={() => setModalOpen(false)}
      >
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
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
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
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: parseInt(e.target.value) })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value={1}>Hoạt động</option>
              <option value={0}>Hết hạn</option>
            </select>
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