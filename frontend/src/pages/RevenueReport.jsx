// src/pages/RevenueReport.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Download, RefreshCw, Calendar,
  Filter, Search, FileText, CreditCard,
  DollarSign, BarChart3, PieChart,
  ArrowUp, ArrowDown, ChevronRight,
  Users, Home, Wrench, Car, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart as RePieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money, formatNumber } from '../utils/formatters';
import { invoiceAPI, contractAPI } from '../api';

// Màu sắc cho biểu đồ
const COLORS = ['#1f4f46', '#0d9488', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function RevenueReport({ flash }) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState('chart');
  const [invoices, setInvoices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);

  // Fetch data
  const fetchRevenueData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching revenue data...');
      
      // Lấy tất cả hóa đơn đã thanh toán
      const invoiceRes = await invoiceAPI.getAll('2', '', '', 1, 999);
      console.log('📊 Invoices response:', invoiceRes);
      
      // Lấy tất cả hợp đồng đang hiệu lực
      const contractRes = await contractAPI.getAll('2', 1, 999);
      console.log('📊 Contracts response:', contractRes);
      
      if (invoiceRes && invoiceRes.success !== false) {
        const data = invoiceRes?.data || [];
        console.log('📊 Number of paid invoices:', data.length);
        setInvoices(Array.isArray(data) ? data : []);
        setTotalPages(invoiceRes.pagination?.totalPages || 1);
      } else {
        setInvoices([]);
      }
      
      if (contractRes && contractRes.success !== false) {
        const data = contractRes?.data || [];
        console.log('📊 Number of active contracts:', data.length);
        setContracts(Array.isArray(data) ? data : []);
      } else {
        setContracts([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching revenue data:', error);
      setError(error.message || 'Không thể tải dữ liệu doanh thu');
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải dữ liệu doanh thu'));
      setInvoices([]);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  // 🔥 TÍNH DOANH THU TỪ HÓA ĐƠN ĐÃ THANH TOÁN (THEO THÁNG)
  const paidRevenueData = useMemo(() => {
    const monthlyData = {};
    
    // Khởi tạo 12 tháng với 0
    for (let m = 1; m <= 12; m++) {
      monthlyData[m] = { 
        month: `Tháng ${m}`, 
        paid: 0,
        contract: 0,
        total: 0 
      };
    }
    
    // Tổng hợp doanh thu từ invoices đã thanh toán
    invoices.forEach(inv => {
      const m = inv.InvoiceMonth;
      const amount = parseFloat(inv.TotalAmount) || 0;
      console.log(`📊 Invoice: Month ${m}, Amount: ${amount}`);
      if (m && monthlyData[m]) {
        monthlyData[m].paid += amount;
        monthlyData[m].total += amount;
      }
    });
    
    console.log('📊 Paid revenue by month:', monthlyData);
    return monthlyData;
  }, [invoices]);

  // 🔥 TÍNH DOANH THU TỪ HỢP ĐỒNG (THEO THÁNG)
  const contractRevenueData = useMemo(() => {
    const monthlyData = {};
    
    // Khởi tạo 12 tháng với 0
    for (let m = 1; m <= 12; m++) {
      monthlyData[m] = { 
        month: `Tháng ${m}`, 
        paid: 0,
        contract: 0,
        total: 0 
      };
    }
    
    // Lấy tất cả hợp đồng đang hiệu lực
    contracts.forEach(contract => {
      const rentAmount = parseFloat(contract.Rent) || 0;
      console.log(`📊 Contract: ${contract.ContractNumber}, Rent: ${rentAmount}`);
      
      // Lấy tháng bắt đầu và tháng kết thúc
      const startDate = new Date(contract.StartDate);
      const endDate = new Date(contract.EndDate);
      const startMonth = startDate.getMonth() + 1;
      const startYear = startDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;
      const endYear = endDate.getFullYear();
      
      // Tính số tháng hợp đồng
      const monthsDiff = (endYear - startYear) * 12 + (endMonth - startMonth);
      
      // Phân bổ doanh thu theo từng tháng, chỉ tính đến tháng 8 (tháng hiện tại)
      const currentMonth = 8;
      
      for (let i = 0; i <= monthsDiff; i++) {
        let targetMonth = startMonth + i;
        let targetYear = startYear;
        if (targetMonth > 12) {
          targetMonth = targetMonth - 12;
          targetYear = targetYear + 1;
        }
        
        // Chỉ tính từ tháng 1 đến tháng 8
        if (targetYear === year && targetMonth <= currentMonth) {
          if (monthlyData[targetMonth]) {
            monthlyData[targetMonth].contract += rentAmount;
            monthlyData[targetMonth].total += rentAmount;
          }
        }
      }
    });
    
    console.log('📊 Contract revenue by month:', monthlyData);
    return monthlyData;
  }, [contracts, year]);

  // 🔥 KẾT HỢP DỮ LIỆU - CHỈ LẤY TỪ THÁNG 1 ĐẾN 8
  const combinedRevenueData = useMemo(() => {
    const result = [];
    let totalRevenue = 0;
    
    // Chỉ hiển thị từ tháng 1 đến tháng 8 (tháng hiện tại)
    const currentMonth = 8;
    
    for (let m = 1; m <= currentMonth; m++) {
      const paid = paidRevenueData[m]?.paid || 0;
      const contract = contractRevenueData[m]?.contract || 0;
      const total = paid + contract;
      
      totalRevenue += total;
      
      result.push({
        month: `T${m}`,
        monthLabel: `Tháng ${m}`,
        monthNumber: m,
        paid: paid,
        contract: contract,
        total: total
      });
    }
    
    console.log('📊 Combined revenue data:', result);
    console.log('📊 Total revenue:', totalRevenue);
    return result;
  }, [paidRevenueData, contractRevenueData]);

  // 🔥 TÍNH DOANH THU THEO NGUỒN (TỔNG HỢP)
  const revenueBySource = useMemo(() => {
    const totalPaid = invoices.reduce((sum, inv) => sum + (parseFloat(inv.TotalAmount) || 0), 0);
    const totalContract = contracts.reduce((sum, c) => sum + (parseFloat(c.Rent) || 0), 0);
    
    console.log('📊 Revenue sources:', { totalPaid, totalContract });
    
    if (totalPaid === 0 && totalContract === 0) {
      return [
        { name: 'Hóa đơn', value: 0, color: '#1f4f46' },
        { name: 'Hợp đồng', value: 0, color: '#0d9488' }
      ];
    }
    
    return [
      { name: 'Từ hóa đơn', value: Math.round(totalPaid), color: '#1f4f46' },
      { name: 'Từ hợp đồng', value: Math.round(totalContract), color: '#0d9488' }
    ];
  }, [invoices, contracts]);

  // 🔥 TÍNH TỔNG DOANH THU TỪ TẤT CẢ HỢP ĐỒNG
  const totalContractRevenue = useMemo(() => {
    return contracts.reduce((sum, c) => sum + (parseFloat(c.Rent) || 0), 0);
  }, [contracts]);

  // 🔥 THỐNG KÊ TỔNG QUAN
  const monthlyDetails = useMemo(() => {
    // Lấy dữ liệu tháng hiện tại
    const currentMonthData = combinedRevenueData.find(d => d.monthNumber === month);
    const currentMonthTotal = currentMonthData?.total || 0;
    const currentMonthPaid = currentMonthData?.paid || 0;
    const currentMonthContract = currentMonthData?.contract || 0;
    
    // Tổng doanh thu tất cả tháng
    const totalRevenue = combinedRevenueData.reduce((sum, d) => sum + d.total, 0);
    
    // Doanh thu trung bình
    const avgRevenue = combinedRevenueData.filter(d => d.total > 0).length > 0 
      ? totalRevenue / combinedRevenueData.filter(d => d.total > 0).length 
      : 0;
    
    // 🔥 TÍNH TĂNG TRƯỞNG CHÍNH XÁC
    // Lấy dữ liệu tháng trước
    const prevMonthData = combinedRevenueData.find(d => d.monthNumber === month - 1);
    const prevMonthTotal = prevMonthData?.total || 0;
    
    // Lấy dữ liệu tháng 1 để so sánh tăng trưởng tổng thể
    const firstMonthData = combinedRevenueData.find(d => d.monthNumber === 1);
    const firstMonthTotal = firstMonthData?.total || 0;
    
    let growth = 0;
    let totalGrowth = 0;
    
    // Tăng trưởng so với tháng trước
    if (prevMonthTotal > 0) {
      growth = ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
    } else if (currentMonthTotal > 0 && prevMonthTotal === 0) {
      growth = 100; // Nếu tháng trước không có doanh thu
    }
    
    // Tăng trưởng tổng thể so với tháng 1
    if (firstMonthTotal > 0 && totalRevenue > 0) {
      totalGrowth = ((totalRevenue - firstMonthTotal) / firstMonthTotal) * 100;
    } else if (totalRevenue > 0 && firstMonthTotal === 0) {
      totalGrowth = 100;
    }
    
    console.log('📊 Growth calculation:', {
      currentMonthTotal,
      prevMonthTotal,
      growth,
      totalGrowth,
      firstMonthTotal,
      totalRevenue
    });
    
    return {
      total: totalRevenue,
      totalContract: totalContractRevenue,
      average: avgRevenue,
      current: currentMonthTotal,
      paid: currentMonthPaid,
      contract: currentMonthContract,
      growth: growth,
      totalGrowth: totalGrowth,
      invoiceCount: invoices.length,
      contractCount: contracts.length,
      prevMonthTotal: prevMonthTotal,
      firstMonthTotal: firstMonthTotal
    };
  }, [combinedRevenueData, invoices, contracts, month, totalContractRevenue]);

  // 🔥 Hàm refresh
  const handleRefresh = useCallback(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  // 🔥 Hàm export
  const handleExport = useCallback(() => {
    try {
      const headers = ['Tháng', 'Từ hóa đơn (VND)', 'Từ hợp đồng (VND)', 'Tổng (VND)'];
      const rows = combinedRevenueData.map(d => [
        d.monthLabel,
        d.paid,
        d.contract,
        d.total
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-doanh-thu_${year}_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      if (flash) flash('✅ Xuất báo cáo thành công!');
    } catch (error) {
      console.error('Export error:', error);
      if (flash) flash('❌ Có lỗi khi xuất báo cáo');
    }
  }, [combinedRevenueData, year, flash]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải báo cáo...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Báo cáo doanh thu</h3>
            <p className="text-sm text-slate-500">
              Báo cáo doanh thu từ hóa đơn và hợp đồng.
              {invoices.length + contracts.length === 0 && (
                <span className="ml-2 text-amber-600 font-semibold">⚠️ Chưa có dữ liệu</span>
              )}
              {invoices.length + contracts.length > 0 && (
                <span className="ml-2 text-[#1f4f46] font-semibold">
                  {invoices.length} hóa đơn + {contracts.length} hợp đồng
                </span>
              )}
            </p>
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
            <Button variant="secondary" onClick={handleRefresh} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={handleExport} disabled={invoices.length === 0 && contracts.length === 0}>
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
          value={money(monthlyDetails.total).replace('₫', '')} 
          hint={`${invoices.length + contracts.length} nguồn`}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Doanh thu TB" 
          value={money(monthlyDetails.average).replace('₫', '')} 
          hint="Mỗi tháng có dữ liệu" 
        />
        <StatCard 
          icon={BarChart3} 
          label={`Tháng ${month}`} 
          value={money(monthlyDetails.current).replace('₫', '')} 
          hint={`HĐ: ${money(monthlyDetails.paid).replace('₫', '')} | Hợp đồng: ${money(monthlyDetails.contract).replace('₫', '')}`}
        />
        <StatCard 
          icon={monthlyDetails.growth >= 0 ? ArrowUp : ArrowDown} 
          label="Tăng trưởng" 
          value={`${monthlyDetails.growth >= 0 ? '+' : ''}${monthlyDetails.growth.toFixed(1)}%`} 
          hint={monthlyDetails.growth >= 0 ? 'Tăng' : 'Giảm'}
        />
      </div>

      {/* Revenue Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-bold text-slate-950">Biểu đồ doanh thu</h4>
            <p className="text-sm text-slate-500">So sánh doanh thu từ hóa đơn và hợp đồng (Tháng 1 - 8)</p>
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

        {combinedRevenueData.every(d => d.total === 0) ? (
          <div className="h-80 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-600">Chưa có dữ liệu doanh thu</p>
              <p className="text-sm text-slate-400">Vui lòng tạo hóa đơn hoặc hợp đồng để có dữ liệu</p>
            </div>
          </div>
        ) : viewMode === 'chart' ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedRevenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value) => money(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Bar dataKey="paid" name="Từ hóa đơn" fill="#1f4f46" radius={[4, 4, 0, 0]} />
                <Bar dataKey="contract" name="Từ hợp đồng" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Tháng</th>
                  <th className="px-4 py-2 text-right">Từ hóa đơn</th>
                  <th className="px-4 py-2 text-right">Từ hợp đồng</th>
                  <th className="px-4 py-2 text-right">Tổng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinedRevenueData.map((item) => (
                  <tr key={item.month} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">{item.monthLabel}</td>
                    <td className="px-4 py-2 text-right text-[#1f4f46]">
                      {item.paid > 0 ? money(item.paid) : '0'}
                    </td>
                    <td className="px-4 py-2 text-right text-[#0d9488]">
                      {item.contract > 0 ? money(item.contract) : '0'}
                    </td>
                    <td className="px-4 py-2 text-right font-bold">
                      {item.total > 0 ? money(item.total) : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Revenue by Source */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h4 className="font-bold text-slate-950 mb-4">Doanh thu theo nguồn</h4>
          {invoices.length === 0 && contracts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <PieChart size={48} className="mx-auto mb-3 text-slate-300" />
                <p>Chưa có dữ liệu</p>
              </div>
            </div>
          ) : (
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
                  <Tooltip 
                    formatter={(value) => [money(value), 'Doanh thu']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h4 className="font-bold text-slate-950 mb-4">Chi tiết tháng {month}/{year}</h4>
          <div className="space-y-3">
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Tổng doanh thu</span>
              <span className="font-bold text-[#1f4f46]">{money(monthlyDetails.total)}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Từ hóa đơn</span>
              <span className="font-bold text-[#1f4f46]">{money(monthlyDetails.paid)}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Từ hợp đồng</span>
              <span className="font-bold text-[#0d9488]">{money(monthlyDetails.contract)}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Tăng trưởng so với tháng trước</span>
              <span className={`font-bold ${monthlyDetails.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {monthlyDetails.growth >= 0 ? '+' : ''}{monthlyDetails.growth.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Số hóa đơn</span>
              <span className="font-bold text-slate-950">{monthlyDetails.invoiceCount}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Số hợp đồng</span>
              <span className="font-bold text-slate-950">{monthlyDetails.contractCount}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}