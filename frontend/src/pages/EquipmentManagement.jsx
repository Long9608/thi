// src/pages/EquipmentManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList, Plus, Search, Download, Edit, Trash2, Eye,
  RefreshCw, CheckCircle2, X, AlertCircle,
  Wrench, Settings, Zap, Droplet, Shield,
  Home, Calendar, Clock, User, Tag, FileText
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, formatDateTime, getInitials } from '../utils/formatters';
export default function EquipmentManagement({ flash }) {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dữ liệu mẫu
  useEffect(() => {
    const mockData = [
      {
        id: 1,
        name: 'Thang máy Block A - P1',
        code: 'TM-A-01',
        type: 'Thang máy',
        location: 'Block A - Tầng 1',
        status: 'operational',
        manufacturer: 'Mitsubishi',
        model: 'M-2020',
        serialNumber: 'SN-2020-001',
        installationDate: '2020-01-15',
        lastMaintenance: '2026-04-15',
        nextMaintenance: '2026-05-15',
        warrantyExpiry: '2025-12-31'
      },
      {
        id: 2,
        name: 'Máy phát điện dự phòng',
        code: 'GEN-01',
        type: 'Máy phát điện',
        location: 'Tầng hầm B2',
        status: 'maintenance',
        manufacturer: 'Cummins',
        model: 'C-500',
        serialNumber: 'SN-2021-002',
        installationDate: '2021-06-20',
        lastMaintenance: '2026-03-20',
        nextMaintenance: '2026-06-20',
        warrantyExpiry: '2026-06-20'
      },
      {
        id: 3,
        name: 'Hệ thống báo cháy trung tâm',
        code: 'FIRE-01',
        type: 'PCCC',
        location: 'Phòng kỹ thuật - Tầng 1',
        status: 'operational',
        manufacturer: 'Notifier',
        model: 'N-3000',
        serialNumber: 'SN-2019-003',
        installationDate: '2019-12-01',
        lastMaintenance: '2026-04-01',
        nextMaintenance: '2026-07-01',
        warrantyExpiry: '2024-12-01'
      }
    ];
    setEquipment(mockData);
    setLoading(false);
  }, []);

  const filteredData = useMemo(() => {
    let filtered = equipment;
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    return filtered;
  }, [equipment, search, statusFilter]);

  const stats = useMemo(() => {
    const total = equipment.length;
    const operational = equipment.filter(e => e.status === 'operational').length;
    const maintenance = equipment.filter(e => e.status === 'maintenance').length;
    const broken = equipment.filter(e => e.status === 'broken').length;
    const retired = equipment.filter(e => e.status === 'retired').length;
    return { total, operational, maintenance, broken, retired };
  }, [equipment]);

  const getStatusBadge = (status) => {
    const map = {
      'operational': { tone: 'green', label: 'Hoạt động' },
      'maintenance': { tone: 'amber', label: 'Bảo trì' },
      'broken': { tone: 'red', label: 'Hỏng' },
      'retired': { tone: 'slate', label: 'Ngừng sử dụng' }
    };
    const info = map[status] || { tone: 'slate', label: status };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'operational': return <CheckCircle2 size={16} className="text-emerald-600" />;
      case 'maintenance': return <Wrench size={16} className="text-amber-600" />;
      case 'broken': return <X size={16} className="text-rose-600" />;
      default: return <Settings size={16} className="text-slate-400" />;
    }
  };

  const openViewModal = (item) => {
    setSelectedEquipment(item);
    setModalMode('view');
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý thiết bị</h3>
            <p className="text-sm text-slate-500">
              Quản lý thiết bị trong tòa nhà.
              <span className="ml-2 text-emerald-600 font-semibold">
                {stats.operational} thiết bị đang hoạt động
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm thiết bị..."
              className="w-48"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="operational">Hoạt động</option>
              <option value="maintenance">Bảo trì</option>
              <option value="broken">Hỏng</option>
              <option value="retired">Ngừng sử dụng</option>
            </select>
            <Button onClick={() => flash('Đang phát triển...')}>
              <Plus size={16} /> Thêm thiết bị
            </Button>
            <Button variant="secondary">
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={ClipboardList} label="Tổng thiết bị" value={stats.total} hint="Đang quản lý" />
        <StatCard icon={CheckCircle2} label="Hoạt động" value={stats.operational} hint="Đang dùng" />
        <StatCard icon={Wrench} label="Bảo trì" value={stats.maintenance} hint="Cần bảo trì" />
        <StatCard icon={AlertCircle} label="Hỏng" value={stats.broken} hint="Cần sửa" />
        <StatCard icon={X} label="Ngừng sử dụng" value={stats.retired} hint="Đã loại bỏ" />
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải dữ liệu...</p>
        </Card>
      ) : filteredData.length === 0 ? (
        <Card className="p-8 text-center">
          <ClipboardList size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có thiết bị</h3>
          <p className="text-sm text-slate-500">Thêm thiết bị để bắt đầu</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredData.map((item) => (
            <Card key={item.id} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(item.status)}
                      {getStatusBadge(item.status)}
                    </div>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                      {item.name}
                    </h3>
                    <p className="text-sm text-slate-500">{item.code}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Loại</span>
                    <span className="font-medium text-slate-950">{item.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Vị trí</span>
                    <span className="text-slate-700">{item.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Hãng</span>
                    <span className="text-slate-700">{item.manufacturer}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Bảo trì cuối</span>
                    <span className="text-slate-700">{formatDate(item.lastMaintenance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Bảo trì tiếp theo</span>
                    <span className={`font-semibold ${
                      new Date(item.nextMaintenance) < new Date() ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {formatDate(item.nextMaintenance)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openViewModal(item)}>
                    <Eye size={14} /> Xem
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={() => flash('Đang phát triển...')}>
                    <Edit size={14} /> Sửa
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