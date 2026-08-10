// src/pages/Fees.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Search, Download, Eye, RefreshCw,
  CheckCircle2, X, AlertCircle, CreditCard, Clock,
  Filter, Calendar, DollarSign, Printer, Send,
  Wallet, TrendingUp, ArrowUp, ArrowDown
} from 'lucide-react';
import { invoiceAPI, contractAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money, formatNumber } from '../utils/formatters';

export default function Fees({ flash }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statuses, setStatuses] = useState([]);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    contractId: '',
    invoiceMonth: new Date().getMonth() + 1,
    invoiceYear: new Date().getFullYear(),
    dueDate: '',
    items: [
      { chargeType: 'SERVICE', description: 'Phí dịch vụ', quantity: 1, unitPrice: 0 }
    ]
  });
  const [contracts, setContracts] = useState([]);
  const [generating, setGenerating] = useState(false);

  // Fetch data
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await invoiceAPI.getAll(
        statusFilter,
        monthFilter,
        yearFilter,
        page,
        20
      );
      console.log('📊 Invoices:', res);

      if (res && res.data) {
        const data = Array.isArray(res.data) ? res.data : [];
        setInvoices(data);
        setTotalPages(res.pagination?.totalPages || 1);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách hóa đơn'));
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, monthFilter, yearFilter, page, flash]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await invoiceAPI.getStatuses();
      const data = res?.data || res || [];
      setStatuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  }, []);

  const fetchContracts = useCallback(async () => {
    try {
      const res = await contractAPI.getAll('', 1, 999);
      const data = res?.data || res || [];
      setContracts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchStatuses();
    fetchContracts();
  }, [fetchInvoices, fetchStatuses, fetchContracts]);

  // Handlers
  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      // Filter out items with zero price
      const items = generateForm.items.filter(item => item.unitPrice > 0);
      if (items.length === 0) {
        if (flash) flash('⚠️ Vui lòng nhập ít nhất một khoản phí với giá trị > 0');
        setGenerating(false);
        return;
      }

      await invoiceAPI.generate({
        contractId: parseInt(generateForm.contractId),
        invoiceMonth: parseInt(generateForm.invoiceMonth),
        invoiceYear: parseInt(generateForm.invoiceYear),
        dueDate: generateForm.dueDate || null,
        items: items
      });

      if (flash) flash('✅ Tạo hóa đơn thành công!');
      setGenerateModalOpen(false);
      setGenerateForm({
        contractId: '',
        invoiceMonth: new Date().getMonth() + 1,
        invoiceYear: new Date().getFullYear(),
        dueDate: '',
        items: [
          { chargeType: 'SERVICE', description: 'Phí dịch vụ', quantity: 1, unitPrice: 0 }
        ]
      });
      fetchInvoices();
    } catch (error) {
      console.error('Generate invoice error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tạo hóa đơn'));
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (id, statusId) => {
    try {
      await invoiceAPI.updateStatus(id, statusId);
      if (flash) flash('✅ Cập nhật trạng thái thành công!');
      fetchInvoices();
    } catch (error) {
      console.error('Update status error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể cập nhật trạng thái'));
    }
  };

  const openViewModal = (invoice) => {
    setSelectedInvoice(invoice);
    setModalMode('view');
    setModalOpen(true);
  };

  const addInvoiceItem = () => {
    setGenerateForm(prev => ({
      ...prev,
      items: [...prev.items, { chargeType: 'OTHER', description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const removeInvoiceItem = (index) => {
    setGenerateForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateInvoiceItem = (index, field, value) => {
    setGenerateForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const getStatusBadge = (statusId, statusName) => {
    const map = {
      1: { tone: 'amber', label: 'Chưa thanh toán' },
      2: { tone: 'green', label: 'Đã thanh toán' },
      3: { tone: 'red', label: 'Quá hạn' },
      4: { tone: 'slate', label: 'Đã hủy' }
    };
    const info = map[statusId] || { tone: 'slate', label: statusName || 'Chưa xác định' };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  // Hàm xác định loại hóa đơn và style tương ứng
  const getInvoiceType = (invoice) => {
    if (!invoice.InvoiceType) {
      // Fallback: kiểm tra từ Details
      if (invoice.Details && invoice.Details.length > 0) {
        const firstDetail = invoice.Details[0];
        if (firstDetail.ChargeType === 'ELECTRIC') return { label: '⚡ Điện', tone: 'amber' };
        if (firstDetail.ChargeType === 'WATER') return { label: '💧 Nước', tone: 'blue' };
        if (firstDetail.ChargeType === 'ROOM') return { label: '🏠 Tiền thuê', tone: 'purple' };
        if (firstDetail.ChargeType === 'SERVICE') return { label: '🛠️ Dịch vụ', tone: 'teal' };
        if (firstDetail.ChargeType === 'PARKING') return { label: '🚗 Gửi xe', tone: 'indigo' };
      }
      return { label: 'Khác', tone: 'slate' };
    }

    if (invoice.InvoiceType === 'ELECTRIC') return { label: '⚡ Điện', tone: 'amber' };
    if (invoice.InvoiceType === 'WATER') return { label: '💧 Nước', tone: 'blue' };
    if (invoice.InvoiceType === 'ROOM') return { label: '🏠 Tiền thuê', tone: 'purple' };
    if (invoice.InvoiceType === 'SERVICE') return { label: '🛠️ Dịch vụ', tone: 'teal' };
    if (invoice.InvoiceType === 'PARKING') return { label: '🚗 Gửi xe', tone: 'indigo' };

    return { label: invoice.InvoiceType, tone: 'slate' };
  };

  // Filtered data
  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter(inv => {
      const contractNumber = (inv.ContractNumber || '').toLowerCase();
      const apartmentCode = (inv.ApartmentCode || '').toLowerCase();
      const ownerName = (inv.OwnerName || '').toLowerCase();
      return contractNumber.includes(q) || apartmentCode.includes(q) || ownerName.includes(q);
    });
  }, [invoices, search]);

  // Stats
  const stats = useMemo(() => {
    const total = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.TotalAmount || 0), 0);
    const unpaid = invoices.filter(inv => inv.StatusID === 1 || inv.StatusID === 3).reduce((sum, inv) => sum + (inv.TotalAmount || 0), 0);
    const paid = invoices.filter(inv => inv.StatusID === 2).reduce((sum, inv) => sum + (inv.TotalAmount || 0), 0);
    const overdue = invoices.filter(inv => inv.StatusID === 3).length;
    const paidCount = invoices.filter(inv => inv.StatusID === 2).length;
    return { total, totalAmount, unpaid, paid, overdue, paidCount };
  }, [invoices]);

  const chargeTypeLabels = {
    'ROOM': 'Tiền thuê',
    'ELECTRIC': 'Điện',
    'WATER': 'Nước',
    'SERVICE': 'Phí dịch vụ',
    'PARKING': 'Gửi xe',
    'OTHER': 'Khác'
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Hóa đơn</h3>
            <p className="text-sm text-slate-500">
              Quản lý hóa đơn và phí dịch vụ.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {stats.total} hóa đơn
              </span>
              <span className="ml-2 text-rose-600 font-semibold">
                {money(stats.unpaid)} chưa thu
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm hóa đơn..."
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
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả tháng</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả năm</option>
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Button onClick={() => setGenerateModalOpen(true)}>
              <Plus size={16} /> Tạo hóa đơn
            </Button>
            <Button variant="secondary" onClick={fetchInvoices} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={FileText} label="Tổng hóa đơn" value={stats.total} hint="Đã tạo" />
        <StatCard icon={DollarSign} label="Tổng giá trị" value={money(stats.totalAmount).replace('₫', '').trim()} hint="Tất cả hóa đơn" />
        <StatCard icon={AlertCircle} label="Chưa thanh toán" value={money(stats.unpaid).replace('₫', '').trim()} hint="Cần thu" />
        <StatCard icon={CheckCircle2} label="Đã thanh toán" value={stats.paidCount} hint={`${money(stats.paid)} đã thu`} />
        <StatCard icon={Clock} label="Quá hạn" value={stats.overdue} hint="Cần xử lý gấp" />
      </div>

      {/* Invoice List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách hóa đơn...</p>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có hóa đơn</h3>
          <p className="text-sm text-slate-500">Nhấn "Tạo hóa đơn" để tạo mới</p>
          <Button className="mt-4" onClick={() => setGenerateModalOpen(true)}>
            <Plus size={16} /> Tạo hóa đơn
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.InvoiceID} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {getStatusBadge(invoice.StatusID, invoice.InvoiceStatus)}
                      <Badge tone="purple" className="text-xs">
                        {invoice.InvoiceMonth}/{invoice.InvoiceYear}
                      </Badge>
                      {/* Badge hiển thị loại hóa đơn */}
                      {(() => {
                        const type = getInvoiceType(invoice);
                        return <Badge tone={type.tone} className="text-xs">{type.label}</Badge>;
                      })()}
                    </div>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                      {invoice.ApartmentCode}
                    </h3>
                    <p className="text-sm text-slate-500">{invoice.OwnerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#1f4f46]">
                      {money(invoice.TotalAmount || 0)}
                    </p>
                    <p className="text-xs text-slate-400">HĐ: {invoice.ContractNumber}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ngày tạo</span>
                    <span className="text-slate-700">{formatDate(invoice.InvoiceDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Hạn thanh toán</span>
                    <span className={`font-semibold ${
                      invoice.DueDate && new Date(invoice.DueDate) < new Date() && invoice.StatusID !== 2
                        ? 'text-rose-600'
                        : 'text-slate-700'
                    }`}>
                      {formatDate(invoice.DueDate)}
                    </span>
                  </div>
                  {invoice.PaidAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Đã thanh toán</span>
                      <span className="font-semibold text-emerald-600">{money(invoice.PaidAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openViewModal(invoice)}>
                    <Eye size={14} /> Xem
                  </Button>
                  {invoice.StatusID === 1 && (
                    <Button className="flex-1" onClick={() => handleUpdateStatus(invoice.InvoiceID, 2)}>
                      <CheckCircle2 size={14} /> Đã thu
                    </Button>
                  )}
                  {invoice.StatusID === 3 && (
                    <Button variant="warning" className="flex-1" onClick={() => handleUpdateStatus(invoice.InvoiceID, 2)}>
                      <CheckCircle2 size={14} /> Đánh dấu đã thu
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
        title="Chi tiết hóa đơn"
        description="Xem thông tin chi tiết hóa đơn"
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-950">
                  {selectedInvoice.ContractNumber}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedInvoice.ApartmentCode} - {selectedInvoice.OwnerName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const type = getInvoiceType(selectedInvoice);
                  return <Badge tone={type.tone}>{type.label}</Badge>;
                })()}
                {getStatusBadge(selectedInvoice.StatusID, selectedInvoice.InvoiceStatus)}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin hóa đơn</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Tháng:</span> {selectedInvoice.InvoiceMonth}/{selectedInvoice.InvoiceYear}</div>
                  <div><span className="text-slate-500">Ngày tạo:</span> {formatDate(selectedInvoice.InvoiceDate)}</div>
                  <div><span className="text-slate-500">Hạn thanh toán:</span> {formatDate(selectedInvoice.DueDate)}</div>
                  <div><span className="text-slate-500">Tổng tiền:</span> <span className="font-bold text-[#1f4f46]">{money(selectedInvoice.TotalAmount)}</span></div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin thanh toán</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Đã thanh toán:</span> <span className="font-semibold text-emerald-600">{money(selectedInvoice.PaidAmount || 0)}</span></div>
                  <div><span className="text-slate-500">Còn lại:</span> <span className="font-semibold text-rose-600">{money((selectedInvoice.TotalAmount || 0) - (selectedInvoice.PaidAmount || 0))}</span></div>
                  {selectedInvoice.Payments && selectedInvoice.Payments.length > 0 && (
                    <div>
                      <span className="text-slate-500">Phương thức:</span>
                      <span className="ml-1 font-medium">{selectedInvoice.Payments[0]?.PaymentMethod || 'Chưa xác định'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedInvoice.Details && selectedInvoice.Details.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-500">Chi tiết hóa đơn</p>
                <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-slate-500">Khoản mục</th>
                        <th className="px-4 py-2 text-center text-slate-500">SL</th>
                        <th className="px-4 py-2 text-right text-slate-500">Đơn giá</th>
                        <th className="px-4 py-2 text-right text-slate-500">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.Details.map((detail, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">
                            <span className="font-medium text-slate-900">{detail.Description}</span>
                            <Badge tone="slate" className="ml-2 text-[10px]">
                              {chargeTypeLabels[detail.ChargeType] || detail.ChargeType}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-center text-slate-600">{detail.Quantity}</td>
                          <td className="px-4 py-2 text-right text-slate-600">{money(detail.UnitPrice)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-950">{money(detail.Amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan="3" className="px-4 py-2 text-right font-bold text-slate-950">Tổng cộng</td>
                        <td className="px-4 py-2 text-right font-bold text-[#1f4f46]">{money(selectedInvoice.TotalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {selectedInvoice.StatusID === 1 && (
                <Button onClick={() => {
                  handleUpdateStatus(selectedInvoice.InvoiceID, 2);
                  setModalOpen(false);
                }}>
                  <CheckCircle2 size={16} /> Đánh dấu đã thanh toán
                </Button>
              )}
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Generate Invoice Modal */}
      <Modal
        open={generateModalOpen}
        title="Tạo hóa đơn mới"
        description="Tạo hóa đơn cho hợp đồng"
        onClose={() => setGenerateModalOpen(false)}
        size="lg"
      >
        <form onSubmit={handleGenerateInvoice} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Hợp đồng *</label>
              <select
                value={generateForm.contractId}
                onChange={(e) => setGenerateForm({ ...generateForm, contractId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                required
              >
                <option value="">Chọn hợp đồng</option>
                {contracts.map(c => (
                  <option key={c.ContractID} value={c.ContractID}>
                    {c.ContractNumber} - {c.ApartmentCode} ({c.OwnerName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Hạn thanh toán</label>
              <Input
                type="date"
                value={generateForm.dueDate}
                onChange={(e) => setGenerateForm({ ...generateForm, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Tháng *</label>
              <select
                value={generateForm.invoiceMonth}
                onChange={(e) => setGenerateForm({ ...generateForm, invoiceMonth: parseInt(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                required
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Năm *</label>
              <select
                value={generateForm.invoiceYear}
                onChange={(e) => setGenerateForm({ ...generateForm, invoiceYear: parseInt(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                required
              >
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Khoản phí</p>
              <Button type="button" variant="secondary" size="sm" onClick={addInvoiceItem}>
                <Plus size={14} /> Thêm khoản
              </Button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {generateForm.items.map((item, index) => (
                <div key={index} className="flex flex-wrap gap-2 items-end p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs text-slate-500">Loại</label>
                    <select
                      value={item.chargeType}
                      onChange={(e) => updateInvoiceItem(index, 'chargeType', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#1f4f46]"
                    >
                      <option value="ROOM">Tiền thuê</option>
                      <option value="SERVICE">Phí dịch vụ</option>
                      <option value="ELECTRIC">Điện</option>
                      <option value="WATER">Nước</option>
                      <option value="PARKING">Gửi xe</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-xs text-slate-500">Mô tả</label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                      placeholder="Mô tả khoản phí"
                      className="py-1.5 text-sm"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-slate-500">SL</label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="py-1.5 text-sm"
                      min="1"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-xs text-slate-500">Đơn giá</label>
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="py-1.5 text-sm"
                      min="0"
                    />
                  </div>
                  <div className="w-20 text-center">
                    <div className="text-xs text-slate-500">Thành tiền</div>
                    <div className="text-sm font-semibold text-[#1f4f46]">
                      {money((item.quantity || 0) * (item.unitPrice || 0))}
                    </div>
                  </div>
                  {generateForm.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInvoiceItem(index)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Tổng cộng</span>
              <span className="text-2xl font-bold text-[#1f4f46]">
                {money(generateForm.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0))}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setGenerateModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={generating}>
              {generating ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />}
              Tạo hóa đơn
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}