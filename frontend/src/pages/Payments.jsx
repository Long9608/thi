// src/pages/Payments.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Plus, Search, Eye, RefreshCw,
  CheckCircle2, X, AlertCircle, Calendar,
  Filter, Download, Printer, DollarSign,
  Wallet, Banknote, QrCode, Smartphone,
  TrendingUp, Clock, User, Home
} from 'lucide-react';
import { invoiceAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, formatDateTime, money, getInitials } from '../utils/formatters';

export default function Payments({ flash }) {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentStatuses, setPaymentStatuses] = useState([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    methodId: '',
    amount: '',
    transactionCode: ''
  });
  const [processing, setProcessing] = useState(false);

  // Fetch data
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await invoiceAPI.getAll('', '', '', page, 999);
      console.log('📊 Payments (invoices with payments):', res);

      if (res && res.data) {
        const data = Array.isArray(res.data) ? res.data : [];
        // Chỉ lấy hóa đơn có thanh toán
        const withPayments = data.filter(inv => inv.Payments && inv.Payments.length > 0);
        setInvoices(withPayments);
        // Flatten payments
        const allPayments = [];
        withPayments.forEach(inv => {
          inv.Payments.forEach(p => {
            allPayments.push({
              ...p,
              InvoiceID: inv.InvoiceID,
              ApartmentCode: inv.ApartmentCode,
              OwnerName: inv.OwnerName,
              ContractNumber: inv.ContractNumber,
              InvoiceMonth: inv.InvoiceMonth,
              InvoiceYear: inv.InvoiceYear
            });
          });
        });
        setPayments(allPayments);
        setTotalPages(res.pagination?.totalPages || 1);
      } else {
        setPayments([]);
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách thanh toán'));
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [page, flash]);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await invoiceAPI.getPaymentMethods();
      const data = res?.data || res || [];
      setPaymentMethods(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  }, []);

  const fetchPaymentStatuses = useCallback(async () => {
    try {
      const res = await invoiceAPI.getStatuses();
      const data = res?.data || res || [];
      setPaymentStatuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching payment statuses:', error);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchPaymentMethods();
    fetchPaymentStatuses();
  }, [fetchPayments, fetchPaymentMethods, fetchPaymentStatuses]);

  // Handlers
  const handlePayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await invoiceAPI.processPayment({
        invoiceId: parseInt(paymentForm.invoiceId),
        methodId: parseInt(paymentForm.methodId),
        amount: parseFloat(paymentForm.amount),
        transactionCode: paymentForm.transactionCode || null
      });

      if (flash) flash('✅ Thanh toán thành công!');
      setPaymentModalOpen(false);
      setPaymentForm({ invoiceId: '', methodId: '', amount: '', transactionCode: '' });
      fetchPayments();
    } catch (error) {
      console.error('Payment error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xử lý thanh toán'));
    } finally {
      setProcessing(false);
    }
  };

  const openViewModal = (payment) => {
    setSelectedPayment(payment);
    setModalMode('view');
    setModalOpen(true);
  };

  const openPaymentModal = () => {
    // Reset form and get unpaid invoices
    setPaymentForm({ invoiceId: '', methodId: '', amount: '', transactionCode: '' });
    setPaymentModalOpen(true);
  };

  const getMethodIcon = (methodName) => {
    if (!methodName) return <Wallet size={16} className="text-slate-400" />;
    const name = methodName.toLowerCase();
    if (name.includes('chuyển khoản') || name.includes('ngân hàng')) return <Banknote size={16} className="text-blue-600" />;
    if (name.includes('momo') || name.includes('zalopay') || name.includes('ví')) return <Smartphone size={16} className="text-purple-600" />;
    if (name.includes('qr')) return <QrCode size={16} className="text-emerald-600" />;
    if (name.includes('tiền mặt')) return <Wallet size={16} className="text-amber-600" />;
    return <Wallet size={16} className="text-slate-400" />;
  };

  const getStatusBadge = (statusId) => {
    const map = {
      1: { tone: 'amber', label: 'Chờ xử lý' },
      2: { tone: 'green', label: 'Thành công' },
      3: { tone: 'red', label: 'Thất bại' }
    };
    const info = map[statusId] || { tone: 'slate', label: 'Chưa xác định' };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  const getMethodBadge = (methodName) => {
    if (!methodName) return <Badge tone="slate">Chưa xác định</Badge>;
    const name = methodName.toLowerCase();
    if (name.includes('chuyển khoản') || name.includes('ngân hàng')) return <Badge tone="blue">Chuyển khoản</Badge>;
    if (name.includes('momo') || name.includes('zalopay')) return <Badge tone="purple">Ví điện tử</Badge>;
    if (name.includes('qr')) return <Badge tone="emerald">QR Code</Badge>;
    if (name.includes('tiền mặt')) return <Badge tone="amber">Tiền mặt</Badge>;
    return <Badge tone="slate">{methodName}</Badge>;
  };

  // Filtered data
  const filteredPayments = useMemo(() => {
    let filtered = payments;
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        (p.ApartmentCode || '').toLowerCase().includes(q) ||
        (p.OwnerName || '').toLowerCase().includes(q) ||
        (p.TransactionCode || '').toLowerCase().includes(q)
      );
    }

    if (methodFilter) {
      const method = paymentMethods.find(m => m.MethodID === parseInt(methodFilter));
      filtered = filtered.filter(p => 
        p.PaymentMethod === method?.MethodName
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(p => p.StatusID === parseInt(statusFilter));
    }

    return filtered;
  }, [payments, search, methodFilter, statusFilter, paymentMethods]);

  // Stats
  const stats = useMemo(() => {
    const total = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + (p.Amount || 0), 0);
    const success = payments.filter(p => p.StatusID === 2).length;
    const pending = payments.filter(p => p.StatusID === 1).length;
    const failed = payments.filter(p => p.StatusID === 3).length;
    const successAmount = payments.filter(p => p.StatusID === 2).reduce((sum, p) => sum + (p.Amount || 0), 0);
    return { total, totalAmount, success, pending, failed, successAmount };
  }, [payments]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Thanh toán</h3>
            <p className="text-sm text-slate-500">
              Quản lý lịch sử thanh toán.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {stats.total} giao dịch
              </span>
              <span className="ml-2 text-emerald-600 font-semibold">
                {money(stats.successAmount)} đã thanh toán
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm thanh toán..."
              className="w-48"
            />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả phương thức</option>
              {paymentMethods.map(m => (
                <option key={m.MethodID} value={m.MethodID}>{m.MethodName}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="2">Thành công</option>
              <option value="1">Chờ xử lý</option>
              <option value="3">Thất bại</option>
            </select>
            <Button onClick={openPaymentModal}>
              <Plus size={16} /> Thu phí
            </Button>
            <Button variant="secondary" onClick={fetchPayments} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={CreditCard} label="Tổng giao dịch" value={stats.total} hint="Đã thực hiện" />
        <StatCard icon={DollarSign} label="Tổng tiền" value={money(stats.totalAmount).replace('₫', '')} hint="Tất cả giao dịch" />
        <StatCard icon={CheckCircle2} label="Thành công" value={stats.success} hint={`${money(stats.successAmount)}`} />
        <StatCard icon={Clock} label="Chờ xử lý" value={stats.pending} hint="Cần kiểm tra" />
        <StatCard icon={X} label="Thất bại" value={stats.failed} hint="Cần xử lý lại" />
      </div>

      {/* Payment List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách thanh toán...</p>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có thanh toán</h3>
          <p className="text-sm text-slate-500">Nhấn "Thu phí" để tạo thanh toán mới</p>
          <Button className="mt-4" onClick={openPaymentModal}>
            <Plus size={16} /> Thu phí
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPayments.map((payment, index) => (
            <Card key={payment.PaymentID || index} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getMethodIcon(payment.PaymentMethod)}
                      {getMethodBadge(payment.PaymentMethod)}
                      {getStatusBadge(payment.StatusID)}
                    </div>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                      {payment.ApartmentCode || 'Chưa xác định'}
                    </h3>
                    <p className="text-sm text-slate-500">{payment.OwnerName || 'Chưa có chủ hộ'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#1f4f46]">
                      {money(payment.Amount || 0)}
                    </p>
                    <p className="text-xs text-slate-400">{payment.PaymentMethod || 'Chưa xác định'}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Hóa đơn</span>
                    <span className="font-medium text-slate-950">{payment.ContractNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Thời gian</span>
                    <span className="text-slate-700">{formatDateTime(payment.PaymentDate)}</span>
                  </div>
                  {payment.TransactionCode && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Mã giao dịch</span>
                      <span className="font-medium text-slate-950 text-xs">{payment.TransactionCode}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Kỳ</span>
                    <span className="text-slate-700">{payment.InvoiceMonth}/{payment.InvoiceYear}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openViewModal(payment)}>
                    <Eye size={14} /> Xem
                  </Button>
                  {payment.StatusID === 2 && (
                    <Button variant="secondary" className="flex-1" onClick={() => flash('📄 Đang tạo hóa đơn...')}>
                      <Printer size={14} /> In
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
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

      {/* View Modal */}
      <Modal
        open={modalOpen}
        title="Chi tiết thanh toán"
        description="Xem thông tin chi tiết thanh toán"
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-950">
                  {selectedPayment.ContractNumber}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedPayment.ApartmentCode} - {selectedPayment.OwnerName}
                </p>
              </div>
              {getStatusBadge(selectedPayment.StatusID)}
            </div>

            <div className="rounded-xl bg-[#eef5f2] p-6 text-center">
              <p className="text-sm text-slate-500">Số tiền thanh toán</p>
              <p className="text-3xl font-black text-[#1f4f46]">{money(selectedPayment.Amount || 0)}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin thanh toán</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Phương thức:</span> {selectedPayment.PaymentMethod || 'Chưa xác định'}</div>
                  <div><span className="text-slate-500">Mã giao dịch:</span> <span className="font-medium">{selectedPayment.TransactionCode || 'N/A'}</span></div>
                  <div><span className="text-slate-500">Thời gian:</span> {formatDateTime(selectedPayment.PaymentDate)}</div>
                  <div><span className="text-slate-500">Trạng thái:</span> {getStatusBadge(selectedPayment.StatusID)}</div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin hóa đơn</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Căn hộ:</span> {selectedPayment.ApartmentCode}</div>
                  <div><span className="text-slate-500">Chủ hộ:</span> {selectedPayment.OwnerName}</div>
                  <div><span className="text-slate-500">Kỳ:</span> {selectedPayment.InvoiceMonth}/{selectedPayment.InvoiceYear}</div>
                  <div><span className="text-slate-500">Hợp đồng:</span> {selectedPayment.ContractNumber}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal
        open={paymentModalOpen}
        title="Thu phí"
        description="Tạo thanh toán mới"
        onClose={() => setPaymentModalOpen(false)}
      >
        <form onSubmit={handlePayment} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Hóa đơn *</label>
            <select
              value={paymentForm.invoiceId}
              onChange={(e) => {
                const invoiceId = e.target.value;
                setPaymentForm({ ...paymentForm, invoiceId });
                // Auto fill amount from invoice
                const invoice = invoices.find(inv => inv.InvoiceID === parseInt(invoiceId));
                if (invoice) {
                  const paid = invoice.Payments?.filter(p => p.StatusID === 2).reduce((sum, p) => sum + (p.Amount || 0), 0) || 0;
                  const remaining = (invoice.TotalAmount || 0) - paid;
                  setPaymentForm(prev => ({ ...prev, amount: remaining.toString() }));
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
              required
            >
              <option value="">Chọn hóa đơn</option>
              {invoices.filter(inv => inv.StatusID !== 2).map(inv => {
                const paid = inv.Payments?.filter(p => p.StatusID === 2).reduce((sum, p) => sum + (p.Amount || 0), 0) || 0;
                const remaining = (inv.TotalAmount || 0) - paid;
                return (
                  <option key={inv.InvoiceID} value={inv.InvoiceID}>
                    {inv.ApartmentCode} - {inv.OwnerName} ({money(inv.TotalAmount)} - còn {money(remaining)})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Phương thức thanh toán *</label>
            <select
              value={paymentForm.methodId}
              onChange={(e) => setPaymentForm({ ...paymentForm, methodId: e.target.value })}
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
            <label className="mb-1 block text-sm font-semibold text-slate-700">Số tiền *</label>
            <Input
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              placeholder="Nhập số tiền"
              required
              min="0"
              step="1000"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Mã giao dịch</label>
            <Input
              value={paymentForm.transactionCode}
              onChange={(e) => setPaymentForm({ ...paymentForm, transactionCode: e.target.value })}
              placeholder="Mã giao dịch (nếu có)"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setPaymentModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={processing}>
              {processing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Xác nhận thanh toán
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}