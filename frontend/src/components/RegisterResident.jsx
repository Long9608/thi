// src/components/RegisterResident.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus, Mail, Phone, Calendar, MapPin, Shield, User,
  CheckCircle2, X, RefreshCw, Building2, Home, Users,
  AlertCircle, Save, ArrowLeft, Upload, FileText,
  ChevronRight, Lock, Eye, EyeOff
} from 'lucide-react';
import { residentAPI, apartmentAPI } from '../api';
import { Card, Button, Input, Badge, Modal } from './UI';

export default function RegisterResident({ flash, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [apartments, setApartments] = useState([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '',
    gender: 1,
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    identityNumber: '',
    issueDate: '',
    issuePlace: '',
    expiredDate: '',
    frontImage: null,
    backImage: null,
    apartmentId: '',
    moveInDate: '',
    relationship: 'Chủ hộ',
    emergencyContactName: '',
    emergencyContactPhone: '',
    username: '',
    password: '',
  });

  // 🔥 STATE LƯU LỖI
  const [errors, setErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  
  const [previewFront, setPreviewFront] = useState(null);
  const [previewBack, setPreviewBack] = useState(null);

  useEffect(() => {
    fetchApartments();
  }, []);

  const fetchApartments = async () => {
    try {
      const res = await apartmentAPI.getAll('', '', 1, 999);
      const data = res?.data || res || [];
      setApartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching apartments:', error);
    }
  };

  // 🔥 HÀM VALIDATE FIELD
  const validateField = (fieldName, value) => {
    let error = '';

    switch (fieldName) {
      case 'fullName':
        if (!value.trim()) error = 'Vui lòng nhập họ tên';
        break;
      case 'phone':
        if (!value.trim()) {
          error = 'Vui lòng nhập số điện thoại';
        } else if (!/^(0|\+84)[0-9]{9,10}$/.test(value.trim())) {
          error = 'Số điện thoại không hợp lệ (VD: 0900000000)';
        }
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Email không hợp lệ';
        }
        break;
      case 'identityNumber':
        if (!value.trim()) {
          error = 'Vui lòng nhập số CCCD';
        } else if (!/^\d{12}$/.test(value.replace(/\s/g, ''))) {
          error = 'CCCD phải có 12 chữ số';
        }
        break;
      case 'apartmentId':
        if (!value) error = 'Vui lòng chọn căn hộ';
        break;
      case 'moveInDate':
        if (!value) error = 'Vui lòng chọn ngày chuyển vào';
        break;
      case 'username':
        if (value && value.length < 3) {
          error = 'Tên đăng nhập phải có ít nhất 3 ký tự';
        }
        break;
      case 'password':
        if (value && value.length < 6) {
          error = 'Mật khẩu phải có ít nhất 6 ký tự';
        }
        break;
      default:
        break;
    }

    return error;
  };

  // 🔥 HÀM VALIDATE TOÀN BỘ STEP
  const validateStep = (stepNum) => {
    const newErrors = {};
    const touched = {};

    if (stepNum === 1) {
      // Validate Step 1
      const nameError = validateField('fullName', form.fullName);
      if (nameError) newErrors.fullName = nameError;
      
      const phoneError = validateField('phone', form.phone);
      if (phoneError) newErrors.phone = phoneError;
      
      const emailError = validateField('email', form.email);
      if (emailError) newErrors.email = emailError;

      // Đánh dấu các field đã touched
      touched.fullName = true;
      touched.phone = true;
      touched.email = true;
    }

    if (stepNum === 2) {
      // Validate Step 2
      const identityError = validateField('identityNumber', form.identityNumber);
      if (identityError) newErrors.identityNumber = identityError;
      
      touched.identityNumber = true;
    }

    if (stepNum === 3) {
      // Validate Step 3
      const apartmentError = validateField('apartmentId', form.apartmentId);
      if (apartmentError) newErrors.apartmentId = apartmentError;
      
      const moveInError = validateField('moveInDate', form.moveInDate);
      if (moveInError) newErrors.moveInDate = moveInError;
      
      const usernameError = validateField('username', form.username);
      if (usernameError) newErrors.username = usernameError;
      
      const passwordError = validateField('password', form.password);
      if (passwordError) newErrors.password = passwordError;

      touched.apartmentId = true;
      touched.moveInDate = true;
      touched.username = true;
      touched.password = true;
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    setFieldTouched(prev => ({ ...prev, ...touched }));
    setSubmitAttempted(true);

    return Object.keys(newErrors).length === 0;
  };

  // 🔥 XỬ LÝ CHANGE VỚI VALIDATION REAL-TIME
  const handleFieldChange = (fieldName, value) => {
    setForm(prev => ({ ...prev, [fieldName]: value }));
    
    // Xóa lỗi server khi user sửa
    if (serverErrors[fieldName]) {
      setServerErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }

    // Validate real-time nếu field đã touched
    if (fieldTouched[fieldName] || submitAttempted) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
  };

  // 🔥 XỬ LÝ BLUR - Đánh dấu field đã touched
  const handleFieldBlur = (fieldName) => {
    setFieldTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, form[fieldName]);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  // 🔥 HIỂN THỊ LỖI
  const renderError = (fieldName) => {
    const error = errors[fieldName] || serverErrors[fieldName];
    if (error) {
      return (
        <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      );
    }
    return null;
  };

  // 🔥 KIỂM TRA FIELD CÓ LỖI
  const hasError = (fieldName) => {
    return !!(errors[fieldName] || serverErrors[fieldName]);
  };

  // 🔥 XỬ LÝ SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // Validate tất cả các step
    const step1Valid = validateStep(1);
    const step2Valid = validateStep(2);
    const step3Valid = validateStep(3);
    
    // Nếu đang ở step 3, kiểm tra tất cả
    if (step === 3) {
      if (!step1Valid || !step2Valid || !step3Valid) {
        setStep(1); // Quay lại step 1 để sửa lỗi
        flash('⚠️ Vui lòng kiểm tra lại thông tin đã nhập');
        return;
      }
    } else if (step === 1 && !step1Valid) {
      return;
    } else if (step === 2 && !step2Valid) {
      return;
    }

    // Nếu đang ở step 1 hoặc 2, chỉ validate step hiện tại
    if (step === 1 && !validateStep(1)) return;
    if (step === 2 && !validateStep(2)) return;

    // Nếu đã ở step 3, submit
    if (step === 3) {
      setLoading(true);
      try {
        const data = {
          fullName: form.fullName.trim(),
          gender: form.gender,
          birthDate: form.birthDate || null,
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          identityNumber: form.identityNumber.trim(),
          issueDate: form.issueDate || null,
          issuePlace: form.issuePlace.trim() || null,
          expiredDate: form.expiredDate || null,
          apartmentId: form.apartmentId,
          moveInDate: form.moveInDate,
          relationship: form.relationship,
          emergencyContactName: form.emergencyContactName.trim() || null,
          emergencyContactPhone: form.emergencyContactPhone.trim() || null,
          username: form.username.trim() || null,
          password: form.password || null,
        };

        await residentAPI.create(data);

        if (flash) flash('✅ Đăng ký cư dân mới thành công!');
        if (onSuccess) onSuccess();

        // Reset form
        setForm({
          fullName: '', gender: 1, birthDate: '', phone: '', email: '',
          address: '', identityNumber: '', issueDate: '', issuePlace: '',
          expiredDate: '', frontImage: null, backImage: null,
          apartmentId: '', moveInDate: '', relationship: 'Chủ hộ',
          emergencyContactName: '', emergencyContactPhone: '',
          username: '', password: '',
        });
        setStep(1);
        setPreviewFront(null);
        setPreviewBack(null);
        setErrors({});
        setServerErrors({});
        setFieldTouched({});
        setSubmitAttempted(false);
        
      } catch (error) {
        console.error('Register error:', error);
        
        // 🔥 XỬ LÝ LỖI TỪ SERVER
        const errorMessage = error.response?.data?.message || error.message || 'Không thể đăng ký cư dân';
        
        // Phân tích lỗi và hiển thị đúng field
        if (errorMessage.includes('số điện thoại') || errorMessage.includes('Phone')) {
          setServerErrors(prev => ({ ...prev, phone: '❌ ' + errorMessage }));
          setStep(1);
          setFieldTouched(prev => ({ ...prev, phone: true }));
          flash('⚠️ ' + errorMessage);
        } else if (errorMessage.includes('email') || errorMessage.includes('Email')) {
          setServerErrors(prev => ({ ...prev, email: '❌ ' + errorMessage }));
          setStep(1);
          setFieldTouched(prev => ({ ...prev, email: true }));
          flash('⚠️ ' + errorMessage);
        } else if (errorMessage.includes('tên đăng nhập') || errorMessage.includes('Username')) {
          setServerErrors(prev => ({ ...prev, username: '❌ ' + errorMessage }));
          setStep(3);
          setFieldTouched(prev => ({ ...prev, username: true }));
          flash('⚠️ ' + errorMessage);
        } else if (errorMessage.includes('CCCD') || errorMessage.includes('IdentityNumber')) {
          setServerErrors(prev => ({ ...prev, identityNumber: '❌ ' + errorMessage }));
          setStep(2);
          setFieldTouched(prev => ({ ...prev, identityNumber: true }));
          flash('⚠️ ' + errorMessage);
        } else {
          if (flash) flash('❌ ' + errorMessage);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // 🔥 HÀM CHUYỂN STEP
  const goToNextStep = () => {
    if (step === 1) {
      if (validateStep(1)) {
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (step === 2) {
      if (validateStep(2)) {
        setStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const goToPrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // 🔥 HIỂN THỊ STEP INDICATOR
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => {
        const hasErrorInStep = (s === 1 && (errors.fullName || errors.phone || errors.email || serverErrors.phone || serverErrors.email)) ||
                               (s === 2 && (errors.identityNumber || serverErrors.identityNumber)) ||
                               (s === 3 && (errors.apartmentId || errors.moveInDate || errors.username || errors.password || serverErrors.username));
        
        return (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition cursor-pointer ${
                s === step
                  ? 'bg-[#1f4f46] text-white'
                  : s < step
                  ? 'bg-emerald-100 text-emerald-700'
                  : hasErrorInStep
                  ? 'bg-rose-100 text-rose-700 border-2 border-rose-400'
                  : 'bg-slate-100 text-slate-400'
              }`}
              onClick={() => {
                if (s < step) setStep(s);
              }}
            >
              {s < step ? <CheckCircle2 size={18} /> : s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 w-8 transition ${
                  s < step ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // 🔥 RENDER FIELD VỚI LỖI
  const renderField = ({ label, name, type = 'text', placeholder, icon: Icon, required = false, ...props }) => {
    const error = errors[name] || serverErrors[name];
    const touched = fieldTouched[name] || submitAttempted;
    const showError = touched && error;

    return (
      <div className="mb-4">
        <label className="mb-1 block text-sm font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <Input
          type={type}
          value={form[name]}
          onChange={(e) => handleFieldChange(name, e.target.value)}
          onBlur={() => handleFieldBlur(name)}
          placeholder={placeholder}
          icon={Icon}
          className={`${showError ? 'border-rose-300 focus:border-rose-500' : ''}`}
          {...props}
        />
        {renderError(name)}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-[#eef5f2] p-3 text-[#1f4f46]">
            <UserPlus size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-950">Đăng ký cư dân mới</h3>
            <p className="text-sm text-slate-500">Nhập thông tin cư dân và căn hộ để đăng ký</p>
          </div>
        </div>

        {renderStepIndicator()}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Thông tin cá nhân */}
          {step === 1 && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
              {renderField({
                label: 'Họ tên',
                name: 'fullName',
                placeholder: 'Nguyễn Văn A',
                required: true,
              })}

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

              {renderField({
                label: 'Số điện thoại',
                name: 'phone',
                placeholder: '0900000000',
                icon: Phone,
                required: true,
              })}

              {renderField({
                label: 'Email',
                name: 'email',
                type: 'email',
                placeholder: 'email@example.com',
                icon: Mail,
              })}

              {renderField({
                label: 'Địa chỉ thường trú',
                name: 'address',
                placeholder: 'Số nhà, đường, quận/huyện...',
                icon: MapPin,
              })}

              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Người liên hệ khẩn cấp</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={form.emergencyContactName}
                    onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                    placeholder="Họ tên người thân"
                  />
                  <Input
                    value={form.emergencyContactPhone}
                    onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                    placeholder="Số điện thoại"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={goToNextStep}>
                  Tiếp theo <ChevronRight size={16} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: CCCD / Hồ sơ */}
          {step === 2 && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
              {renderField({
                label: 'Số CCCD',
                name: 'identityNumber',
                placeholder: '012345678901',
                icon: Shield,
                required: true,
              })}

              {renderField({
                label: 'Nơi cấp',
                name: 'issuePlace',
                placeholder: 'Cục CS QLHC về TTXH',
              })}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày cấp</label>
                  <Input
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày hết hạn</label>
                  <Input
                    type="date"
                    value={form.expiredDate}
                    onChange={(e) => setForm({ ...form, expiredDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Ảnh CCCD</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-[#1f4f46] hover:bg-slate-50 transition">
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
                          <Upload size={32} className="mx-auto text-slate-400" />
                          <p className="mt-2 text-sm text-slate-500">Mặt trước</p>
                        </>
                      )}
                    </label>
                  </div>
                  <div>
                    <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-[#1f4f46] hover:bg-slate-50 transition">
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
                          <Upload size={32} className="mx-auto text-slate-400" />
                          <p className="mt-2 text-sm text-slate-500">Mặt sau</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={goToPrevStep}>
                  <ArrowLeft size={16} /> Quay lại
                </Button>
                <Button type="button" onClick={goToNextStep}>
                  Tiếp theo <ChevronRight size={16} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Căn hộ & Tài khoản */}
          {step === 3 && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Căn hộ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.apartmentId}
                    onChange={(e) => handleFieldChange('apartmentId', e.target.value)}
                    onBlur={() => handleFieldBlur('apartmentId')}
                    className={`w-full rounded-xl border ${
                      hasError('apartmentId') ? 'border-rose-300' : 'border-slate-200'
                    } bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]`}
                  >
                    <option value="">Chọn căn hộ</option>
                    {apartments.map((apt) => (
                      <option key={apt.ApartmentID} value={apt.ApartmentID}>
                        {apt.ApartmentCode} - {apt.BuildingName} (Tầng {apt.FloorNumber})
                      </option>
                    ))}
                  </select>
                  {renderError('apartmentId')}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Quan hệ</label>
                  <select
                    value={form.relationship}
                    onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
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
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Ngày chuyển vào <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={form.moveInDate}
                  onChange={(e) => handleFieldChange('moveInDate', e.target.value)}
                  onBlur={() => handleFieldBlur('moveInDate')}
                  className={hasError('moveInDate') ? 'border-rose-300' : ''}
                />
                {renderError('moveInDate')}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Tài khoản đăng nhập (tùy chọn)</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-500">Tên đăng nhập</label>
                    <Input
                      value={form.username}
                      onChange={(e) => handleFieldChange('username', e.target.value)}
                      onBlur={() => handleFieldBlur('username')}
                      placeholder="Tên đăng nhập"
                      icon={User}
                      className={hasError('username') ? 'border-rose-300' : ''}
                    />
                    {renderError('username')}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-500">Mật khẩu</label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      onBlur={() => handleFieldBlur('password')}
                      placeholder="Mật khẩu"
                      icon={Lock}
                      className={hasError('password') ? 'border-rose-300' : ''}
                    />
                    {renderError('password')}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Nếu để trống, cư dân sẽ đăng nhập bằng số điện thoại
                </p>
              </div>

              {/* 🔥 HIỂN THỊ TỔNG HỢP LỖI */}
              {Object.keys(serverErrors).length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-rose-700">Vui lòng sửa các lỗi sau:</p>
                      <ul className="mt-1 text-sm text-rose-600 list-disc list-inside">
                        {Object.entries(serverErrors).map(([field, error]) => (
                          <li key={field}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={goToPrevStep}>
                  <ArrowLeft size={16} /> Quay lại
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Đăng ký cư dân
                </Button>
              </div>
            </motion.div>
          )}
        </form>
      </Card>
    </motion.div>
  );
}