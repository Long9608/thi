// src/pages/MaintenanceSchedule.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Plus, Search, Download, Edit, Trash2, Eye,
  RefreshCw, CheckCircle2, X, AlertCircle,
  Clock, Wrench, Building2, Home, User,
  Zap, Droplet, Settings, FileText
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, formatDateTime, getInitials } from '../utils/formatters';

// ... phần còn lại giữ nguyên

export default function MaintenanceSchedule({ flash }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dữ liệu mẫu
  useEffect(() => {
    const mockData = [
      {
        id: 1,
        title: 'Bảo trì thang máy Block A',
        description: 'Bảo trì định kỳ hệ thống thang máy Block A',
        scheduledDate: '2026-05-15 09:00:00',
        endDate: '2026-05-15 11:00:00',
        type: 'Định kỳ',
        status: 'completed',
        assignedTo: 'Phạm Văn Sáng',
        location: 'Block A',
        priority: 'Trung bình'
      },
      {
        id: 2,
        title: 'Kiểm tra hệ thống PCCC',
        description: 'Kiểm tra toàn bộ hệ thống báo cháy và chữa cháy',
        scheduledDate: '2026-05-20 14:00:00',
        endDate: '2026-05-20 17:00:00',
        type: 'Định kỳ',
        status: 'pending',
        assignedTo: 'Trần Đức Vũ',
        location: 'Toàn tòa nhà',
        priority: 'Cao'
      },
      {
        id: 3,
        title: 'Sửa chữa đèn chiếu sáng tầng 8',
        description: 'Thay thế bóng đèn hỏng tại hành lang tầng 8 Block B',
        scheduledDate: '2026-05-18 08:30:00',
        endDate: '2026-05-18 10:00:00',
        type: 'Sửa chữa',
        status: 'in_progress',
        assignedTo: 'Phạm Văn Sáng',
        location: 'Block B - Tầng 8',
        priority: 'Thấp'
      }
    ];
    setSchedules(mockData);
    setLoading(false);
  }, []);

  const filteredData = useMemo(() => {
    const q = search.toLowerCase();
    return schedules.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      item.assignedTo.toLowerCase().includes(q)
    );
  }, [schedules, search]);

  const stats = useMemo(() => {
    const total = schedules.length;
    const pending = schedules.filter(s => s.status === 'pending').length;
    const inProgress = schedules.filter(s => s.status === 'in_progress').length;
    const completed = schedules.filter(s => s.status === 'completed').length;
    const cancelled = schedules.filter(s => s.status === 'cancelled').length;
    return { total, pending, inProgress, completed, cancelled };
  }, [schedules]);

  const getStatusBadge = (status) => {
    const map = {
      'pending': { tone: 'blue', label: 'Chờ thực hiện' },
      'in_progress': { tone: 'amber', label: 'Đang thực hiện' },
      'completed': { tone: 'green', label: 'Hoàn tất' },
      'cancelled': { tone: 'red', label: 'Đã hủy' }
    };
    const info = map[status] || { tone: 'slate', label: status };
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

  const openViewModal = (item) => {
    setSelectedSchedule(item);
    setModalMode('view');
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Lịch bảo trì</h3>
            <p className="text-sm text-slate-500">
              Lịch bảo trì định kỳ và sửa chữa.
              <span className="ml-2 text-amber-600 font-semibold">
                {stats.pending} công việc chờ thực hiện
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-48"
            />
            <Button onClick={() => flash('Đang phát triển...')}>
              <Plus size={16} /> Thêm lịch
            </Button>
            <Button variant="secondary">
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={Calendar} label="Tổng lịch" value={stats.total} hint="Đã tạo" />
        <StatCard icon={Clock} label="Chờ thực hiện" value={stats.pending} hint="Chưa bắt đầu" />
        <StatCard icon={Wrench} label="Đang thực hiện" value={stats.inProgress} hint="Đang làm" />
        <StatCard icon={CheckCircle2} label="Hoàn tất" value={stats.completed} hint="Đã xong" />
        <StatCard icon={X} label="Đã hủy" value={stats.cancelled} hint="Đã hủy" />
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải dữ liệu...</p>
        </Card>
      ) : filteredData.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có lịch bảo trì</h3>
          <p className="text-sm text-slate-500">Thêm lịch bảo trì để bắt đầu</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredData.map((item) => (
            <Card key={item.id} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(item.status)}
                      {getPriorityBadge(item.priority)}
                    </div>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{item.location}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Loại</span>
                    <span className="font-medium text-slate-950">{item.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Thời gian</span>
                    <span className="text-slate-700">{formatDateTime(item.scheduledDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Người phụ trách</span>
                    <span className="font-medium text-slate-950">{item.assignedTo}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openViewModal(item)}>
                    <Eye size={14} /> Xem
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title="Chi tiết lịch bảo trì"
        description="Xem thông tin chi tiết"
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {selectedSchedule && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-950">{selectedSchedule.title}</h3>
                <p className="text-sm text-slate-500">{selectedSchedule.location}</p>
              </div>
              {getStatusBadge(selectedSchedule.status)}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thông tin</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Loại:</span> {selectedSchedule.type}</div>
                  <div><span className="text-slate-500">Ưu tiên:</span> {selectedSchedule.priority}</div>
                  <div><span className="text-slate-500">Người phụ trách:</span> {selectedSchedule.assignedTo}</div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thời gian</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Bắt đầu:</span> {formatDateTime(selectedSchedule.scheduledDate)}</div>
                  <div><span className="text-slate-500">Kết thúc:</span> {formatDateTime(selectedSchedule.endDate)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-500">Mô tả</p>
              <p className="mt-2 text-sm text-slate-700">{selectedSchedule.description}</p>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}