// src/pages/DebtReport.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, Download, RefreshCw, Search,
  Filter, FileText, CreditCard, Users,
  Home, Clock, CheckCircle2, X,
  DollarSign, ArrowUp, ArrowDown
} from 'lucide-react';
import { Card, Button, Input, Badge, StatCard } from '../components/UI';
import { formatDate, money, formatNumber } from '../utils/formatters';
import { invoiceAPI } from '../api';

export default function DebtReport({ flash }) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statuses, setStatuses] = useState([]);

  // Fetch real data
  const fetchDebtData = useCallback(async () => {
    try {
      setLoading(true);
      // Lấy hóa đơn chưa thanh toán và quá hạn
      const res = await invoiceAPI.getAll(statusFilter, '', '', page, 999);
      console.log('📊 Debt report data:', res);
      
      if (res && res.data) {
        const data = Array.isArray(res.data) ? res.data : [];
        // Lọc hóa đơn chưa thanh toán hoặc quá hạn
        const debtInvoices = data.filter(inv => inv.StatusID === 1 || inv.StatusID === 3);
        setInvoices(debtInvoices);
        setTotalPages(res.pagination?.totalPages || 1);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching debt data:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải dữ liệu công nợ'));
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, flash]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await invoiceAPI.getStatuses();
      const data = res?.data || res || [];
      setStatuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  }, []);

  useEffect(() => {
    fetchDebtData();
    fetchStatuses();
  }, [fetchDebtData, fetchStatuses]);

  const filteredData = useMemo(() => {
    let filtered = invoices;
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(d =>
        (d.ApartmentCode || '').toLowerCase().includes(q) ||
        (d.OwnerName || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [invoices, search]);

  const stats = useMemo(() => {
    const total = invoices.length;
    const totalDebt = invoices.reduce((sum, d) => {
      const paid = d.PaidAmount || 0;
      return sum + ((d.TotalAmount || 0) - paid);
    }, 0);
    const overdue = invoices.filter(d => d.StatusID === 3).length;
    const pending = invoices.filter(d => d.StatusID === 1).length;
    return { total, totalDebt, overdue, pending };
  }, [invoices]);

  const getStatusBadge = (statusId) => {
    const map = {
      1: { tone: 'amber', label: 'Chưa thanh toán' },
      3: { tone: 'red', label: 'Quá hạn' },
      2: { tone: 'green', label: 'Đã thanh toán' },
      4: { tone: 'slate', label: 'Đã hủy' }
    };
    const info = map[statusId] || { tone: 'slate', label: 'Chưa xác định' };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Báo cáo công nợ</h3>
            <p className="text-sm text-slate-500">
              Theo dõi công nợ của cư dân.
              <span className="ml-2 text-rose-600 font-semibold">
                {money(stats.totalDebt)} tổng công nợ
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm căn hộ, chủ hộ..."
              className="w-48"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả trạng thái</option>
              {statuses.map(s => (
                <option key={s.StatusID} value={s.StatusID}>{s.StatusName}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={fetchDebtData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={() => flash('📊 Đang xuất báo cáo...')}>
              <Download size={16} /> Xuất báo cáo
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={AlertCircle} label="Tổng công nợ" value={money(stats.totalDebt).replace('₫', '')} hint="Tất cả" />
        <StatCard icon={Clock} label="Quá hạn" value={stats.overdue} hint="Cần xử lý gấp" />
        <StatCard icon={CreditCard} label="Chưa thanh toán" value={stats.pending} hint="Chờ thu" />
        <StatCard icon={CheckCircle2} label="Đã thanh toán" value={invoices.filter(d => d.StatusID === 2).length} hint="Hoàn tất" />
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải báo cáo...</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Căn hộ</th>
                  <th className="px-5 py-3">Chủ hộ</th>
                  <th className="px-5 py-3">Kỳ</th>
                  <th className="px-5 py-3">Số tiền</th>
                  <th className="px-5 py-3">Quá hạn</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredData.map((debt) => {
                  const paid = debt.PaidAmount || 0;
                  const remaining = (debt.TotalAmount || 0) - paid;
                  const daysOverdue = debt.DueDate && new Date(debt.DueDate) < new Date() 
                    ? Math.ceil((new Date() - new Date(debt.DueDate)) / (1000 * 60 * 60 * 24))
                    : 0;
                  
                  return (
                    <tr key={debt.InvoiceID} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-950">{debt.ApartmentCode}</td>
                      <td className="px-5 py-4 text-slate-600">{debt.OwnerName}</td>
                      <td className="px-5 py-4 text-slate-600">{debt.InvoiceMonth}/{debt.InvoiceYear}</td>
                      <td className="px-5 py-4 font-bold text-[#1f4f46]">
                        {money(remaining)}
                      </td>
                      <td className="px-5 py-4">
                        {daysOverdue > 0 ? (
                          <span className="text-rose-600 font-semibold">{daysOverdue} ngày</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(debt.StatusID)}</td>
                      <td className="px-5 py-4">
                        <Button variant="secondary" size="sm">Xem chi tiết</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}