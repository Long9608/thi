// src/pages/FeeCollection.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, Plus, Search, RefreshCw, CheckCircle2,
  X, AlertCircle, CreditCard, DollarSign,
  User, Home, Calendar, Clock, Printer,
  Send, FileText, TrendingUp, ArrowUp, ArrowDown
} from 'lucide-react';
import { invoiceAPI, contractAPI, residentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money, getInitials } from '../utils/formatters';

export default function FeeCollection({ flash }) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({
    invoiceId: '',
    methodId: '',
    amount: '',
    transactionCode: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Lấy danh sách hợp đồng đang hiệu lực
      const contractsRes = await contractAPI.getAll('2', 1, 999);
      const contractsData = contractsRes?.data || [];
      setContracts(Array.isArray(contractsData) ? contractsData : []);

      // Lấy danh sách hóa đơn chưa thanh toán
      const invoicesRes = await invoiceAPI.getAll('', '', '', 1, 999);
      const invoicesData = invoicesRes?.data || [];
      const unpaidInvoices = Array.isArray(invoicesData) 
        ? invoicesData.filter(inv => inv.StatusID === 1 || inv.StatusID === 3)
        : [];
      setInvoices(unpaidInvoices);
      setTotalPages(invoicesRes?.pagination?.totalPages || 1);

      // Lấy phương thức thanh toán
      const methodsRes = await invoiceAPI.getPaymentMethods();
      const methodsData = methodsRes?.data || methodsRes || [];
      setPaymentMethods(Array.isArray(methodsData) ? methodsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải dữ liệu'));
    } finally {
      setLoading(false);
    }
  }, [page, flash]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handlePayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await invoiceAPI.processPayment({
        invoiceId: parseInt(form.invoiceId),
        methodId: parseInt(form.methodId),
        amount: parseFloat(form.amount),
        transactionCode: form.transactionCode || null
      });

      if (flash) flash('✅ Thu phí thành công!');
      setModalOpen(false);
      setForm({ invoiceId: '', methodId: '', amount: '', transactionCode: '' });
      fetchData();
    } catch (error) {
      console.error('Payment error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xử lý thanh toán'));
    } finally {
      setProcessing(false);
    }
  };

  const openPaymentModal = (invoice) => {
    setSelectedContract(invoice);
    const paid = invoice.Payments?.filter(p => p.StatusID === 2).reduce((sum, p) => sum + (p.Amount || 0), 0) || 0;
    const remaining = (invoice.TotalAmount || 0) - paid;
    setForm({
      invoiceId: invoice.InvoiceID.toString(),
      methodId: '',
      amount: remaining.toString(),
      transactionCode: ''
    });
    setModalOpen(true);
  };

  const getStatusBadge = (statusId) => {
    const map = {
      1: { tone: 'amber', label: 'Chưa thanh toán' },
      3: { tone: 'red', label: 'Quá hạn' }
    };
    const info = map[statusId] || { tone: 'slate', label: 'Chưa xác định' };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Filter data
  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter(inv =>
      (inv.ApartmentCode || '').toLowerCase().includes(q) ||
      (inv.OwnerName || '').toLowerCase().includes(q) ||
      (inv.ContractNumber || '').toLowerCase().includes(q)
    );
  }, [invoices, search]);

  // Stats
  const stats = useMemo(() => {
    const total = invoices.length;
    const totalUnpaid = invoices.reduce((sum, inv) => {
      const paid = inv.Payments?.filter(p => p.StatusID === 2).reduce((s, p) => s + (p.Amount || 0), 0) || 0;
      return sum + ((inv.TotalAmount || 0) - paid);
    }, 0);
    const overdue = invoices.filter(inv => inv.DueDate && new Date(inv.DueDate) < new Date()).length;
    const overdueAmount = invoices
      .filter(inv => inv.DueDate && new Date(inv.DueDate) < new Date())
      .reduce((sum, inv) => {
        const paid = inv.Payments?.filter(p => p.StatusID === 2).reduce((s, p) => s + (p.Amount || 0), 0) || 0;
        return sum + ((inv.TotalAmount || 0) - paid);
      }, 0);
    return { total, totalUnpaid, overdue, overdueAmount };
  }, [invoices]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Thu phí</h3>
            <p className="text-sm text-slate-500">
              Thu phí dịch vụ từ cư dân.
              <span className="ml-2 text-rose-600 font-semibold">
                {money(stats.totalUnpaid)} chưa thu
              </span>
              <span className="ml-2 text-amber-600 font-semibold">
                {stats.overdue} hóa đơn quá hạn
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
            <Button variant="secondary" onClick={fetchData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={FileText} label="Hóa đơn chưa thu" value={stats.total} hint="Cần xử lý" />
        <StatCard icon={DollarSign} label="Tổng công nợ" value={money(stats.totalUnpaid).replace('₫', '')} hint="Cần thu hồi" />
        <StatCard icon={Clock} label="Quá hạn" value={stats.overdue} hint={`${money(stats.overdueAmount)}`} />
        <StatCard icon={Wallet} label="Thu trong tháng" value={money(0).replace('₫', '')} hint="Đã thu" />
      </div>

      {/* Invoice List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách...</p>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 size={48} className="text-emerald-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Tất cả hóa đơn đã được thanh toán</h3>
          <p className="text-sm text-slate-500">Không có hóa đơn nào chưa thu</p>
          <Button variant="secondary" className="mt-4" onClick={fetchData}>
            <RefreshCw size={16} /> Làm mới
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredInvoices.map((invoice) => {
            const paid = invoice.Payments?.filter(p => p.StatusID === 2).reduce((sum, p) => sum + (p.Amount || 0), 0) || 0;
            const remaining = (invoice.TotalAmount || 0) - paid;
            const daysOverdue = getDaysOverdue(invoice.DueDate);
            const isOverdue = daysOverdue > 0;

            return (
              <Card 
                key={invoice.InvoiceID} 
                className={`group hover:border-[#1f4f46]/30 transition-all ${
                  isOverdue ? 'border-rose-200 bg-rose-50/30' : ''
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(invoice.StatusID)}
                        {isOverdue && (
                          <Badge tone="red">Quá hạn {daysOverdue} ngày</Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                        {invoice.ApartmentCode}
                      </h3>
                      <p className="text-sm text-slate-500">{invoice.OwnerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#1f4f46]">
                        {money(remaining)}
                      </p>
                      <p className="text-xs text-slate-400">
                        Tổng: {money(invoice.TotalAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Hợp đồng</span>
                      <span className="font-medium text-slate-950">{invoice.ContractNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Kỳ</span>
                      <span className="text-slate-700">{invoice.InvoiceMonth}/{invoice.InvoiceYear}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Hạn thanh toán</span>
                      <span className={isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                        {formatDate(invoice.DueDate)}
                      </span>
                    </div>
                    {paid > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Đã thanh toán</span>
                        <span className="font-semibold text-emerald-600">{money(paid)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1" onClick={() => openPaymentModal(invoice)}>
                      <Wallet size={14} /> Thu phí
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => flash('📄 Đang tạo hóa đơn...')}>
                      <Printer size={14} /> Hóa đơn
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
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

      {/* Payment Modal */}
      <Modal
        open={modalOpen}
        title="Thu phí"
        description={`Thu phí cho căn hộ ${selectedContract?.ApartmentCode || ''}`}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handlePayment} className="space-y-4">
          {selectedContract && (
            <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Căn hộ</span>
                <span className="font-bold text-slate-950">{selectedContract.ApartmentCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chủ hộ</span>
                <span className="font-bold text-slate-950">{selectedContract.OwnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hợp đồng</span>
                <span className="font-bold text-slate-950">{selectedContract.ContractNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kỳ</span>
                <span className="text-slate-700">{selectedContract.InvoiceMonth}/{selectedContract.InvoiceYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng hóa đơn</span>
                <span className="font-bold text-[#1f4f46]">{money(selectedContract.TotalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Còn lại</span>
                <span className="font-bold text-[#1f4f46]">{money(form.amount || 0)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Phương thức thanh toán *</label>
            <select
              value={form.methodId}
              onChange={(e) => setForm({ ...form, methodId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
              required
            >
              <option value="">Chọn phương thức</option>
              {paymentMethods.map(m => (
                <option key={m.MethodID} value={m.MethodID}>{m.MethodName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Số tiền thu *</label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Nhập số tiền"
              required
              min="0"
              step="1000"
            />
            <p className="mt-1 text-xs text-slate-500">Số tiền còn lại: {money(form.amount || 0)}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Mã giao dịch (tùy chọn)</label>
            <Input
              value={form.transactionCode}
              onChange={(e) => setForm({ ...form, transactionCode: e.target.value })}
              placeholder="Nhập mã giao dịch"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={processing}>
              {processing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Xác nhận thu phí
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}