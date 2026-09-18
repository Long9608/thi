// src/pages/SendNotification.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Send, Plus, Search, RefreshCw, CheckCircle2, X,
  AlertCircle, Users, Building2, User, Calendar,
  Clock, Mail, MessageSquare, FileText, Bell,
  Filter, Trash2, UserPlus, Home
} from 'lucide-react';
import { notificationAPI, residentAPI, apartmentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, getInitials } from '../utils/formatters';

export default function SendNotification({ flash }) {
  // State
  const [loading, setLoading] = useState(false);
  const [residents, setResidents] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [searchResident, setSearchResident] = useState('');
  const [form, setForm] = useState({
    title: '',
    content: '',
    targetScope: 'ALL',
    targetUserIds: [],
    targetBuildingIds: []
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  // Fetch data
  const fetchResidents = useCallback(async () => {
    try {
      const res = await residentAPI.getAll('', 1, 999);
      const data = res?.data || res || [];
      setResidents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching residents:', error);
    }
  }, []);

  const fetchApartments = useCallback(async () => {
    try {
      const res = await apartmentAPI.getAll('', '', 1, 999);
      const data = res?.data || res || [];
      setApartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching apartments:', error);
    }
  }, []);

  useEffect(() => {
    fetchResidents();
    fetchApartments();
  }, [fetchResidents, fetchApartments]);

  // Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title.trim() || !form.content.trim()) {
      flash('⚠️ Vui lòng nhập tiêu đề và nội dung thông báo');
      return;
    }

    setLoading(true);
    try {
      const data = {
        title: form.title,
        content: form.content,
        targetScope: form.targetScope
      };

      if (form.targetScope === 'USER') {
        data.targetUserIds = selectedRecipients.map(r => r.UserID || r.userId);
      }

      if (form.targetScope === 'BUILDING') {
        data.targetBuildingIds = form.targetBuildingIds;
      }

      const res = await notificationAPI.create(data);
      console.log('📊 Send notification response:', res);
      
      setSentCount(res?.data?.recipientsCount || 0);
      setPreviewOpen(true);
      
      // Reset form
      setForm({
        title: '',
        content: '',
        targetScope: 'ALL',
        targetUserIds: [],
        targetBuildingIds: []
      });
      setSelectedRecipients([]);
      
      if (flash) flash('✅ Gửi thông báo thành công!');
    } catch (error) {
      console.error('Send notification error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể gửi thông báo'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipient = (resident) => {
    if (selectedRecipients.find(r => r.ResidentID === resident.ResidentID)) {
      flash('⚠️ Cư dân đã được thêm');
      return;
    }
    setSelectedRecipients([...selectedRecipients, resident]);
    setSearchResident('');
  };

  const handleRemoveRecipient = (residentId) => {
    setSelectedRecipients(selectedRecipients.filter(r => r.ResidentID !== residentId));
  };

  const handleSelectAll = () => {
    setSelectedRecipients([...residents]);
  };

  const handleClearAll = () => {
    setSelectedRecipients([]);
  };

  // Filter residents
  const filteredResidents = residents.filter(r =>
    r.FullName?.toLowerCase().includes(searchResident.toLowerCase()) ||
    r.Phone?.includes(searchResident) ||
    r.ApartmentCode?.toLowerCase().includes(searchResident.toLowerCase())
  );

  const getRecipientCount = () => {
    if (form.targetScope === 'ALL') return residents.length;
    if (form.targetScope === 'BUILDING') return residents.filter(r => r.BuildingID).length;
    return selectedRecipients.length;
  };

  const getTargetLabel = () => {
    switch(form.targetScope) {
      case 'ALL': return 'Tất cả cư dân';
      case 'BUILDING': return 'Cư dân theo tòa nhà';
      case 'USER': return 'Cá nhân';
      default: return 'Tất cả cư dân';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Gửi thông báo</h3>
            <p className="text-sm text-slate-500">
              Gửi thông báo đến cư dân.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {getRecipientCount()} người nhận
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => {
              setForm({ ...form, targetScope: 'ALL' });
              setSelectedRecipients([]);
            }}>
              <Users size={16} /> Gửi tất cả
            </Button>
            <Button variant="secondary" onClick={() => {
              setForm({ ...form, targetScope: 'BUILDING' });
              setSelectedRecipients([]);
            }}>
              <Building2 size={16} /> Theo tòa nhà
            </Button>
          </div>
        </div>
      </Card>

      {/* Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Tiêu đề thông báo *
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Nhập tiêu đề thông báo..."
              required
              className="text-base"
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Nội dung thông báo *
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-[#1f4f46] min-h-[180px] resize-y"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Nhập nội dung thông báo..."
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              {form.content.length} ký tự
            </p>
          </div>

          {/* Target Scope */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Đối tượng nhận
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                className={`flex items-center gap-3 rounded-xl border p-4 transition ${
                  form.targetScope === 'ALL'
                    ? 'border-[#1f4f46] bg-[#eef5f2]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => {
                  setForm({ ...form, targetScope: 'ALL' });
                  setSelectedRecipients([]);
                }}
              >
                <Users size={20} className={form.targetScope === 'ALL' ? 'text-[#1f4f46]' : 'text-slate-400'} />
                <div className="text-left">
                  <p className="font-semibold text-slate-950">Tất cả</p>
                  <p className="text-xs text-slate-500">Gửi đến tất cả cư dân</p>
                </div>
                {form.targetScope === 'ALL' && <CheckCircle2 size={16} className="ml-auto text-[#1f4f46]" />}
              </button>

              <button
                type="button"
                className={`flex items-center gap-3 rounded-xl border p-4 transition ${
                  form.targetScope === 'BUILDING'
                    ? 'border-[#1f4f46] bg-[#eef5f2]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => {
                  setForm({ ...form, targetScope: 'BUILDING' });
                  setSelectedRecipients([]);
                }}
              >
                <Building2 size={20} className={form.targetScope === 'BUILDING' ? 'text-[#1f4f46]' : 'text-slate-400'} />
                <div className="text-left">
                  <p className="font-semibold text-slate-950">Theo tòa nhà</p>
                  <p className="text-xs text-slate-500">Chọn tòa nhà cụ thể</p>
                </div>
                {form.targetScope === 'BUILDING' && <CheckCircle2 size={16} className="ml-auto text-[#1f4f46]" />}
              </button>

              <button
                type="button"
                className={`flex items-center gap-3 rounded-xl border p-4 transition ${
                  form.targetScope === 'USER'
                    ? 'border-[#1f4f46] bg-[#eef5f2]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => {
                  setForm({ ...form, targetScope: 'USER' });
                }}
              >
                <User size={20} className={form.targetScope === 'USER' ? 'text-[#1f4f46]' : 'text-slate-400'} />
                <div className="text-left">
                  <p className="font-semibold text-slate-950">Cá nhân</p>
                  <p className="text-xs text-slate-500">Chọn cư dân cụ thể</p>
                </div>
                {form.targetScope === 'USER' && <CheckCircle2 size={16} className="ml-auto text-[#1f4f46]" />}
              </button>
            </div>
          </div>

          {/* Building Selection */}
          {form.targetScope === 'BUILDING' && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Chọn tòa nhà
              </label>
              <div className="flex flex-wrap gap-2">
                {apartments.map(apt => (
                  <button
                    key={apt.ApartmentID}
                    type="button"
                    className={`px-4 py-2 rounded-xl border text-sm transition ${
                      form.targetBuildingIds.includes(apt.BuildingID)
                        ? 'border-[#1f4f46] bg-[#eef5f2] text-[#1f4f46]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => {
                      const ids = form.targetBuildingIds.includes(apt.BuildingID)
                        ? form.targetBuildingIds.filter(id => id !== apt.BuildingID)
                        : [...form.targetBuildingIds, apt.BuildingID];
                      setForm({ ...form, targetBuildingIds: ids });
                    }}
                  >
                    {apt.BuildingName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* User Selection */}
          {form.targetScope === 'USER' && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Chọn cư dân nhận
              </label>
              
              {/* Search */}
              <div className="flex gap-2 mb-3">
                <Input
                  icon={Search}
                  value={searchResident}
                  onChange={(e) => setSearchResident(e.target.value)}
                  placeholder="Tìm cư dân..."
                  className="flex-1"
                />
                <Button variant="secondary" type="button" onClick={handleSelectAll}>
                  Chọn tất cả
                </Button>
                <Button variant="secondary" type="button" onClick={handleClearAll}>
                  Bỏ chọn
                </Button>
              </div>

              {/* Selected count */}
              <p className="text-sm text-slate-500 mb-2">
                Đã chọn: <span className="font-bold text-[#1f4f46]">{selectedRecipients.length}</span> cư dân
              </p>

              {/* Selected recipients */}
              {selectedRecipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedRecipients.map(r => (
                    <Badge key={r.ResidentID} tone="blue" className="flex items-center gap-1">
                      {r.FullName}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(r.ResidentID)}
                        className="hover:text-rose-600"
                      >
                        <X size={14} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Resident list */}
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {filteredResidents.slice(0, 50).map(resident => {
                  const isSelected = selectedRecipients.find(r => r.ResidentID === resident.ResidentID);
                  return (
                    <button
                      key={resident.ResidentID}
                      type="button"
                      className={`flex w-full items-center gap-3 p-3 hover:bg-slate-50 transition ${
                        isSelected ? 'bg-[#eef5f2]' : ''
                      }`}
                      onClick={() => isSelected ? handleRemoveRecipient(resident.ResidentID) : handleAddRecipient(resident)}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef5f2] text-[#1f4f46] font-bold text-sm">
                        {getInitials(resident.FullName)}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-slate-950">{resident.FullName}</p>
                        <p className="text-xs text-slate-500">
                          {resident.ApartmentCode || 'Chưa có căn hộ'} · {resident.Phone || 'Chưa có SĐT'}
                        </p>
                      </div>
                      {isSelected && <CheckCircle2 size={18} className="text-[#1f4f46]" />}
                    </button>
                  );
                })}
                {filteredResidents.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    <Users size={32} className="mx-auto mb-2 text-slate-300" />
                    <p>Không tìm thấy cư dân</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Đối tượng nhận</span>
              <span className="font-semibold text-slate-950">{getTargetLabel()}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-500">Số người nhận</span>
              <span className="font-semibold text-[#1f4f46]">{getRecipientCount()} người</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => {
              setForm({ title: '', content: '', targetScope: 'ALL', targetUserIds: [], targetBuildingIds: [] });
              setSelectedRecipients([]);
              flash('✅ Đã reset form');
            }}>
              <X size={16} /> Reset
            </Button>
            <Button type="submit" disabled={loading || getRecipientCount() === 0}>
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              Gửi thông báo
            </Button>
          </div>
        </form>
      </Card>

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        title="Gửi thông báo thành công!"
        description={`Đã gửi đến ${sentCount} người nhận`}
        onClose={() => setPreviewOpen(false)}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-600" />
            <h3 className="mt-3 text-xl font-bold text-emerald-800">Thông báo đã được gửi!</h3>
            <p className="text-emerald-600">
              {sentCount} người nhận đã nhận được thông báo
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-500">Thông báo vừa gửi</p>
            <h4 className="mt-2 font-bold text-slate-950">{form.title}</h4>
            <p className="mt-1 text-sm text-slate-600">{form.content}</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setPreviewOpen(false)}>Đóng</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}