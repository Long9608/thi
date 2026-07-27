// src/pages/ApartmentReport.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Download, RefreshCw, Search,
  Filter, Home, Users, Clock,
  CheckCircle2, X, AlertCircle,
  PieChart, BarChart3, DollarSign
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, Button, Input, Badge, StatCard } from '../components/UI';
import { formatDate, money, formatNumber } from '../utils/formatters';

// Constants
const STATUS_CONFIG = {
  'occupied': { tone: 'green', label: 'Đang ở', color: '#1f4f46' },
  'rented': { tone: 'blue', label: 'Đang thuê', color: '#0d9488' },
  'vacant': { tone: 'slate', label: 'Còn trống', color: '#94a3b8' },
  'maintenance': { tone: 'amber', label: 'Bảo trì', color: '#f59e0b' }
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'occupied', label: 'Đang ở' },
  { value: 'rented', label: 'Đang thuê' },
  { value: 'vacant', label: 'Còn trống' },
  { value: 'maintenance', label: 'Bảo trì' }
];

// Memoized StatusBadge component
const StatusBadge = React.memo(({ status }) => {
  const config = STATUS_CONFIG[status] || { tone: 'slate', label: status };
  return <Badge tone={config.tone}>{config.label}</Badge>;
});

StatusBadge.displayName = 'StatusBadge';

// Memoized ApartmentTable component
const ApartmentTable = React.memo(({ data }) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <Home size={48} className="mx-auto text-slate-300" />
        <p className="mt-2 text-slate-500">Không tìm thấy căn hộ nào</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-96">
      <table className="w-full text-left text-sm" role="table">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 sticky top-0">
          <tr>
            <th className="px-3 py-2 font-semibold">Mã</th>
            <th className="px-3 py-2 font-semibold">Tòa nhà</th>
            <th className="px-3 py-2 font-semibold">Tầng</th>
            <th className="px-3 py-2 font-semibold">Diện tích</th>
            <th className="px-3 py-2 font-semibold">Trạng thái</th>
            <th className="px-3 py-2 font-semibold">Chủ sở hữu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((apt) => (
            <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 font-medium text-slate-950">{apt.code}</td>
              <td className="px-3 py-2 text-slate-600">{apt.building}</td>
              <td className="px-3 py-2 text-slate-600">{apt.floor}</td>
              <td className="px-3 py-2 text-slate-600">{apt.area} m²</td>
              <td className="px-3 py-2">
                <StatusBadge status={apt.status} />
              </td>
              <td className="px-3 py-2 text-slate-600">
                {apt.owner || <span className="text-slate-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

ApartmentTable.displayName = 'ApartmentTable';

export default function ApartmentReport({ flash }) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dữ liệu mẫu
  const apartmentData = useMemo(() => {
    return [
      { id: 1, code: 'A-1201', building: 'Block A', floor: 12, area: 75.5, status: 'occupied', rent: 15000000, owner: 'Nguyễn Minh Anh' },
      { id: 2, code: 'B-0805', building: 'Block B', floor: 8, area: 92.0, status: 'occupied', rent: 18000000, owner: 'Trần Quốc Bảo' },
      { id: 3, code: 'A-0903', building: 'Block A', floor: 9, area: 68.2, status: 'rented', rent: 13500000, owner: 'Lê Hoàng Yến' },
      { id: 4, code: 'C-0301', building: 'Block C', floor: 3, area: 110.0, status: 'occupied', rent: 20000000, owner: 'Phạm Gia Huy' },
      { id: 5, code: 'A-0101', building: 'Block A', floor: 1, area: 75.5, status: 'vacant', rent: 0, owner: '' },
      { id: 6, code: 'A-1202', building: 'Block A', floor: 12, area: 85.0, status: 'maintenance', rent: 0, owner: '' }
    ];
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = apartmentData;
    
    if (search) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(a =>
        a.code.toLowerCase().includes(q) ||
        a.building.toLowerCase().includes(q) ||
        a.owner.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    return filtered;
  }, [apartmentData, search, statusFilter]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Statistics
  const stats = useMemo(() => {
    const total = apartmentData.length;
    const occupied = apartmentData.filter(a => a.status === 'occupied' || a.status === 'rented').length;
    const vacant = apartmentData.filter(a => a.status === 'vacant').length;
    const maintenance = apartmentData.filter(a => a.status === 'maintenance').length;
    const totalArea = apartmentData.reduce((sum, a) => sum + a.area, 0);
    const totalRent = apartmentData.reduce((sum, a) => sum + a.rent, 0);
    return { total, occupied, vacant, maintenance, totalArea, totalRent };
  }, [apartmentData]);

  // Status distribution for chart
  const statusDistribution = useMemo(() => {
    const counts = apartmentData.reduce((acc, a) => {
      const label = STATUS_CONFIG[a.status]?.label || a.status;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [apartmentData]);

  // Chart colors
  const COLORS = Object.values(STATUS_CONFIG).map(config => config.color);

  // Handlers
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleExport = useCallback(() => {
    try {
      const headers = ['Mã căn hộ', 'Tòa nhà', 'Tầng', 'Diện tích (m²)', 'Trạng thái', 'Chủ sở hữu', 'Giá thuê'];
      const rows = filteredData.map(apt => [
        apt.code,
        apt.building,
        apt.floor,
        apt.area,
        STATUS_CONFIG[apt.status]?.label || apt.status,
        apt.owner || 'Trống',
        apt.rent > 0 ? money(apt.rent) : '0'
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM for Vietnamese
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-can-ho_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      if (flash) {
        flash.success('Xuất báo cáo thành công!');
      }
    } catch (error) {
      if (flash) {
        flash.error('Có lỗi khi xuất báo cáo');
      }
      console.error('Export error:', error);
    }
  }, [filteredData, flash]);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Báo cáo căn hộ</h3>
            <p className="text-sm text-slate-500">
              Thống kê tình trạng căn hộ.
              <span className="ml-2 text-emerald-600 font-semibold">
                {stats.occupied} căn đã thuê
              </span>
              <span className="ml-2 text-slate-400">|</span>
              <span className="ml-2 text-amber-600 font-semibold">
                {stats.maintenance} căn bảo trì
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm căn hộ..."
              className="w-48"
              aria-label="Tìm kiếm căn hộ"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46] focus:ring-2 focus:ring-[#1f4f46]/20 transition-all"
              aria-label="Lọc theo trạng thái"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button 
              variant="secondary" 
              onClick={handleRefresh}
              aria-label="Làm mới dữ liệu"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={handleExport}>
              <Download size={16} /> Xuất báo cáo
            </Button>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <StatCard icon={Building2} label="Tổng căn hộ" value={stats.total} hint="Đang quản lý" />
        <StatCard icon={Users} label="Đã thuê" value={stats.occupied} hint="Có người ở" />
        <StatCard icon={Home} label="Còn trống" value={stats.vacant} hint="Chưa thuê" />
        <StatCard icon={AlertCircle} label="Bảo trì" value={stats.maintenance} hint="Cần sửa" />
        <StatCard icon={DollarSign} label="Tổng doanh thu" value={money(stats.totalRent)} hint="Theo hợp đồng" />
      </div>

      {/* Charts and Table */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải báo cáo...</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pie Chart */}
          <Card className="p-6">
            <h4 className="font-bold text-slate-950 mb-4">Phân bố theo trạng thái</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} căn`, 'Số lượng']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Apartment List */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-950">Danh sách căn hộ</h4>
              <span className="text-sm text-slate-500">
                Hiển thị {paginatedData.length}/{filteredData.length} căn
              </span>
            </div>
            
            <ApartmentTable data={paginatedData} />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="text-sm"
                >
                  Trước
                </Button>
                <span className="text-sm text-slate-600">
                  Trang {currentPage} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="text-sm"
                >
                  Sau
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </motion.div>
  );
}