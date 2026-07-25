// src/components/FamilyMembers.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Plus, Edit, Trash2, User, Phone, Mail,
  Calendar, RefreshCw, X, CheckCircle2, AlertCircle,
  UserPlus, Heart, Home
} from 'lucide-react';
import { residentAPI } from '../api';
import { Card, Button, Input, Badge, Modal } from './UI';
import { formatDate, getInitials } from '../utils/formatters';

export default function FamilyMembers({ residentId, flash }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    gender: 1,
    birthDate: '',
    phone: '',
    email: '',
    relationship: 'Con',
    isHead: false,
  });

  useEffect(() => {
    if (residentId) {
      fetchMembers();
    }
  }, [residentId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await residentAPI.getFamilyMembers(residentId);
      const data = res?.data || res || [];
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching family members:', error);
      if (flash) flash('❌ Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await residentAPI.addFamilyMember(residentId, form);
        if (flash) flash('✅ Thêm thành viên thành công!');
      } else {
        await residentAPI.updateFamilyMember(residentId, selectedMember.MemberID, form);
        if (flash) flash('✅ Cập nhật thành viên thành công!');
      }
      setModalOpen(false);
      resetForm();
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể lưu thông tin'));
    }
  };

  const handleDelete = async (memberId) => {
    if (!confirm('Bạn có chắc muốn xóa thành viên này?')) return;
    try {
      await residentAPI.removeFamilyMember(residentId, memberId);
      if (flash) flash('✅ Xóa thành viên thành công!');
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa thành viên'));
    }
  };

  const resetForm = () => {
    setForm({
      fullName: '',
      gender: 1,
      birthDate: '',
      phone: '',
      email: '',
      relationship: 'Con',
      isHead: false,
    });
    setSelectedMember(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setForm({
      fullName: member.FullName || '',
      gender: member.Gender || 1,
      birthDate: member.BirthDate || '',
      phone: member.Phone || '',
      email: member.Email || '',
      relationship: member.Relationship || 'Con',
      isHead: member.IsHead || false,
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const getRelationshipIcon = (relationship) => {
    const icons = {
      'Chủ hộ': '👑',
      'Vợ/Chồng': '💑',
      'Con': '👶',
      'Bố/Mẹ': '👴',
      'Anh/Chị/Em': '👫',
      'Người thuê': '🏠',
      'Khác': '👤'
    };
    return icons[relationship] || '👤';
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
        <p className="mt-3 font-bold text-slate-900">Đang tải danh sách thành viên...</p>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#eef5f2] p-3 text-[#1f4f46]">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-950">Thành viên hộ gia đình</h3>
              <p className="text-sm text-slate-500">
                Quản lý các thành viên trong hộ gia đình ({members.length} người)
              </p>
            </div>
          </div>
          <Button onClick={openCreateModal}>
            <UserPlus size={16} /> Thêm thành viên
          </Button>
        </div>

        {members.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <Users size={48} className="text-slate-300 mx-auto" />
            <h4 className="mt-3 font-bold text-slate-900">Chưa có thành viên</h4>
            <p className="text-sm text-slate-500">Thêm thành viên hộ gia đình</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((member) => (
              <div
                key={member.MemberID || member.id}
                className={`rounded-xl border p-4 hover:border-[#1f4f46]/30 transition ${
                  member.IsHead ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef5f2] text-[#1f4f46] text-lg font-bold">
                      {getInitials(member.FullName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-950">{member.FullName}</h4>
                        {member.IsHead && (
                          <Badge tone="green">Chủ hộ</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <span>{getRelationshipIcon(member.Relationship)}</span>
                          {member.Relationship}
                        </span>
                        {member.Phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} /> {member.Phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(member)}
                    >
                      <Edit size={14} className="text-slate-400 hover:text-slate-700" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(member.MemberID || member.id)}
                    >
                      <Trash2 size={14} className="text-slate-400 hover:text-rose-600" />
                    </Button>
                  </div>
                </div>
                {member.BirthDate && (
                  <div className="mt-2 text-xs text-slate-400">
                    🎂 {formatDate(member.BirthDate)}
                  </div>
                )}
                {member.Email && (
                  <div className="text-xs text-slate-400">
                    ✉️ {member.Email}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={modalMode === 'create' ? 'Thêm thành viên' : 'Cập nhật thành viên'}
        description={modalMode === 'create' ? 'Thêm thành viên mới vào hộ gia đình' : 'Chỉnh sửa thông tin thành viên'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Họ tên *</label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Nguyễn Văn B"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Giới tính</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: parseInt(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
              >
                <option value={1}>Nam</option>
                <option value={0}>Nữ</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày sinh</label>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Quan hệ *</label>
              <select
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
                required
              >
                <option>Chủ hộ</option>
                <option>Vợ/Chồng</option>
                <option>Con</option>
                <option>Bố/Mẹ</option>
                <option>Anh/Chị/Em</option>
                <option>Người thuê</option>
                <option>Khác</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Số điện thoại</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0900000000"
                icon={Phone}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
              icon={Mail}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isHead}
              onChange={(e) => setForm({ ...form, isHead: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 accent-[#1f4f46]"
            />
            <label className="text-sm text-slate-700">Chủ hộ</label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit">
              {modalMode === 'create' ? 'Thêm thành viên' : 'Cập nhật'}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}