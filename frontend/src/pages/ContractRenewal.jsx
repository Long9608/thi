// src/pages/ContractRenewal.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, Search, Calendar, CheckCircle2, X,
  AlertCircle, Clock, ArrowRight, Save, FileText,
  Home, Users, CreditCard, ChevronRight, Plus
} from 'lucide-react';
import { contractAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money } from '../utils/formatters';

export default function ContractRenewal({ flash }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [renewalForm, setRenewalForm] = useState({
    newEndDate: '',
    newRent: '',
    note: ''
  });
  const [processing, setProcessing] = useState(false);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await contractAPI.getAll('', 1, 999);
      const data = res?.data || res || [];
      // Lọc hợp đồng sắp hết hạn (còn dưới 60 ngày)
      const now = new Date();
      const expiring = Array.isArray(data) ? data.filter(c => {
        const endDate = new Date(c.EndDate);
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        return daysLeft <= 60 && daysLeft > 0 && c.StatusID === 2;
      }) : [];
      setContracts(expiring);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách hợp đồng'));
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleRenew = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      await contractAPI.update(selectedContract.ContractID, {
        endDate: renewalForm.newEndDate,
        rent: parseFloat(renewalForm.newRent) || selectedContract.Rent,
        statusId: 2
      });

      if (flash) flash('✅ Gia hạn hợp đồng thành công!');
      setModalOpen(false);
      fetchContracts();
    } catch (error) {
      console.error('Renew error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể gia hạn hợp đồng'));
    } finally {
      setProcessing(false);
    }
  };

  const openRenewModal = (contract) => {
    setSelectedContract(contract);
    const newEndDate = new Date(contract.EndDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    setRenewalForm({
      newEndDate: newEndDate.toISOString().split('T')[0],
      newRent: contract.Rent,
      note: ''
    });
    setModalOpen(true);
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return 0;
    const now = new Date();
    const end = new Date(endDate);
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  };

  const filteredContracts = useMemo(() => {
    const q = search.toLowerCase();
    return contracts.filter(c =>
      (c.ContractNumber || '').toLowerCase().includes(q) ||
      (c.OwnerName || '').toLowerCase().includes(q) ||
      (c.ApartmentCode || '').toLowerCase().includes(q)
    );
  }, [contracts, search]);

  const stats = useMemo(() => {
    const total = contracts.length;
    const critical = contracts.filter(c => getDaysRemaining(c.EndDate) <= 15).length;
    const warning = contracts.filter(c => getDaysRemaining(c.EndDate) > 15 && getDaysRemaining(c.EndDate) <= 30).length;
    const normal = contracts.filter(c => getDaysRemaining(c.EndDate) > 30).length;
    return { total, critical, warning, normal };
  }, [contracts]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Gia hạn hợp đồng</h3>
            <p className="text-sm text-slate-500">
              Gia hạn hợp đồng sắp hết hạn.
              <span className="ml-2 text-amber-600 font-semibold">
                {stats.critical} hợp đồng sắp hết hạn (dưới 15 ngày)
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm hợp đồng..."
              className="w-48"
            />
            <Button variant="secondary" onClick={fetchContracts} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={FileText} label="Sắp hết hạn" value={stats.total} hint="Hợp đồng cần gia hạn" />
        <StatCard icon={AlertCircle} label="Khẩn cấp" value={stats.critical} hint="Dưới 15 ngày" />
        <StatCard icon={Clock} label="Cảnh báo" value={stats.warning} hint="15-30 ngày" />
        <StatCard icon={CheckCircle2} label="Bình thường" value={stats.normal} hint="Trên 30 ngày" />
      </div>

      {/* Contract List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách hợp đồng...</p>
        </Card>
      ) : filteredContracts.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 size={48} className="text-emerald-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Không có hợp đồng cần gia hạn</h3>
          <p className="text-sm text-slate-500">Tất cả hợp đồng đều còn thời hạn trên 60 ngày</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredContracts.map((contract) => {
            const daysLeft = getDaysRemaining(contract.EndDate);
            const urgency = daysLeft <= 15 ? 'red' : daysLeft <= 30 ? 'amber' : 'green';
            const urgencyLabel = daysLeft <= 15 ? 'Khẩn cấp' : daysLeft <= 30 ? 'Cảnh báo' : 'Bình thường';

            return (
              <Card key={contract.ContractID} className="group hover:border-[#1f4f46]/30 transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge tone="purple">{contract.ContractNumber}</Badge>
                      <h3 className="font-bold text-slate-950 mt-1">{contract.ApartmentCode}</h3>
                      <p className="text-sm text-slate-500">{contract.OwnerName}</p>
                    </div>
                    <Badge tone={urgency}>{urgencyLabel}</Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Hết hạn</span>
                      <span className="font-bold text-slate-950">{formatDate(contract.EndDate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Còn lại</span>
                      <span className={`font-bold ${
                        daysLeft <= 15 ? 'text-rose-600' :
                        daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {daysLeft} ngày
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Giá thuê</span>
                      <span className="font-bold text-[#1f4f46]">{money(contract.Rent)}/tháng</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1" onClick={() => openRenewModal(contract)}>
                      <RefreshCw size={14} /> Gia hạn
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Renewal Modal */}
      <Modal
        open={modalOpen}
        title="Gia hạn hợp đồng"
        description={`Gia hạn hợp đồng ${selectedContract?.ContractNumber}`}
        onClose={() => setModalOpen(false)}
      >
        {selectedContract && (
          <form onSubmit={handleRenew} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã hợp đồng</span>
                <span className="font-bold">{selectedContract.ContractNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Căn hộ</span>
                <span className="font-bold">{selectedContract.ApartmentCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chủ hộ</span>
                <span className="font-bold">{selectedContract.OwnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hiện tại</span>
                <span>{formatDate(selectedContract.StartDate)} → {formatDate(selectedContract.EndDate)}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày kết thúc mới *</label>
              <Input
                type="date"
                value={renewalForm.newEndDate}
                onChange={(e) => setRenewalForm({ ...renewalForm, newEndDate: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Giá thuê mới</label>
              <Input
                type="number"
                value={renewalForm.newRent}
                onChange={(e) => setRenewalForm({ ...renewalForm, newRent: e.target.value })}
                placeholder="Nhập giá thuê mới"
              />
              <p className="mt-1 text-xs text-slate-500">Để trống nếu giữ nguyên giá cũ</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</label>
              <Input
                value={renewalForm.note}
                onChange={(e) => setRenewalForm({ ...renewalForm, note: e.target.value })}
                placeholder="Ghi chú gia hạn..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={processing}>
                {processing ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                Xác nhận gia hạn
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}