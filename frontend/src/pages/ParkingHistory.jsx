// src/pages/ParkingHistory.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, Search, Download, RefreshCw, Calendar,
  Car, User, MapPin, ArrowRight, ArrowLeft,
  CheckCircle2, X, Filter, Printer, FileText,
  AlertCircle, Home, Users, Eye
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDateTime, getInitials, timeAgo } from '../utils/formatters';

export default function ParkingHistory({ flash }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dữ liệu mẫu - sẽ kết nối với API sau
  useEffect(() => {
    const mockData = [
      {
        id: 1,
        plateNumber: '30H-123.45',
        ownerName: 'Nguyễn Minh Anh',
        vehicleType: 'Ô tô',
        slotNumber: 'B1-021',
        action: 'Vào',
        timestamp: '2026-04-28 08:30:00',
        status: 'completed'
      },
      {
        id: 2,
        plateNumber: '29X1-456.78',
        ownerName: 'Lê Hoàng Yến',
        vehicleType: 'Xe máy',
        slotNumber: 'M-118',
        action: 'Ra',
        timestamp: '2026-04-28 07:15:00',
        status: 'completed'
      },
      {
        id: 3,
        plateNumber: '30K-888.99',
        ownerName: 'Trần Quốc Bảo',
        vehicleType: 'Ô tô',
        slotNumber: 'B2-015',
        action: 'Vào',
        timestamp: '2026-04-27 22:00:00',
        status: 'pending'
      },
      {
        id: 4,
        plateNumber: '30H-123.45',
        ownerName: 'Nguyễn Minh Anh',
        vehicleType: 'Ô tô',
        slotNumber: 'B1-021',
        action: 'Ra',
        timestamp: '2026-04-27 18:45:00',
        status: 'completed'
      },
      {
        id: 5,
        plateNumber: '29X1-456.78',
        ownerName: 'Lê Hoàng Yến',
        vehicleType: 'Xe máy',
        slotNumber: 'M-118',
        action: 'Vào',
        timestamp: '2026-04-27 14:20:00',
        status: 'completed'
      }
    ];
    setHistory(mockData);
    setLoading(false);
  }, []);

  const filteredHistory = useMemo(() => {
    let filtered = history;
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(h =>
        h.plateNumber.toLowerCase().includes(q) ||
        h.ownerName.toLowerCase().includes(q) ||
        h.slotNumber.toLowerCase().includes(q)
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(h =>
        h.timestamp.startsWith(dateFilter)
      );
    }

    if (typeFilter) {
      filtered = filtered.filter(h => h.action === typeFilter);
    }

    return filtered;
  }, [history, search, dateFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = history.length;
    const entries = history.filter(h => h.action === 'Vào').length;
    const exits = history.filter(h => h.action === 'Ra').length;
    const pending = history.filter(h => h.status === 'pending').length;
    return { total, entries, exits, pending };
  }, [history]);

  const getActionBadge = (action) => {
    if (action === 'Vào') {
      return <Badge tone="green">Vào</Badge>;
    }
    return <Badge tone="amber">Ra</Badge>;
  };

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return <Badge tone="green">Hoàn tất</Badge>;
    }
    return <Badge tone="amber">Đang chờ</Badge>;
  };

  const getActionIcon = (action) => {
    if (action === 'Vào') {
      return <ArrowRight size={18} className="text-emerald-600" />;
    }
    return <ArrowLeft size={18} className="text-amber-600" />;
  };

  const openDetailModal = (record) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (flash) flash('✅ Đã làm mới dữ liệu');
    }, 500);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Lịch sử ra/vào</h3>
            <p className="text-sm text-slate-500">
              Theo dõi lịch sử ra vào bãi xe.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {stats.entries} lượt vào / {stats.exits} lượt ra
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm biển số, chủ xe..."
              className="w-48"
            />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40"
              icon={Calendar}
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả</option>
              <option value="Vào">Vào</option>
              <option value="Ra">Ra</option>
            </select>
            <Button variant="secondary" onClick={handleRefresh} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Clock} label="Tổng lượt" value={stats.total} hint="Đã ghi nhận" />
        <StatCard icon={ArrowRight} label="Lượt vào" value={stats.entries} hint="Xe vào bãi" />
        <StatCard icon={ArrowLeft} label="Lượt ra" value={stats.exits} hint="Xe ra khỏi bãi" />
        <StatCard icon={AlertCircle} label="Đang chờ" value={stats.pending} hint="Chưa hoàn tất" />
      </div>

      {/* History List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải lịch sử...</p>
        </Card>
      ) : filteredHistory.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có lịch sử</h3>
          <p className="text-sm text-slate-500">Chưa có hoạt động ra/vào nào</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Biển số</th>
                  <th className="px-5 py-3">Chủ xe</th>
                  <th className="px-5 py-3">Loại xe</th>
                  <th className="px-5 py-3">Vị trí</th>
                  <th className="px-5 py-3">Hành động</th>
                  <th className="px-5 py-3">Thời gian</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-950">
                      {record.plateNumber}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef5f2] text-xs font-bold text-[#1f4f46]">
                          {getInitials(record.ownerName)}
                        </div>
                        {record.ownerName}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{record.vehicleType}</td>
                    <td className="px-5 py-4 font-medium text-slate-950">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} className="text-[#1f4f46]" />
                        {record.slotNumber}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1">
                        {getActionIcon(record.action)}
                        {getActionBadge(record.action)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDateTime(record.timestamp)}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-5 py-4">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => openDetailModal(record)}
                      >
                        <Eye size={14} /> Xem
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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

      {/* Modal - Detail */}
      <Modal
        open={modalOpen}
        title="Chi tiết lịch sử ra/vào"
        description="Xem thông tin chi tiết"
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-950">{selectedRecord.plateNumber}</h3>
                <p className="text-sm text-slate-500">{selectedRecord.ownerName}</p>
              </div>
              <div className="flex gap-2">
                {getActionBadge(selectedRecord.action)}
                {getStatusBadge(selectedRecord.status)}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thông tin xe</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Biển số:</span> {selectedRecord.plateNumber}</div>
                  <div><span className="text-slate-500">Chủ xe:</span> {selectedRecord.ownerName}</div>
                  <div><span className="text-slate-500">Loại xe:</span> {selectedRecord.vehicleType}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thông tin ra/vào</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Hành động:</span> {selectedRecord.action}</div>
                  <div><span className="text-slate-500">Vị trí:</span> {selectedRecord.slotNumber}</div>
                  <div><span className="text-slate-500">Thời gian:</span> {formatDateTime(selectedRecord.timestamp)}</div>
                  <div><span className="text-slate-500">Trạng thái:</span> {selectedRecord.status === 'completed' ? 'Hoàn tất' : 'Đang chờ'}</div>
                </div>
              </div>
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