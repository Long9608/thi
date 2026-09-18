// src/pages/MaintenanceManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Plus, Search, Download, Edit, Trash2, Eye,
  RefreshCw, CheckCircle2, X, AlertCircle,
  Calendar, Clock, User, Home, Wrench,
  Clipboard, Shield, Zap, Droplet, FileText
} from 'lucide-react';
import { ticketAPI, residentAPI, apartmentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, formatDateTime, getInitials } from '../utils/formatters';

export default function MaintenanceManagement({ flash }) {
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter maintenance items (chỉ lấy các ticket có loại bảo trì)
  const fetchMaintenance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ticketAPI.getAll(statusFilter, page, 20);
      const data = res?.data || res || [];
      // Lọc các ticket có category là bảo trì
      const maintenanceData = Array.isArray(data) 
        ? data.filter(t => t.Category === 'Bảo trì' || t.Category === 'Bảo trì định kỳ')
        : [];
      setMaintenance(maintenanceData);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching maintenance:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách bảo trì'));
      setMaintenance([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, flash]);

  useEffect(() => {
    fetchMaintenance();
  }, [fetchMaintenance]);

  const filteredData = useMemo(() => {
    const q = search.toLowerCase();
    return maintenance.filter(item =>
      (item.Title || '').toLowerCase().includes(q) ||
      (item.ResidentName || '').toLowerCase().includes(q) ||
      (item.ApartmentCode || '').toLowerCase().includes(q)
    );
  }, [maintenance, search]);

  const stats = useMemo(() => {
    const total = maintenance.length;
    const pending = maintenance.filter(t => t.StatusID === 1).length;
    const processing = maintenance.filter(t => t.StatusID === 2).length;
    const completed = maintenance.filter(t => t.StatusID === 3).length;
    return { total, pending, processing, completed };
  }, [maintenance]);

  const getStatusBadge = (statusId) => {
    const map = {
      1: { tone: 'blue', label: 'Mới' },
      2: { tone: 'amber', label: 'Đang xử lý' },
      3: { tone: 'green', label: 'Hoàn tất' },
      4: { tone: 'red', label: 'Đã hủy' }
    };
    const info = map[statusId] || { tone: 'slate', label: 'Chưa xác định' };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  const openViewModal = (item) => {
    setSelectedItem(item);
    setModalMode('view');
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý bảo trì</h3>
            <p className="text-sm text-slate-500">
              Quản lý công tác bảo trì, sửa chữa.
              <span className="ml-2 text-amber-600 font-semibold">
                {stats.pending} yêu cầu mới
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="1">Mới</option>
              <option value="2">Đang xử lý</option>
              <option value="3">Hoàn tất</option>
              <option value="4">Đã hủy</option>
            </select>
            <Button variant="secondary" onClick={fetchMaintenance} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Wrench} label="Tổng yêu cầu" value={stats.total} hint="Đã tạo" />
        <StatCard icon={AlertCircle} label="Mới" value={stats.pending} hint="Chưa xử lý" />
        <StatCard icon={Clock} label="Đang xử lý" value={stats.processing} hint="Đang xử lý" />
        <StatCard icon={CheckCircle2} label="Hoàn tất" value={stats.completed} hint="Đã xong" />
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải dữ liệu...</p>
        </Card>
      ) : filteredData.length === 0 ? (
        <Card className="p-8 text-center">
          <Settings size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có yêu cầu bảo trì</h3>
          <p className="text-sm text-slate-500">Chưa có yêu cầu bảo trì nào</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredData.map((item) => (
            <Card key={item.RequestID} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(item.StatusID)}
                      <Badge tone="purple">{item.Priority || 'Trung bình'}</Badge>
                    </div>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46] line-clamp-2">
                      {item.Title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {item.ResidentName} · {item.ApartmentCode}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ngày tạo</span>
                    <span className="text-slate-700">{formatDateTime(item.RequestDate)}</span>
                  </div>
                  {item.AssignedEmployeeName && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Người xử lý</span>
                      <span className="font-medium text-slate-950">{item.AssignedEmployeeName}</span>
                    </div>
                  )}
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
    </div>
  );
}