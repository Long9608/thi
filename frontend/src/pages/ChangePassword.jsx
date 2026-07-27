// src/pages/ChangePassword.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock, Key, Eye, EyeOff, Save, RefreshCw,
  CheckCircle2, X, AlertCircle, Shield
} from 'lucide-react';
import { authAPI } from '../api';
import { Card, Button, Input, Badge } from '../components/UI';

export default function ChangePassword({ flash }) {
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Validate form
  const validate = () => {
    const newErrors = {};
    
    if (!form.oldPassword) {
      newErrors.oldPassword = 'Vui lòng nhập mật khẩu cũ';
    }
    
    if (!form.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (form.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }
    
    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    setLoading(true);
    setSuccess(false);
    
    try {
      await authAPI.changePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword
      });
      
      setSuccess(true);
      setForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
      
      if (flash) flash('✅ Đổi mật khẩu thành công!');
      
    } catch (error) {
      console.error('Change password error:', error);
      const message = error.response?.data?.message || 'Không thể đổi mật khẩu';
      setErrors({ general: message });
      if (flash) flash('❌ ' + message);
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: 'Chưa nhập', color: 'slate' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    const labels = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh', 'Rất mạnh'];
    const colors = ['', 'red', 'amber', 'blue', 'green', 'emerald'];
    
    return {
      score,
      label: labels[score] || 'Chưa nhập',
      color: colors[score] || 'slate'
    };
  };

  const strength = getPasswordStrength(form.newPassword);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Đổi mật khẩu</h3>
            <p className="text-sm text-slate-500">Cập nhật mật khẩu đăng nhập của bạn</p>
          </div>
        </div>
      </Card>

      {/* Form */}
      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* General error */}
          {errors.general && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertCircle size={18} />
                <span className="text-sm font-medium">{errors.general}</span>
              </div>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={18} />
                <span className="text-sm font-medium">Đổi mật khẩu thành công!</span>
              </div>
            </div>
          )}

          {/* Old Password */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Mật khẩu hiện tại *
            </label>
            <div className="relative">
              <Input
                type={showOldPassword ? 'text' : 'password'}
                value={form.oldPassword}
                onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                placeholder="Nhập mật khẩu hiện tại"
                icon={Lock}
                className={errors.oldPassword ? 'border-rose-300' : ''}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowOldPassword(!showOldPassword)}
              >
                {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.oldPassword && (
              <p className="mt-1 text-xs text-rose-600">{errors.oldPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Mật khẩu mới *
            </label>
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                placeholder="Nhập mật khẩu mới"
                icon={Key}
                className={errors.newPassword ? 'border-rose-300' : ''}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-xs text-rose-600">{errors.newPassword}</p>
            )}
            
            {/* Password strength */}
            {form.newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Độ mạnh:</span>
                  <Badge tone={strength.color}>{strength.label}</Badge>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      strength.score >= 4 ? 'bg-emerald-500' :
                      strength.score >= 3 ? 'bg-green-500' :
                      strength.score >= 2 ? 'bg-blue-500' :
                      strength.score >= 1 ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                    style={{ width: `${(strength.score / 5) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Mật khẩu nên có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Xác nhận mật khẩu mới *
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Xác nhận mật khẩu mới"
                icon={Shield}
                className={errors.confirmPassword ? 'border-rose-300' : ''}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Security tips */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <Shield size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Mẹo bảo mật</p>
                <ul className="mt-1 space-y-1 text-xs text-blue-700">
                  <li>• Sử dụng mật khẩu có ít nhất 8 ký tự</li>
                  <li>• Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt</li>
                  <li>• Không sử dụng mật khẩu cho nhiều tài khoản</li>
                  <li>• Thay đổi mật khẩu định kỳ 3-6 tháng</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => {
              setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
              setErrors({});
            }}>
              <X size={16} /> Reset
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              Đổi mật khẩu
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}