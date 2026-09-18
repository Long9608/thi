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
import { apartmentAPI } from '../api';

// Constants
const STATUS_CONFIG = {
  1: { tone: 'slate', label: 'Còn trống', color: '#94a3b8' },
  2: { tone: 'green', label: 'Đang ở', color: '#1f4f46' },
  3: { tone: 'amber', label: 'Bảo trì', color: '#f59e0b' },
  4: { tone: 'blue', label: 'Đang thuê', color: '#0d9488' }
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: '1', label: 'Còn trống' },
  { value: '2', label: 'Đang ở' },
  { value: '3', label: 'Bảo trì' },
  { value: '4', label: 'Đang thuê' }
];

// Memoized StatusBadge component
const StatusBadge = React.memo(({ statusId }) => {
  const config = STATUS_CONFIG[statusId] || { tone: 'slate', label: 'Chưa xác định' };
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
          {data.map((apt) => {
            const statusConfig = STATUS_CONFIG[apt.StatusID] || { label: apt.Status || 'Chưa xác định' };
            return (
              <tr key={apt.ApartmentID} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2 font-medium text-slate-950">{apt.ApartmentCode}</td>
                <td className="px-3 py-2 text-slate-600">{apt.BuildingName}</td>
                <td className="px-3 py-2 text-slate-600">{apt.FloorNumber}</td>
                <td className="px-3 py-2 text-slate-600">{apt.Area} m²</td>
                <td className="px-3 py-2">
                  <StatusBadge statusId={apt.StatusID} />
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {apt.CurrentResidents || <span className="text-slate-400">—</span>}
                </td>
              </tr>
            );
          })}
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
  const [apartments, setApartments] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Fetch real data
  const fetchApartments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apartmentAPI.getAll(search, statusFilter, 1, 999);
      console.log('📊 Apartment report data:', res);
      
      if (res && res.data) {
        const data = Array.isArray(res.data) ? res.data : [];
        setApartments(data);
        setTotalPages(res.pagination?.totalPages || 1);
      } else {
        setApartments([]);
      }
    } catch (error) {
      console.error('Error fetching apartments:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải dữ liệu căn hộ'));
      setApartments([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, flash]);

  useEffect(() => {
    fetchApartments();
  }, [fetchApartments]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return apartments.slice(start, start + itemsPerPage);
  }, [apartments, currentPage]);

  const totalPagesFromData = Math.ceil(apartments.length / itemsPerPage);

  // Statistics
  const stats = useMemo(() => {
    const total = apartments.length;
    const occupied = apartments.filter(a => a.StatusID === 2 || a.StatusID === 4).length;
    const vacant = apartments.filter(a => a.StatusID === 1).length;
    const maintenance = apartments.filter(a => a.StatusID === 3).length;
    const totalArea = apartments.reduce((sum, a) => sum + (parseFloat(a.Area) || 0), 0);
    // Tính tổng doanh thu từ căn hộ đang thuê
    const totalRent = apartments.reduce((sum, a) => sum + (parseFloat(a.CurrentRent) || 0), 0);
    return { total, occupied, vacant, maintenance, totalArea, totalRent };
  }, [apartments]);

  // Status distribution for chart
  const statusDistribution = useMemo(() => {
    const counts = apartments.reduce((acc, a) => {
      const config = STATUS_CONFIG[a.StatusID];
      const label = config?.label || a.Status || 'Chưa xác định';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [apartments]);

  // Chart colors
  const COLORS = ['#1f4f46', '#0d9488', '#f59e0b', '#94a3b8'];

  // Handlers
  const handleRefresh = useCallback(() => {
    fetchApartments();
  }, [fetchApartments]);

  const handleExport = useCallback(() => {
    try {
      const headers = ['Mã căn hộ', 'Tòa nhà', 'Tầng', 'Diện tích (m²)', 'Trạng thái', 'Cư dân', 'Giá thuê'];
      const rows = apartments.map(apt => [
        apt.ApartmentCode,
        apt.BuildingName,
        apt.FloorNumber,
        apt.Area,
        STATUS_CONFIG[apt.StatusID]?.label || apt.Status || 'Chưa xác định',
        apt.CurrentResidents || 'Trống',
        apt.CurrentRent ? money(apt.CurrentRent) : '0'
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-can-ho_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      if (flash) flash('✅ Xuất báo cáo thành công!');
    } catch (error) {
      if (flash) flash('❌ Có lỗi khi xuất báo cáo');
      console.error('Export error:', error);
    }
  }, [apartments, flash]);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPagesFromData)));
  }, [totalPagesFromData]);

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
                Hiển thị {paginatedData.length}/{apartments.length} căn
              </span>
            </div>
            
            <ApartmentTable data={paginatedData} />

            {/* Pagination */}
            {totalPagesFromData > 1 && (
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
                  Trang {currentPage} / {totalPagesFromData}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPagesFromData}
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
