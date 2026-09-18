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
  const [selectedInvoice, setSelectedInvoice] = useState(null);
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
      
      const invoicesRes = await invoiceAPI.getAll('', '', '', 1, 999);
      const invoicesData = invoicesRes?.data || [];
      const unpaidInvoices = Array.isArray(invoicesData) 
        ? invoicesData.filter(inv => inv.StatusID === 1 || inv.StatusID === 3)
        : [];
      setInvoices(unpaidInvoices);
      setTotalPages(invoicesRes?.pagination?.totalPages || 1);

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

  const getRemainingAmount = useCallback((invoice) => {
    if (!invoice) return 0;
    const paidAmount = invoice.Payments?.reduce((sum, p) => {
      if (p.StatusID === 2) {
        return sum + (p.Amount || 0);
      }
      return sum;
    }, 0) || 0;
    return (invoice.TotalAmount || 0) - paidAmount;
  }, []);

  const handlePayment = async (e) => {
    e.preventDefault();
    
    const remaining = getRemainingAmount(selectedInvoice);
    // 🔥 SỬA: parseFloat với xử lý số thập phân
    const amountToPay = parseFloat(form.amount.replace(/,/g, ''));
    
    if (!amountToPay || amountToPay <= 0) {
      flash('⚠️ Vui lòng nhập số tiền cần thu');
      return;
    }
    
    if (isNaN(amountToPay)) {
      flash('⚠️ Vui lòng nhập số tiền hợp lệ');
      return;
    }
    
    if (amountToPay > remaining) {
      flash(`⚠️ Số tiền thu (${money(amountToPay)}) vượt quá số tiền còn lại (${money(remaining)})`);
      return;
    }

    setProcessing(true);
    try {
      await invoiceAPI.processPayment({
        invoiceId: parseInt(form.invoiceId),
        methodId: parseInt(form.methodId),
        amount: amountToPay,
        transactionCode: form.transactionCode || null
      });

      if (flash) flash('✅ Thu phí thành công!');
      setModalOpen(false);
      setForm({ invoiceId: '', methodId: '', amount: '', transactionCode: '' });
      fetchData();
    } catch (error) {
      console.error('Payment error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Không thể xử lý thanh toán';
      if (flash) flash('❌ ' + errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  const openPaymentModal = (invoice) => {
    const remaining = getRemainingAmount(invoice);
    setSelectedInvoice(invoice);
    setForm({
      invoiceId: invoice.InvoiceID.toString(),
      methodId: '',
      amount: remaining.toString(), // 🔥 SỬA: Gán số tiền còn lại để user chỉ cần xác nhận
      transactionCode: ''
    });
    setModalOpen(true);
  };

  // 🔥 SỬA: Xử lý change với định dạng số
  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Chỉ cho phép nhập số và dấu chấm
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setForm({ ...form, amount: value });
    }
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

  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter(inv =>
      (inv.ApartmentCode || '').toLowerCase().includes(q) ||
      (inv.OwnerName || '').toLowerCase().includes(q) ||
      (inv.ContractNumber || '').toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const stats = useMemo(() => {
    const total = invoices.length;
    let totalUnpaid = 0;
    let overdue = 0;
    let overdueAmount = 0;
    
    invoices.forEach(inv => {
      const remaining = getRemainingAmount(inv);
      totalUnpaid += remaining;
      
      if (inv.DueDate && new Date(inv.DueDate) < new Date()) {
        overdue++;
        overdueAmount += remaining;
      }
    });
    
    return { total, totalUnpaid, overdue, overdueAmount };
  }, [invoices, getRemainingAmount]);

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
            const remaining = getRemainingAmount(invoice);
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
                    {invoice.Payments && invoice.Payments.filter(p => p.StatusID === 2).length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Đã thanh toán</span>
                        <span className="font-semibold text-emerald-600">
                          {money(invoice.Payments.filter(p => p.StatusID === 2).reduce((sum, p) => sum + (p.Amount || 0), 0))}
                        </span>
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
        description={`Thu phí cho căn hộ ${selectedInvoice?.ApartmentCode || ''}`}
        onClose={() => {
          setModalOpen(false);
          setForm({ invoiceId: '', methodId: '', amount: '', transactionCode: '' });
        }}
      >
        <form onSubmit={handlePayment} className="space-y-4">
          {selectedInvoice && (() => {
            const remaining = getRemainingAmount(selectedInvoice);
            const amountToPay = parseFloat(form.amount) || 0;
            const remainingAfter = remaining - amountToPay;
            
            return (
              <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Căn hộ</span>
                  <span className="font-bold text-slate-950">{selectedInvoice.ApartmentCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Chủ hộ</span>
                  <span className="font-bold text-slate-950">{selectedInvoice.OwnerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hợp đồng</span>
                  <span className="font-bold text-slate-950">{selectedInvoice.ContractNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kỳ</span>
                  <span className="text-slate-700">{selectedInvoice.InvoiceMonth}/{selectedInvoice.InvoiceYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng hóa đơn</span>
                  <span className="font-bold text-[#1f4f46]">{money(selectedInvoice.TotalAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                  <span className="text-slate-500 font-semibold">Còn lại</span>
                  <span className={`font-bold ${remainingAfter < 0 ? 'text-rose-600' : 'text-[#1f4f46]'}`}>
                    {money(Math.max(0, remainingAfter))}
                  </span>
                </div>
                {amountToPay > 0 && remainingAfter < 0 && (
                  <div className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={14} />
                    ⚠️ Số tiền thu vượt quá số tiền còn lại!
                  </div>
                )}
                {amountToPay > 0 && remainingAfter === 0 && (
                  <div className="text-emerald-600 text-xs mt-1 flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    ✅ Hóa đơn sẽ được thanh toán đầy đủ!
                  </div>
                )}
              </div>
            );
          })()}

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
            {/* 🔥 SỬA: Bỏ step và min để không bị validation của trình duyệt */}
            <input
              type="number"
              value={form.amount}
              onChange={handleAmountChange}
              placeholder="Nhập số tiền cần thu"
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            />
            {selectedInvoice && (
              <p className="mt-1 text-xs text-slate-500">
                Số tiền còn lại hiện tại: {money(getRemainingAmount(selectedInvoice))}
              </p>
            )}
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
            <Button 
              type="submit" 
              disabled={processing}
              className={
                (() => {
                  const remaining = selectedInvoice ? getRemainingAmount(selectedInvoice) : 0;
                  const amountToPay = parseFloat(form.amount) || 0;
                  if (amountToPay <= 0 || amountToPay > remaining) {
                    return 'opacity-50 cursor-not-allowed';
                  }
                  return '';
                })()
              }
            >
              {processing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Xác nhận thu phí
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}