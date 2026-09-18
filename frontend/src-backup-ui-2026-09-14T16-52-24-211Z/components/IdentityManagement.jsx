    // src/components/IdentityManagement.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Camera, Upload, Edit, Save, X, RefreshCw,
  Calendar, MapPin, User, CheckCircle2, AlertCircle,
  Eye, EyeOff, FileText, Download, Trash2
} from 'lucide-react';
import { residentAPI } from '../api';
import { Card, Button, Input, Badge, Modal } from './UI';
import { formatDate } from '../utils/formatters';

export default function IdentityManagement({ residentId, flash }) {
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    identityNumber: '',
    frontImage: null,
    backImage: null,
    issueDate: '',
    issuePlace: '',
    expiredDate: '',
  });
  const [previewFront, setPreviewFront] = useState(null);
  const [previewBack, setPreviewBack] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (residentId) {
      fetchIdentity();
    }
  }, [residentId]);

  const fetchIdentity = async () => {
    try {
      setLoading(true);
      const res = await residentAPI.getIdentity(residentId);
      const data = res?.data || res;
      setIdentity(data);
      if (data) {
        setForm({
          identityNumber: data.IdentityNumber || '',
          frontImage: data.FrontImage || null,
          backImage: data.BackImage || null,
          issueDate: data.IssueDate || '',
          issuePlace: data.IssuePlace || '',
          expiredDate: data.ExpiredDate || '',
        });
        setPreviewFront(data.FrontImageUrl || null);
        setPreviewBack(data.BackImageUrl || null);
      }
    } catch (error) {
      console.error('Error fetching identity:', error);
      if (flash) flash('❌ Không thể tải thông tin CCCD');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await residentAPI.updateIdentity(residentId, form);
      
      // Upload ảnh nếu có
      if (form.frontImage instanceof File) {
        await residentAPI.uploadIdentityImage(residentId, form.frontImage, 'front');
      }
      if (form.backImage instanceof File) {
        await residentAPI.uploadIdentityImage(residentId, form.backImage, 'back');
      }

      if (flash) flash('✅ Cập nhật CCCD thành công!');
      setEditMode(false);
      fetchIdentity();
    } catch (error) {
      console.error('Error saving identity:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể cập nhật CCCD'));
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'front') {
      setForm({ ...form, frontImage: file });
      setPreviewFront(URL.createObjectURL(file));
    } else {
      setForm({ ...form, backImage: file });
      setPreviewBack(URL.createObjectURL(file));
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
        <p className="mt-3 font-bold text-slate-900">Đang tải thông tin CCCD...</p>
      </Card>
    );
  }

  if (!identity && !editMode) {
    return (
      <Card className="p-8 text-center">
        <Shield size={48} className="text-slate-300 mx-auto" />
        <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có CCCD</h3>
        <p className="text-sm text-slate-500">Cư dân chưa cập nhật CCCD</p>
        <Button className="mt-4" onClick={() => setEditMode(true)}>
          <Edit size={16} /> Thêm CCCD
        </Button>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#eef5f2] p-3 text-[#1f4f46]">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-950">CCCD / Hồ sơ</h3>
              <p className="text-sm text-slate-500">Quản lý thông tin CCCD của cư dân</p>
            </div>
          </div>
          {!editMode && (
            <Button onClick={() => setEditMode(true)}>
              <Edit size={16} /> Cập nhật
            </Button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Số CCCD</label>
              <Input
                value={form.identityNumber}
                onChange={(e) => setForm({ ...form, identityNumber: e.target.value })}
                placeholder="012345678901"
                icon={Shield}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Nơi cấp</label>
                <Input
                  value={form.issuePlace}
                  onChange={(e) => setForm({ ...form, issuePlace: e.target.value })}
                  placeholder="Cục CS QLHC về TTXH"
                  icon={MapPin}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày cấp</label>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                  icon={Calendar}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày hết hạn</label>
              <Input
                type="date"
                value={form.expiredDate}
                onChange={(e) => setForm({ ...form, expiredDate: e.target.value })}
                icon={Calendar}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Ảnh CCCD</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-4 text-center hover:border-[#1f4f46] hover:bg-slate-50 transition">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'front')}
                    />
                    {previewFront ? (
                      <img src={previewFront} alt="Mặt trước" className="mx-auto max-h-32 object-contain" />
                    ) : (
                      <>
                        <Camera size={24} className="mx-auto text-slate-400" />
                        <p className="mt-1 text-sm text-slate-500">Mặt trước</p>
                      </>
                    )}
                  </label>
                </div>
                <div>
                  <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-4 text-center hover:border-[#1f4f46] hover:bg-slate-50 transition">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'back')}
                    />
                    {previewBack ? (
                      <img src={previewBack} alt="Mặt sau" className="mx-auto max-h-32 object-contain" />
                    ) : (
                      <>
                        <Camera size={24} className="mx-auto text-slate-400" />
                        <p className="mt-1 text-sm text-slate-500">Mặt sau</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditMode(false)}>
                <X size={16} /> Hủy
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                Lưu
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Shield size={16} className="text-slate-400" />
                <span className="text-slate-500">Số CCCD:</span>
                <span className="font-bold text-slate-900">{identity?.IdentityNumber || 'Chưa có'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-slate-400" />
                <span className="text-slate-500">Nơi cấp:</span>
                <span className="font-bold text-slate-900">{identity?.IssuePlace || 'Chưa có'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={16} className="text-slate-400" />
                <span className="text-slate-500">Ngày cấp:</span>
                <span className="font-bold text-slate-900">{formatDate(identity?.IssueDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={16} className="text-slate-400" />
                <span className="text-slate-500">Hết hạn:</span>
                <span className="font-bold text-slate-900">{formatDate(identity?.ExpiredDate)}</span>
              </div>
              <Badge tone={identity?.ExpiredDate && new Date(identity.ExpiredDate) < new Date() ? 'red' : 'green'}>
                {identity?.ExpiredDate && new Date(identity.ExpiredDate) < new Date() ? 'Đã hết hạn' : 'Còn hiệu lực'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {identity?.FrontImageUrl && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <img src={identity.FrontImageUrl} alt="Mặt trước" className="w-full object-cover" />
                  <p className="text-center text-xs text-slate-500 py-1">Mặt trước</p>
                </div>
              )}
              {identity?.BackImageUrl && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <img src={identity.BackImageUrl} alt="Mặt sau" className="w-full object-cover" />
                  <p className="text-center text-xs text-slate-500 py-1">Mặt sau</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}