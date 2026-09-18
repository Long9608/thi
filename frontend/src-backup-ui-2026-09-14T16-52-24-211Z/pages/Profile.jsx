// src/pages/Profile.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Calendar, MapPin, Shield,
  Save, RefreshCw, CheckCircle2, X, AlertCircle,
  Camera, Edit, Building2, Home, Users,
  UserCircle, Lock, Key, Eye, EyeOff
} from 'lucide-react';
import { authAPI, userAPI, residentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, getInitials } from '../utils/formatters';

export default function Profile({ flash }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [resident, setResident] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    gender: 1
  });

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Lấy thông tin user
      const userRes = await authAPI.getMe();
      const userData = userRes?.data || userRes;
      setUser(userData);
      
      // Lấy thông tin employee
      const empRes = await userAPI.getEmployees('', '', '', 1, 999);
      const employees = empRes?.data || empRes || [];
      const empData = Array.isArray(employees) 
        ? employees.find(e => e.UserID === userData?.id || e.UserID === userData?.UserID)
        : null;
      setEmployee(empData);
      
      // Lấy thông tin resident
      const resRes = await residentAPI.getAll('', 1, 999);
      const residents = resRes?.data || resRes || [];
      const resData = Array.isArray(residents)
        ? residents.find(r => r.UserID === userData?.id || r.UserID === userData?.UserID)
        : null;
      setResident(resData);
      
      // Set form data
      const fullName = empData?.FullName || resData?.FullName || userData?.username || '';
      setForm({
        fullName: fullName,
        email: userData?.email || empData?.Email || resData?.Email || '',
        phone: userData?.phone || empData?.Phone || resData?.Phone || '',
        address: empData?.Address || resData?.Address || '',
        birthDate: empData?.BirthDate || resData?.BirthDate || '',
        gender: empData?.Gender !== undefined ? empData.Gender : (resData?.Gender !== undefined ? resData.Gender : 1)
      });
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải thông tin hồ sơ'));
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Cập nhật user
      await authAPI.updateProfile?.({
        email: form.email,
        phone: form.phone
      });
      
      // Cập nhật employee hoặc resident
      if (employee) {
        await userAPI.updateEmployee(employee.EmployeeID, {
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          address: form.address,
          birthDate: form.birthDate,
          gender: form.gender
        });
      } else if (resident) {
        await residentAPI.update(resident.ResidentID, {
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          address: form.address,
          birthDate: form.birthDate,
          gender: form.gender
        });
      }
      
      if (flash) flash('✅ Cập nhật hồ sơ thành công!');
      setEditMode(false);
      fetchUserData();
      
    } catch (error) {
      console.error('Save error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể cập nhật hồ sơ'));
    } finally {
      setSaving(false);
    }
  };

  // Get role display
  const getRoleDisplay = () => {
    if (!user) return 'Người dùng';
    const roles = user.roles || user.RoleNames || [];
    if (Array.isArray(roles)) {
      return roles.join(', ');
    }
    return roles || 'Người dùng';
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
        <p className="mt-3 font-bold text-slate-900">Đang tải thông tin hồ sơ...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Hồ sơ cá nhân</h3>
            <p className="text-sm text-slate-500">Quản lý thông tin cá nhân của bạn</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!editMode ? (
              <Button onClick={() => setEditMode(true)}>
                <Edit size={16} /> Chỉnh sửa
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setEditMode(false)}>
                  <X size={16} /> Hủy
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  Lưu thay đổi
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Profile Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 md:col-span-1">
          <div className="text-center">
            <div className="relative mx-auto w-32 h-32">
              <div className="w-32 h-32 rounded-full bg-[#eef5f2] flex items-center justify-center text-[#1f4f46] text-5xl font-bold">
                {getInitials(form.fullName || user?.username || 'U')}
              </div>
              <button className="absolute bottom-0 right-0 rounded-full bg-[#1f4f46] p-2 text-white hover:bg-[#173f38] transition">
                <Camera size={18} />
              </button>
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-950">{form.fullName || user?.username}</h3>
            <Badge tone="purple" className="mt-1">{getRoleDisplay()}</Badge>
            <p className="mt-2 text-sm text-slate-500">ID: {user?.id || user?.UserID || 'N/A'}</p>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Trạng thái</span>
              <Badge tone={user?.status || user?.Status ? 'green' : 'red'}>
                {user?.status || user?.Status ? 'Hoạt động' : 'Không hoạt động'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ngày tạo</span>
              <span className="text-slate-700">{formatDate(user?.createdAt || user?.CreatedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Đăng nhập lần cuối</span>
              <span className="text-slate-700">{formatDate(user?.lastLogin || user?.LastLogin)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h4 className="font-bold text-slate-950 mb-4">Thông tin cá nhân</h4>
          
          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Họ tên</label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Nhập họ tên"
                  icon={User}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Email"
                    icon={Mail}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Số điện thoại</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Số điện thoại"
                    icon={Phone}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Địa chỉ</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Địa chỉ"
                  icon={MapPin}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày sinh</label>
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    icon={Calendar}
                  />
                </div>
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
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Họ tên</p>
                  <p className="font-semibold text-slate-950">{form.fullName || 'Chưa cập nhật'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-semibold text-slate-950">{form.email || 'Chưa cập nhật'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Số điện thoại</p>
                  <p className="font-semibold text-slate-950">{form.phone || 'Chưa cập nhật'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Địa chỉ</p>
                  <p className="font-semibold text-slate-950">{form.address || 'Chưa cập nhật'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Ngày sinh</p>
                  <p className="font-semibold text-slate-950">{formatDate(form.birthDate)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Giới tính</p>
                  <p className="font-semibold text-slate-950">{form.gender === 1 ? 'Nam' : 'Nữ'}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}