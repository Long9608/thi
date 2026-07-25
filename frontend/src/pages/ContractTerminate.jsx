// src/pages/ContractTerminate.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X, Search, FileText, Home, Users, CreditCard,
  RefreshCw, AlertCircle, CheckCircle2, Save,
  Calendar, ArrowRight, Trash2, FileMinus, Clock
} from 'lucide-react';
import { contractAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money } from '../utils/formatters';

export default function ContractTerminate({ flash }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [terminateForm, setTerminateForm] = useState({
    terminationDate: new Date().toISOString().split('T')[0],
    reason: '',
    note: ''
  });
  const [processing, setProcessing] = useState(false);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await contractAPI.getAll('', 1, 999);
      const data = res?.data || res || [];
      // Chỉ lấy hợp đồng đang hiệu lực hoặc hết hạn
      const active = Array.isArray(data) ? data.filter(c => 
        c.StatusID === 2 || c.StatusID === 3
      ) : [];
      setContracts(active);
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

  const handleTerminate = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      await contractAPI.update(selectedContract.ContractID, {
        statusId: 4 // Đã thanh lý
      });

      if (flash) flash('✅ Thanh lý hợp đồng thành công!');
      setModalOpen(false);
      fetchContracts();
    } catch (error) {
      console.error('Terminate error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể thanh lý hợp đồng'));
    } finally {
      setProcessing(false);
    }
  };

  const openTerminateModal = (contract) => {
    setSelectedContract(contract);
    setTerminateForm({
      terminationDate: new Date().toISOString().split('T')[0],
      reason: 'Hết hạn hợp đồng',
      note: ''
    });
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
    const active = contracts.filter(c => c.StatusID === 2).length;
    const expired = contracts.filter(c => c.StatusID === 3).length;
    return { total, active, expired };
  }, [contracts]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Thanh lý hợp đồng</h3>
            <p className="text-sm text-slate-500">
              Thanh lý hợp đồng khi kết thúc hoặc chấm dứt trước hạn.
              <span className="ml-2 text-amber-600 font-semibold">
                {stats.active} hợp đồng đang hiệu lực
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
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={FileText} label="Tổng hợp đồng" value={stats.total} hint="Đang quản lý" />
        <StatCard icon={CheckCircle2} label="Đang hiệu lực" value={stats.active} hint="Có thể thanh lý" />
        <StatCard icon={Clock} label="Hết hạn" value={stats.expired} hint="Cần thanh lý" />
      </div>

      {/* Contract List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách hợp đồng...</p>
        </Card>
      ) : filteredContracts.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Không có hợp đồng</h3>
          <p className="text-sm text-slate-500">Chưa có hợp đồng nào trong hệ thống</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredContracts.map((contract) => {
            const isActive = contract.StatusID === 2;
            const isExpired = contract.StatusID === 3;

            return (
              <Card key={contract.ContractID} className="group hover:border-[#1f4f46]/30 transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge tone="purple">{contract.ContractNumber}</Badge>
                      <h3 className="font-bold text-slate-950 mt-1">{contract.ApartmentCode}</h3>
                      <p className="text-sm text-slate-500">{contract.OwnerName}</p>
                    </div>
                    <Badge tone={isActive ? 'green' : 'red'}>
                      {isActive ? 'Hiệu lực' : 'Hết hạn'}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Thời hạn</span>
                      <span className="text-slate-700">
                        {formatDate(contract.StartDate)} → {formatDate(contract.EndDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Giá thuê</span>
                      <span className="font-bold text-[#1f4f46]">{money(contract.Rent)}/tháng</span>
                    </div>
                    {contract.Deposit > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tiền cọc</span>
                        <span className="font-bold text-slate-950">{money(contract.Deposit)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button 
                      className="flex-1"
                      variant={isActive ? 'danger' : 'secondary'}
                      onClick={() => openTerminateModal(contract)}
                    >
                      <X size={14} /> {isActive ? 'Thanh lý' : 'Xóa'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Terminate Modal */}
      <Modal
        open={modalOpen}
        title="Thanh lý hợp đồng"
        description={`Thanh lý hợp đồng ${selectedContract?.ContractNumber}`}
        onClose={() => setModalOpen(false)}
      >
        {selectedContract && (
          <form onSubmit={handleTerminate} className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-800">Xác nhận thanh lý</h4>
                  <p className="text-sm text-amber-700">
                    Hành động này sẽ chấm dứt hợp đồng và cập nhật trạng thái căn hộ.
                  </p>
                </div>
              </div>
            </div>

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
                <span className="text-slate-500">Thời hạn</span>
                <span>{formatDate(selectedContract.StartDate)} → {formatDate(selectedContract.EndDate)}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày thanh lý *</label>
              <Input
                type="date"
                value={terminateForm.terminationDate}
                onChange={(e) => setTerminateForm({ ...terminateForm, terminationDate: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Lý do thanh lý</label>
              <select
                value={terminateForm.reason}
                onChange={(e) => setTerminateForm({ ...terminateForm, reason: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
              >
                <option>Hết hạn hợp đồng</option>
                <option>Chấm dứt trước hạn</option>
                <option>Vi phạm hợp đồng</option>
                <option>Yêu cầu của chủ hộ</option>
                <option>Khác</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</label>
              <Input
                value={terminateForm.note}
                onChange={(e) => setTerminateForm({ ...terminateForm, note: e.target.value })}
                placeholder="Nhập ghi chú..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button variant="danger" type="submit" disabled={processing}>
                {processing ? <RefreshCw size={16} className="animate-spin" /> : <FileMinus size={16} />}
                Xác nhận thanh lý
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}