// src/pages/ContractList.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Search, Download, Edit, Trash2, Eye,
  Calendar, CheckCircle2, X, RefreshCw, AlertCircle,
  Home, Users, CreditCard, Clock, ChevronRight,
  Filter, ArrowUpDown, Printer, Mail
} from 'lucide-react';
import { contractAPI, apartmentAPI, residentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money, getInitials } from '../utils/formatters';

export default function ContractList({ flash }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedContract, setSelectedContract] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [statuses, setStatuses] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContracts, setTotalContracts] = useState(0);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await contractAPI.getAll(statusFilter, page, 999);
      console.log('📊 Contracts:', res);
      
      if (res && res.data) {
        const data = Array.isArray(res.data) ? res.data : [];
        setContracts(data);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalContracts(res.pagination?.total || data.length);
      } else {
        setContracts([]);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách hợp đồng'));
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, flash]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await contractAPI.getStatuses();
      const data = res?.data || res || [];
      setStatuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
    fetchStatuses();
  }, [fetchContracts, fetchStatuses]);

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa hợp đồng này?')) return;
    try {
      await contractAPI.delete(id);
      if (flash) flash('✅ Xóa hợp đồng thành công!');
      fetchContracts();
    } catch (error) {
      console.error('Delete error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa hợp đồng'));
    }
  };

  const openViewModal = (contract) => {
    setSelectedContract(contract);
    setModalMode('view');
    setModalOpen(true);
  };

  const getStatusBadge = (statusName) => {
    const map = {
      'Mới lập': 'blue',
      'Hiệu lực': 'green',
      'Hết hạn': 'red',
      'Đã thanh lý': 'slate'
    };
    const tone = map[statusName] || 'slate';
    return <Badge tone={tone}>{statusName}</Badge>;
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Đã hết hạn';
    if (diff === 0) return 'Hôm nay';
    return `${diff} ngày`;
  };

  const filteredContracts = useMemo(() => {
    const q = search.toLowerCase();
    return contracts.filter(c => {
      const contractNumber = (c.ContractNumber || '').toLowerCase();
      const ownerName = (c.OwnerName || '').toLowerCase();
      const apartmentCode = (c.ApartmentCode || '').toLowerCase();
      return contractNumber.includes(q) || ownerName.includes(q) || apartmentCode.includes(q);
    });
  }, [contracts, search]);

  const stats = useMemo(() => {
    const total = contracts.length;
    const active = contracts.filter(c => c.StatusID === 2).length;
    const expired = contracts.filter(c => c.StatusID === 3).length;
    const newContracts = contracts.filter(c => c.StatusID === 1).length;
    const terminated = contracts.filter(c => c.StatusID === 4).length;
    return { total, active, expired, newContracts, terminated };
  }, [contracts]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Danh sách hợp đồng</h3>
            <p className="text-sm text-slate-500">
              Quản lý tất cả hợp đồng thuê căn hộ.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {stats.active} đang hiệu lực / {stats.total} tổng
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
            <Button variant="secondary" onClick={fetchContracts} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={FileText} label="Tổng hợp đồng" value={stats.total} hint="Đang quản lý" />
        <StatCard icon={CheckCircle2} label="Hiệu lực" value={stats.active} hint="Đang có hiệu lực" />
        <StatCard icon={Clock} label="Mới lập" value={stats.newContracts} hint="Chờ ký" />
        <StatCard icon={AlertCircle} label="Hết hạn" value={stats.expired} hint="Cần gia hạn" />
        <StatCard icon={X} label="Đã thanh lý" value={stats.terminated} hint="Kết thúc" />
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
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có hợp đồng</h3>
          <p className="text-sm text-slate-500">Tạo hợp đồng mới để bắt đầu</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredContracts.map((contract) => (
            <Card key={contract.ContractID} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge tone="purple" className="mb-1">{contract.ContractNumber}</Badge>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                      {contract.ApartmentCode}
                    </h3>
                    <p className="text-sm text-slate-500">{contract.BuildingName}</p>
                  </div>
                  {getStatusBadge(contract.ContractStatus)}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chủ hộ</span>
                    <span className="font-bold text-slate-950">{contract.OwnerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Giá thuê</span>
                    <span className="font-bold text-[#1f4f46]">{money(contract.Rent)}/tháng</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Thời hạn</span>
                    <span className="text-slate-700">
                      {formatDate(contract.StartDate)} → {formatDate(contract.EndDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Còn lại</span>
                    <span className={`font-semibold ${
                      contract.DaysRemaining < 0 ? 'text-rose-600' :
                      contract.DaysRemaining < 30 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {getDaysRemaining(contract.EndDate)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openViewModal(contract)}>
                    <Eye size={14} /> Xem
                  </Button>
                  <Button variant="danger" className="flex-1" onClick={() => handleDelete(contract.ContractID)}>
                    <Trash2 size={14} />
                  </Button>
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

      {/* Modal - View */}
      <Modal
        open={modalOpen}
        title="Chi tiết hợp đồng"
        description="Xem thông tin chi tiết hợp đồng"
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {selectedContract && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-950">{selectedContract.ContractNumber}</h3>
                <p className="text-sm text-slate-500">
                  {selectedContract.ApartmentCode} - {selectedContract.BuildingName}
                </p>
              </div>
              {getStatusBadge(selectedContract.ContractStatus)}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin hợp đồng</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Ngày ký:</span> {formatDate(selectedContract.SignDate)}</div>
                  <div><span className="text-slate-500">Bắt đầu:</span> {formatDate(selectedContract.StartDate)}</div>
                  <div><span className="text-slate-500">Kết thúc:</span> {formatDate(selectedContract.EndDate)}</div>
                  <div><span className="text-slate-500">Tiền cọc:</span> {money(selectedContract.Deposit)}</div>
                  <div><span className="text-slate-500">Giá thuê:</span> {money(selectedContract.Rent)}/tháng</div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">Thông tin chủ hộ</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Họ tên:</span> {selectedContract.OwnerName}</div>
                  <div><span className="text-slate-500">SĐT:</span> {selectedContract.OwnerPhone || 'Chưa có'}</div>
                  <div><span className="text-slate-500">Email:</span> {selectedContract.OwnerEmail || 'Chưa có'}</div>
                </div>
              </div>
            </div>

            {selectedContract.Residents && selectedContract.Residents.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-500">Cư dân trong hợp đồng</p>
                <div className="mt-2 space-y-2">
                  {JSON.parse(selectedContract.Residents).map((resident, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold">{resident.FullName}</span>
                        <Badge tone="slate">{resident.Relationship || 'Thành viên'}</Badge>
                      </div>
                      <div className="text-slate-500">Ngày vào: {formatDate(resident.MoveInDate)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}