// src/pages/DepositManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Search, FileText, Home, Users,
  RefreshCw, CheckCircle2, AlertCircle, Clock,
  ArrowRight, DollarSign, Calendar, Wallet,
  Eye  // 🔥 ĐÃ THÊM
} from 'lucide-react';
import { contractAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money } from '../utils/formatters';

export default function DepositManagement({ flash }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await contractAPI.getAll('', 1, 999);
      const data = res?.data || res || [];
      // Lọc hợp đồng có tiền cọc > 0
      const withDeposit = Array.isArray(data) ? data.filter(c => c.Deposit > 0) : [];
      setContracts(withDeposit);
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

  const openDetailModal = (contract) => {
    setSelectedContract(contract);
    setModalOpen(true);
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
    const totalDeposit = contracts.reduce((sum, c) => sum + (c.Deposit || 0), 0);
    const avgDeposit = total > 0 ? totalDeposit / total : 0;
    const maxDeposit = total > 0 ? Math.max(...contracts.map(c => c.Deposit || 0)) : 0;
    return { total, totalDeposit, avgDeposit, maxDeposit };
  }, [contracts]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý tiền cọc</h3>
            <p className="text-sm text-slate-500">
              Theo dõi tiền cọc của các hợp đồng.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {money(stats.totalDeposit)} tổng tiền cọc
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
        <StatCard icon={FileText} label="Hợp đồng có cọc" value={stats.total} hint="Đang quản lý" />
        <StatCard icon={CreditCard} label="Tổng tiền cọc" value={money(stats.totalDeposit).replace('₫', '')} hint="Tất cả hợp đồng" />
        <StatCard icon={Wallet} label="Trung bình" value={money(stats.avgDeposit).replace('₫', '')} hint="Mỗi hợp đồng" />
        <StatCard icon={DollarSign} label="Cao nhất" value={money(stats.maxDeposit).replace('₫', '')} hint="Một hợp đồng" />
      </div>

      {/* Deposit List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách...</p>
        </Card>
      ) : filteredContracts.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Không có tiền cọc</h3>
          <p className="text-sm text-slate-500">Chưa có hợp đồng nào có tiền cọc</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredContracts.map((contract) => (
            <Card key={contract.ContractID} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge tone="purple">{contract.ContractNumber}</Badge>
                    <h3 className="font-bold text-slate-950 mt-1">{contract.ApartmentCode}</h3>
                    <p className="text-sm text-slate-500">{contract.OwnerName}</p>
                  </div>
                  <Badge tone="green">
                    {contract.StatusID === 2 ? 'Hiệu lực' : 'Hết hạn'}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tiền cọc</span>
                    <span className="text-2xl font-bold text-[#1f4f46]">
                      {money(contract.Deposit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Giá thuê</span>
                    <span className="font-bold text-slate-950">{money(contract.Rent)}/tháng</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Thời hạn</span>
                    <span className="text-slate-700">
                      {formatDate(contract.StartDate)} → {formatDate(contract.EndDate)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openDetailModal(contract)}>
                    <Eye size={14} /> Chi tiết
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={modalOpen}
        title="Chi tiết tiền cọc"
        description={`Hợp đồng ${selectedContract?.ContractNumber}`}
        onClose={() => setModalOpen(false)}
      >
        {selectedContract && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#eef5f2] p-6 text-center">
              <p className="text-sm text-slate-500">Tiền cọc</p>
              <p className="text-4xl font-black text-[#1f4f46]">{money(selectedContract.Deposit)}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thông tin hợp đồng</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div><span className="text-slate-500">Mã HĐ:</span> {selectedContract.ContractNumber}</div>
                  <div><span className="text-slate-500">Căn hộ:</span> {selectedContract.ApartmentCode}</div>
                  <div><span className="text-slate-500">Tòa nhà:</span> {selectedContract.BuildingName}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thông tin chủ hộ</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div><span className="text-slate-500">Họ tên:</span> {selectedContract.OwnerName}</div>
                  <div><span className="text-slate-500">SĐT:</span> {selectedContract.OwnerPhone || 'Chưa có'}</div>
                  <div><span className="text-slate-500">Email:</span> {selectedContract.OwnerEmail || 'Chưa có'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-500">Thời gian</p>
              <div className="mt-2 space-y-1 text-sm">
                <div><span className="text-slate-500">Ngày ký:</span> {formatDate(selectedContract.SignDate)}</div>
                <div><span className="text-slate-500">Bắt đầu:</span> {formatDate(selectedContract.StartDate)}</div>
                <div><span className="text-slate-500">Kết thúc:</span> {formatDate(selectedContract.EndDate)}</div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}