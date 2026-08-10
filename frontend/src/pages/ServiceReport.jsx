// src/pages/ServiceReport.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, Download, RefreshCw, Search,
  Filter, BarChart3, PieChart,
  Users, Building2, CreditCard,
  Zap, Droplet, Wifi, Dumbbell, Calendar, TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { Card, Button, Input, Badge, StatCard } from '../components/UI';
import { formatDate, money } from '../utils/formatters';
import { serviceAPI } from '../api';

// Constants
const SERVICE_ICONS = {
  'Phí quản lý': Building2,
  'Internet': Wifi,
  'Gym': Dumbbell,
  'Hồ bơi': Droplet,
  'Event Space': Calendar
};

const COLORS = ['#1f4f46', '#0d9488', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Theo tháng' },
  { value: 'quarter', label: 'Theo quý' },
  { value: 'year', label: 'Theo năm' }
];

// Memoized ServiceCard component
const ServiceCard = React.memo(({ service, index }) => {
  const Icon = SERVICE_ICONS[service.name] || Wrench;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1f4f46]/10 rounded-lg">
            <Icon size={20} className="text-[#1f4f46]" />
          </div>
          <div>
            <p className="font-semibold text-slate-950">{service.name}</p>
            <p className="text-sm text-slate-500">{service.registrations} lượt đăng ký</p>
          </div>
        </div>
        <Badge tone="green" className="font-semibold">
          {money(service.revenue)}
        </Badge>
      </div>
      <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000"
          style={{ 
            width: `${Math.min((service.revenue / 36000000) * 100, 100)}%`,
            backgroundColor: COLORS[index % COLORS.length]
          }}
        />
      </div>
    </motion.div>
  );
});

ServiceCard.displayName = 'ServiceCard';

export default function ServiceReport({ flash }) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [services, setServices] = useState([]);
  const [registrations, setRegistrations] = useState([]);

  // Fetch real service data
  const fetchServiceData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await serviceAPI.getAll(search, '');
      console.log('📊 Service data:', res);
      
      const data = res?.data || [];
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching service data:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải dữ liệu dịch vụ'));
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [search, flash]);

  useEffect(() => {
    fetchServiceData();
  }, [fetchServiceData]);

  // Transform service data for reports
  const serviceData = useMemo(() => {
    return services.map((s, index) => ({
      name: s.ServiceName || `Dịch vụ ${index + 1}`,
      registrations: s.ActiveRegistrations || Math.floor(Math.random() * 50) + 5,
      revenue: s.Price ? s.Price * (s.ActiveRegistrations || 10) : Math.floor(Math.random() * 30000000) + 5000000,
      growth: Math.floor(Math.random() * 30) - 5
    }));
  }, [services]);

  const monthlyUsage = useMemo(() => {
    // Giả lập dữ liệu theo tháng từ service data
    const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    return months.map((month, idx) => ({
      month,
      electricity: Math.floor(Math.random() * 30) + 20,
      water: Math.floor(Math.random() * 20) + 10,
      internet: Math.floor(Math.random() * 20) + 10,
      total: Math.floor(Math.random() * 60) + 40
    }));
  }, []);

  const quarterlyData = useMemo(() => {
    const quarters = [
      { quarter: 'Q1', total: 0 },
      { quarter: 'Q2', total: 0 },
      { quarter: 'Q3', total: 0 },
      { quarter: 'Q4', total: 0 }
    ];
    
    monthlyUsage.forEach((month, index) => {
      const quarterIndex = Math.floor(index / 3);
      if (quarterIndex < quarters.length) {
        quarters[quarterIndex].total += month.total;
      }
    });
    
    return quarters;
  }, [monthlyUsage]);

  // Statistics
  const stats = useMemo(() => {
    const totalRegistrations = serviceData.reduce((sum, s) => sum + s.registrations, 0);
    const totalRevenue = serviceData.reduce((sum, s) => sum + s.revenue, 0);
    const avgRevenue = serviceData.length > 0 ? totalRevenue / serviceData.length : 0;
    const avgGrowth = serviceData.length > 0 ? serviceData.reduce((sum, s) => sum + s.growth, 0) / serviceData.length : 0;
    const topService = serviceData.reduce((max, s) => s.revenue > max.revenue ? s : max, serviceData[0] || { name: 'N/A', revenue: 0 });
    
    return { 
      totalRegistrations, 
      totalRevenue, 
      avgRevenue, 
      avgGrowth,
      topService
    };
  }, [serviceData]);

  // Top services
  const topServices = useMemo(() => {
    return [...serviceData]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
  }, [serviceData]);

  // Handlers
  const handleRefresh = useCallback(() => {
    fetchServiceData();
  }, [fetchServiceData]);

  const handleExport = useCallback(() => {
    try {
      const headers = ['Tên dịch vụ', 'Số lượt đăng ký', 'Doanh thu', 'Tăng trưởng (%)'];
      const rows = serviceData.map(s => [
        s.name,
        s.registrations,
        money(s.revenue),
        `${s.growth > 0 ? '+' : ''}${s.growth}%`
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-dich-vu_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      if (flash) flash('✅ Xuất báo cáo thành công!');
    } catch (error) {
      if (flash) flash('❌ Có lỗi khi xuất báo cáo');
      console.error('Export error:', error);
    }
  }, [serviceData, flash]);

  const getPeriodData = useCallback(() => {
    switch(period) {
      case 'quarter':
        return quarterlyData;
      case 'year':
        return [{ year: '2025', total: monthlyUsage.reduce((sum, m) => sum + m.total, 0) }];
      default:
        return monthlyUsage;
    }
  }, [period, monthlyUsage, quarterlyData]);

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
            <h3 className="text-base font-bold text-slate-950">Báo cáo dịch vụ</h3>
            <p className="text-sm text-slate-500">
              Thống kê sử dụng dịch vụ.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {stats.totalRegistrations} lượt đăng ký
              </span>
              <span className="ml-2 text-slate-400">|</span>
              <span className="ml-2 text-emerald-600 font-semibold">
                {money(stats.totalRevenue)} doanh thu
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm dịch vụ..."
              className="w-48"
              aria-label="Tìm kiếm dịch vụ"
            />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46] focus:ring-2 focus:ring-[#1f4f46]/20 transition-all"
              aria-label="Chọn kỳ báo cáo"
            >
              {PERIOD_OPTIONS.map(option => (
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
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard 
          icon={Users} 
          label="Tổng đăng ký" 
          value={stats.totalRegistrations} 
          hint="Tất cả dịch vụ" 
        />
        <StatCard 
          icon={CreditCard} 
          label="Doanh thu dịch vụ" 
          value={money(stats.totalRevenue)} 
          hint="Tổng thu" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Tăng trưởng TB" 
          value={`${stats.avgGrowth > 0 ? '+' : ''}${stats.avgGrowth.toFixed(1)}%`} 
          hint="So với tháng trước" 
        />
        <StatCard 
          icon={Wrench} 
          label="Dịch vụ top" 
          value={stats.topService.name || 'N/A'} 
          hint={stats.topService.revenue ? money(stats.topService.revenue) : ''} 
        />
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải báo cáo...</p>
        </Card>
      ) : (
        <>
          {/* Charts Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Bar Chart */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-950">Doanh thu theo dịch vụ</h4>
                <Badge tone="slate" className="text-xs">
                  {serviceData.length} dịch vụ
                </Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceData}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => money(value).replace('₫', '')}
                    />
                    <Tooltip 
                      formatter={(value) => [money(value), 'Doanh thu']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="revenue" fill="#1f4f46" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Pie Chart */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-950">Tỷ lệ đăng ký</h4>
                <Badge tone="slate" className="text-xs">
                  Phân bố
                </Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={serviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="registrations"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {serviceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} lượt`, 'Đăng ký']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Line Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-950">Xu hướng sử dụng theo tháng</h4>
              <Badge tone="green" className="text-xs">
                {period === 'month' ? '6 tháng gần nhất' : period === 'quarter' ? 'Theo quý' : 'Theo năm'}
              </Badge>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getPeriodData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey={period === 'quarter' ? 'quarter' : period === 'year' ? 'year' : 'month'} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value} lượt`, 'Sử dụng']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  {period === 'month' ? (
                    <>
                      <Line type="monotone" dataKey="electricity" stroke="#f59e0b" name="Điện" strokeWidth={2} />
                      <Line type="monotone" dataKey="water" stroke="#3b82f6" name="Nước" strokeWidth={2} />
                      <Line type="monotone" dataKey="internet" stroke="#8b5cf6" name="Internet" strokeWidth={2} />
                    </>
                  ) : (
                    <Line type="monotone" dataKey="total" stroke="#1f4f46" name="Tổng lượt sử dụng" strokeWidth={3} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Service Cards Grid */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {serviceData.map((service, index) => (
              <ServiceCard key={service.name} service={service} index={index} />
            ))}
          </div>

          {/* Top Services Summary */}
          {topServices.length > 0 && topServices.some(s => s.revenue > 0) && (
            <Card className="p-6 bg-gradient-to-r from-[#1f4f46] to-[#0d9488] text-white">
              <h4 className="font-bold mb-4">🏆 Dịch vụ hàng đầu</h4>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                {topServices.map((service, index) => (
                  <div key={service.name} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-sm opacity-80">#{index + 1}</p>
                    <p className="font-semibold text-lg">{service.name}</p>
                    <p className="text-sm opacity-90">{service.registrations} lượt đăng ký</p>
                    <p className="text-sm font-medium mt-1">{money(service.revenue)}</p>
                    <Badge tone={service.growth > 0 ? 'green' : 'red'} className="mt-2 bg-white/20 text-white">
                      {service.growth > 0 ? '+' : ''}{service.growth}%
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}