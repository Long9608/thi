// src/pages/DebtReport.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, Download, RefreshCw, Search,
  Filter, FileText, CreditCard, Users,
  Home, Clock, CheckCircle2, X,
  DollarSign, ArrowUp, ArrowDown
} from 'lucide-react';
import { Card, Button, Input, Badge, StatCard } from '../components/UI';
import { formatDate, money, formatNumber } from '../utils/formatters';

export default function DebtReport({ flash }) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dữ liệu mẫu
  const debtData = useMemo(() => {
    return [
      {
        id: 1,
        apartment: 'A-1201',
        owner: 'Nguyễn Minh Anh',
        month: '04/2026',
        totalDebt: 1500000,
        overdue: 30,
        status: 'overdue',
        items: [
          { name: 'Phí dịch vụ', amount: 800000 },
          { name: 'Phí gửi xe', amount: 350000 },
          { name: 'Tiền nước', amount: 350000 }
        ]
      },
      {
        id: 2,
        apartment: 'B-0805',
        owner: 'Trần Quốc Bảo',
        month: '04/2026',
        totalDebt: 0,
        overdue: 0,
        status: 'paid',
        items: []
      },
      {
        id: 3,
        apartment: 'A-0903',
        owner: 'Lê Hoàng Yến',
        month: '03/2026',
        totalDebt: 2500000,
        overdue: 45,
        status: 'overdue',
        items: [
          { name: 'Phí dịch vụ', amount: 1200000 },
          { name: 'Phí gửi xe', amount: 500000 },
          { name: 'Tiền điện', amount: 400000 },
          { name: 'Tiền nước', amount: 400000 }
        ]
      },
      {
        id: 4,
        apartment: 'C-0301',
        owner: 'Phạm Gia Huy',
        month: '04/2026',
        totalDebt: 800000,
        overdue: 15,
        status: 'pending',
        items: [
          { name: 'Phí dịch vụ', amount: 800000 }
        ]
      }
    ];
  }, []);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const filteredData = useMemo(() => {
    let filtered = debtData;
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(d =>
        d.apartment.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    return filtered;
  }, [debtData, search, statusFilter]);

  const stats = useMemo(() => {
    const total = debtData.length;
    const totalDebt = debtData.reduce((sum, d) => sum + d.totalDebt, 0);
    const overdue = debtData.filter(d => d.status === 'overdue').length;
    const pending = debtData.filter(d => d.status === 'pending').length;
    const paid = debtData.filter(d => d.status === 'paid').length;
    return { total, totalDebt, overdue, pending, paid };
  }, [debtData]);

  const getStatusBadge = (status) => {
    const map = {
      'overdue': { tone: 'red', label: 'Quá hạn' },
      'pending': { tone: 'amber', label: 'Chưa thanh toán' },
      'paid': { tone: 'green', label: 'Đã thanh toán' }
    };
    const info = map[status] || { tone: 'slate', label: status };
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
              <option value="overdue">Quá hạn</option>
              <option value="pending">Chưa thanh toán</option>
              <option value="paid">Đã thanh toán</option>
            </select>
            <Button variant="secondary">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button>
              <Download size={16} /> Xuất báo cáo
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={AlertCircle} label="Tổng công nợ" value={money(stats.totalDebt).replace('₫', '')} hint="Tất cả" />
        <StatCard icon={Clock} label="Quá hạn" value={stats.overdue} hint="Cần xử lý gấp" />
        <StatCard icon={CreditCard} label="Chưa thanh toán" value={stats.pending} hint="Chờ thu" />
        <StatCard icon={CheckCircle2} label="Đã thanh toán" value={stats.paid} hint="Hoàn tất" />
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
                {filteredData.map((debt) => (
                  <tr key={debt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-950">{debt.apartment}</td>
                    <td className="px-5 py-4 text-slate-600">{debt.owner}</td>
                    <td className="px-5 py-4 text-slate-600">{debt.month}</td>
                    <td className="px-5 py-4 font-bold text-[#1f4f46]">
                      {money(debt.totalDebt)}
                    </td>
                    <td className="px-5 py-4">
                      {debt.overdue > 0 ? (
                        <span className="text-rose-600 font-semibold">{debt.overdue} ngày</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(debt.status)}</td>
                    <td className="px-5 py-4">
                      {debt.items.length > 0 && (
                        <div className="space-y-1 text-xs">
                          {debt.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span className="text-slate-500">{item.name}</span>
                              <span className="font-medium">{money(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}