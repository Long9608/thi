// src/pages/RevenueReport.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Download, RefreshCw, Calendar,
  Filter, Search, FileText, CreditCard,
  DollarSign, BarChart3, PieChart,
  ArrowUp, ArrowDown, ChevronRight,
  Users, Home, Wrench, Car
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart as RePieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money, formatNumber } from '../utils/formatters';
import { invoiceAPI } from '../api';

export default function RevenueReport({ flash }) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState('chart');
  const [invoices, setInvoices] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch real invoice data
  const fetchRevenueData = useCallback(async () => {
    try {
      setLoading(true);
      // Lấy hóa đơn đã thanh toán trong năm
      const res = await invoiceAPI.getAll('2', '', year, 1, 999);
      console.log('📊 Revenue data:', res);
      
      const data = res?.data || [];
      setInvoices(Array.isArray(data) ? data : []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải dữ liệu doanh thu'));
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [year, flash]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  // Tính toán dữ liệu doanh thu theo tháng
  const revenueData = useMemo(() => {
    const monthlyData = {};
    
    // Khởi tạo 12 tháng
    for (let m = 1; m <= 12; m++) {
      monthlyData[m] = { month: `T${m}`, revenue: 0, target: 0 };
    }
    
    // Tổng hợp doanh thu từ invoices
    invoices.forEach(inv => {
      const m = inv.InvoiceMonth;
      if (m && monthlyData[m]) {
        monthlyData[m].revenue += parseFloat(inv.TotalAmount || 0);
      }
    });
    
    // Tính target = 90% của revenue (giả lập)
    const months = Object.values(monthlyData);
    months.forEach(item => {
      item.target = Math.round(item.revenue * 0.9);
      // Chuyển sang triệu VND
      item.revenue = Math.round(item.revenue / 1000000);
      item.target = Math.round(item.target / 1000000);
    });
    
    return months;
  }, [invoices]);

  // Tính doanh thu theo nguồn (từ chi tiết hóa đơn - giả lập)
  const revenueBySource = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + parseFloat(inv.TotalAmount || 0), 0);
    if (total === 0) {
      return [
        { name: 'Tiền thuê', value: 0, color: '#1f4f46' },
        { name: 'Phí dịch vụ', value: 0, color: '#0d9488' },
        { name: 'Phí gửi xe', value: 0, color: '#f59e0b' },
        { name: 'Phí điện/nước', value: 0, color: '#3b82f6' }
      ];
    }
    // Tính tỷ lệ dựa trên dữ liệu thực tế nếu có
    return [
      { name: 'Tiền thuê', value: Math.round(total * 0.65), color: '#1f4f46' },
      { name: 'Phí dịch vụ', value: Math.round(total * 0.20), color: '#0d9488' },
      { name: 'Phí gửi xe', value: Math.round(total * 0.10), color: '#f59e0b' },
      { name: 'Phí điện/nước', value: Math.round(total * 0.05), color: '#3b82f6' }
    ];
  }, [invoices]);

  // Thống kê tháng hiện tại
  const monthlyDetails = useMemo(() => {
    const currentMonthData = revenueData.find(d => {
      const monthNum = parseInt(d.month.replace('T', ''));
      return monthNum === month;
    });
    const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
    const avgRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;
    const prevMonthData = revenueData.find(d => {
      const monthNum = parseInt(d.month.replace('T', ''));
      return monthNum === month - 1;
    });
    
    return {
      total: totalRevenue,
      average: avgRevenue,
      current: currentMonthData?.revenue || 0,
      target: currentMonthData?.target || 0,
      growth: prevMonthData ? currentMonthData?.revenue - prevMonthData.revenue : 0
    };
  }, [revenueData, month]);

  const COLORS = ['#1f4f46', '#0d9488', '#f59e0b', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Báo cáo doanh thu</h3>
            <p className="text-sm text-slate-500">Báo cáo doanh thu chi tiết theo tháng</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="month">Theo tháng</option>
              <option value="quarter">Theo quý</option>
              <option value="year">Theo năm</option>
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={fetchRevenueData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button>
              <Download size={16} /> Xuất báo cáo
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard 
          icon={DollarSign} 
          label="Tổng doanh thu" 
          value={money(monthlyDetails.total * 1000000).replace('₫', '')} 
          hint="12 tháng" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Doanh thu TB" 
          value={money(monthlyDetails.average * 1000000).replace('₫', '')} 
          hint="Mỗi tháng" 
        />
        <StatCard 
          icon={BarChart3} 
          label="Tháng này" 
          value={money(monthlyDetails.current * 1000000).replace('₫', '')} 
          hint={`Mục tiêu: ${money(monthlyDetails.target * 1000000).replace('₫', '')}`}
        />
        <StatCard 
          icon={monthlyDetails.growth >= 0 ? ArrowUp : ArrowDown} 
          label="Tăng trưởng" 
          value={`${monthlyDetails.growth >= 0 ? '+' : ''}${monthlyDetails.growth > 0 ? ((monthlyDetails.growth / (monthlyDetails.current - monthlyDetails.growth)) * 100).toFixed(1) : 0}%`} 
          hint={monthlyDetails.growth >= 0 ? 'Tăng' : 'Giảm'}
        />
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải báo cáo...</p>
        </Card>
      ) : (
        <>
          {/* Revenue Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-950">Biểu đồ doanh thu</h4>
                <p className="text-sm text-slate-500">So sánh doanh thu theo tháng</p>
              </div>
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    viewMode === 'chart' ? 'bg-[#1f4f46] text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                  onClick={() => setViewMode('chart')}
                >
                  Biểu đồ
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    viewMode === 'table' ? 'bg-[#1f4f46] text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                  onClick={() => setViewMode('table')}
                >
                  Bảng
                </button>
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1f4f46" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1f4f46" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value) => money(value * 1000000).replace('₫', '')}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Doanh thu" 
                    stroke="#1f4f46" 
                    strokeWidth={3} 
                    fill="url(#revenueGradient)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="target" 
                    name="Mục tiêu" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Revenue by Source */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <h4 className="font-bold text-slate-950 mb-4">Doanh thu theo nguồn</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={revenueBySource}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {revenueBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => money(value).replace('₫', '')} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {revenueBySource.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-600">{item.name}</span>
                    <span className="text-sm font-bold text-slate-950 ml-auto">
                      {money(item.value).replace('₫', '')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-bold text-slate-950 mb-4">Chi tiết tháng {month}/{year}</h4>
              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Tổng doanh thu</span>
                  <span className="font-bold text-[#1f4f46]">{money(monthlyDetails.current * 1000000)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Mục tiêu</span>
                  <span className="font-bold text-amber-600">{money(monthlyDetails.target * 1000000)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Chênh lệch</span>
                  <span className={`font-bold ${monthlyDetails.current >= monthlyDetails.target ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {monthlyDetails.current >= monthlyDetails.target ? '+' : ''}
                    {money((monthlyDetails.current - monthlyDetails.target) * 1000000).replace('₫', '')}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Tăng trưởng</span>
                  <span className={`font-bold ${monthlyDetails.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {monthlyDetails.growth >= 0 ? '+' : ''}
                    {monthlyDetails.growth > 0 && monthlyDetails.current > 0 
                      ? ((monthlyDetails.growth / (monthlyDetails.current - monthlyDetails.growth)) * 100).toFixed(1) 
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Hiệu suất</span>
                  <span className={`font-bold ${monthlyDetails.current >= monthlyDetails.target ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {monthlyDetails.target > 0 ? ((monthlyDetails.current / monthlyDetails.target) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}