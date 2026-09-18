// src/pages/CreateContract.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Save, X, RefreshCw, CheckCircle2,
  Home, Users, Calendar, CreditCard, AlertCircle,
  ArrowLeft, ChevronRight, UserPlus, Trash2,
  Search, Building2, Phone, Mail, User
} from 'lucide-react';
import { contractAPI, apartmentAPI, residentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money, getInitials } from '../utils/formatters';

export default function CreateContract({ flash, onSuccess }) {
  const FIXED_MONTHLY_RENT = 7500000;

  const [loading, setLoading] = useState(false);
  const [apartments, setApartments] = useState([]);
  const [residents, setResidents] = useState([]);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [selectedResident, setSelectedResident] = useState(null);
  const [step, setStep] = useState(1);
  const [searchApartment, setSearchApartment] = useState('');
  const [searchResident, setSearchResident] = useState('');
  const [form, setForm] = useState({
    apartmentId: '',
    ownerId: '',
    contractNumber: '',
    signDate: new Date().toISOString().split('T')[0],
    startDate: '',
    endDate: '',
    deposit: FIXED_MONTHLY_RENT,
    rent: FIXED_MONTHLY_RENT,
    contractTermMonths: '',
    depositMonths: 1,
    paymentCycleMonths: 1,
    monthlyBillingDay: 10,
    signedContractImageFile: null,
    residents: [],
    services: []
  });

  const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN');
  const addMonthsToDate = (dateValue, months) => {
    if (!dateValue || !months) return '';
    const date = new Date(dateValue);
    date.setMonth(date.getMonth() + Number(months));
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };
  const updateContractTerm = (months) => {
    setForm((prev) => ({
      ...prev,
      contractTermMonths: months,
      endDate: months ? addMonthsToDate(prev.startDate, months) : prev.endDate
    }));
  };
  const updateStartDate = (startDate) => {
    setForm((prev) => ({
      ...prev,
      startDate,
      endDate: prev.contractTermMonths ? addMonthsToDate(startDate, prev.contractTermMonths) : prev.endDate
    }));
  };

  useEffect(() => {
    fetchApartments();
    fetchResidents();
  }, []);

  const fetchApartments = async () => {
    try {
      const res = await apartmentAPI.getAll('', '1', 1, 999);
      const data = res?.data || res || [];
      setApartments(Array.isArray(data) ? data.filter(a => a.StatusID === 1) : []);
    } catch (error) {
      console.error('Error fetching apartments:', error);
    }
  };

  const fetchResidents = async () => {
    try {
      const res = await residentAPI.getAll('', 1, 999);
      const data = res?.data || res || [];
      setResidents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching residents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        apartmentId: form.apartmentId,
        ownerId: form.ownerId,
        contractNumber: form.contractNumber,
        signDate: form.signDate,
        startDate: form.startDate,
        endDate: form.endDate,
        deposit: Number(form.depositMonths || 1) * FIXED_MONTHLY_RENT,
        rent: FIXED_MONTHLY_RENT,
        contractTermMonths: form.contractTermMonths || null,
        depositMonths: form.depositMonths,
        paymentCycleMonths: form.paymentCycleMonths,
        monthlyBillingDay: 10,
        statusId: 2,
        residents: form.residents.map(r => ({
          residentId: r.ResidentID,
          relationship: r.Relationship || 'Chủ hộ'
        }))
      };

      const createResult = await contractAPI.create(data);
      const createdContractId = createResult?.data?.contractId;
      if (form.signedContractImageFile && createdContractId) {
        await contractAPI.uploadSignedImage(createdContractId, form.signedContractImageFile);
      }
      if (flash) flash('✅ Tạo hợp đồng thành công!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Create contract error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tạo hợp đồng'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectApartment = (apartment) => {
    setSelectedApartment(apartment);
    setForm({ ...form, apartmentId: apartment.ApartmentID });
    // Tự động sinh mã hợp đồng
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setForm(prev => ({
      ...prev,
      contractNumber: `HD-${apartment.ApartmentCode}-${year}${month}${day}`,
      apartmentId: apartment.ApartmentID
    }));
    setStep(2);
  };

  const handleSelectResident = (resident) => {
    if (form.residents.find(r => r.ResidentID === resident.ResidentID)) {
      flash('⚠️ Cư dân này đã được thêm vào hợp đồng');
      return;
    }
    setForm(prev => ({
      ...prev,
      residents: [...prev.residents, { ...resident, Relationship: 'Chủ hộ' }]
    }));
    setSelectedResident(null);
    setSearchResident('');
  };

  const removeResident = (residentId) => {
    setForm(prev => ({
      ...prev,
      residents: prev.residents.filter(r => r.ResidentID !== residentId)
    }));
  };

  const filteredApartments = apartments.filter(a =>
    a.ApartmentCode?.toLowerCase().includes(searchApartment.toLowerCase()) ||
    a.BuildingName?.toLowerCase().includes(searchApartment.toLowerCase())
  );

  const filteredResidents = residents.filter(r =>
    r.FullName?.toLowerCase().includes(searchResident.toLowerCase()) ||
    r.Phone?.includes(searchResident)
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-[#f0efff] p-3 text-[#635bff]">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-950">Tạo hợp đồng mới</h3>
            <p className="text-sm text-slate-500">Nhập thông tin để tạo hợp đồng thuê căn hộ</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${
                  s === step
                    ? 'bg-[#635bff] text-white'
                    : s < step
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
                onClick={() => s < step && setStep(s)}
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
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Chọn căn hộ */}
          {step === 1 && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
              <h4 className="font-bold text-slate-950 mb-4">Chọn căn hộ</h4>
              <Input
                icon={Search}
                value={searchApartment}
                onChange={(e) => setSearchApartment(e.target.value)}
                placeholder="Tìm căn hộ trống..."
                className="mb-4"
              />
              <div className="max-h-80 overflow-y-auto space-y-2">
                {filteredApartments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Home size={48} className="mx-auto mb-3 text-slate-300" />
                    <p>Không có căn hộ trống</p>
                  </div>
                ) : (
                  filteredApartments.map(apartment => (
                    <button
                      key={apartment.ApartmentID}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-[#635bff] hover:bg-slate-50 transition"
                      onClick={() => handleSelectApartment(apartment)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0efff] text-[#635bff]">
                          <Home size={18} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-950">{apartment.ApartmentCode}</p>
                          <p className="text-sm text-slate-500">
                            {apartment.BuildingName} - Tầng {apartment.FloorNumber} · {apartment.Area} m²
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2: Chọn chủ hộ và thông tin cơ bản */}
          {step === 2 && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4 mb-4">
                <div className="flex items-center gap-3">
                  <Badge tone="green">Căn hộ đã chọn</Badge>
                  <span className="font-bold text-slate-950">{selectedApartment?.ApartmentCode}</span>
                  <span className="text-sm text-slate-500">{selectedApartment?.BuildingName}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={14} /> Đổi căn hộ
                </Button>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Chủ hộ</label>
                <div className="flex gap-2">
                  <Input
                    icon={Search}
                    value={searchResident}
                    onChange={(e) => setSearchResident(e.target.value)}
                    placeholder="Tìm cư dân..."
                    className="flex-1"
                  />
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {filteredResidents.slice(0, 5).map(resident => (
                    <button
                      key={resident.ResidentID}
                      className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-slate-50 transition"
                      onClick={() => handleSelectResident(resident)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0efff] text-xs font-bold text-[#635bff]">
                        {getInitials(resident.FullName)}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-slate-950">{resident.FullName}</p>
                        <p className="text-xs text-slate-500">{resident.Phone}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Danh sách cư dân đã chọn */}
                {form.residents.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-700">Cư dân trong hợp đồng</p>
                    {form.residents.map((resident, idx) => (
                      <div key={resident.ResidentID} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 mt-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0efff] text-xs font-bold text-[#635bff]">
                            {getInitials(resident.FullName)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-950">{resident.FullName}</p>
                            <p className="text-xs text-slate-500">{resident.Phone}</p>
                          </div>
                          <Badge tone="blue">{resident.Relationship || 'Chủ hộ'}</Badge>
                        </div>
                        <button onClick={() => removeResident(resident.ResidentID)} className="text-rose-500 hover:text-rose-700">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Mã hợp đồng *</label>
                  <Input
                    value={form.contractNumber}
                    onChange={(e) => setForm({ ...form, contractNumber: e.target.value })}
                    placeholder="HD-A-20250101"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày ký</label>
                  <Input
                    type="date"
                    value={form.signDate}
                    onChange={(e) => setForm({ ...form, signDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày bắt đầu *</label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="block text-sm font-semibold text-slate-700">Ngày kết thúc *</label>
                    <div className="flex gap-1">
                      {[3, 6, 12].map((months) => (
                        <button
                          key={months}
                          type="button"
                          onClick={() => updateContractTerm(form.contractTermMonths === months ? '' : months)}
                          className={`rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                            form.contractTermMonths === months
                              ? 'border-[#635bff] bg-[#635bff] text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {months} tháng
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    disabled={Boolean(form.contractTermMonths)}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Chưa chọn thời hạn thì tự chọn ngày kết thúc. Chọn 3/6/12 tháng thì tự tính.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Tiền cọc (VND)</label>
                  <div className="flex gap-2">
                    {[1, 2].map((months) => (
                      <button
                        key={months}
                        type="button"
                        onClick={() => setForm({
                          ...form,
                          depositMonths: months,
                          deposit: months * FIXED_MONTHLY_RENT
                        })}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                          Number(form.depositMonths) === months
                            ? 'border-[#635bff] bg-[#635bff] text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Cọc {months} tháng
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#635bff]">
                    {formatVnd(Number(form.depositMonths || 1) * FIXED_MONTHLY_RENT)} VNĐ
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Giá thuê / tháng *</label>
                  <Input
                    value={`${formatVnd(FIXED_MONTHLY_RENT)} VNĐ`}
                    readOnly
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Chu kỳ đóng tiền</label>
                  <div className="flex gap-2">
                    {[1, 3].map((months) => (
                      <button
                        key={months}
                        type="button"
                        onClick={() => setForm({ ...form, paymentCycleMonths: months })}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                          Number(form.paymentCycleMonths) === months
                            ? 'border-[#635bff] bg-[#635bff] text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {months} tháng / lần
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày chốt tiền hàng tháng</label>
                  <Input value="Ngày 10 hằng tháng" readOnly />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Ảnh hợp đồng đã ký</label>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 hover:border-[#635bff] hover:bg-slate-50">
                  <span>{form.signedContractImageFile ? form.signedContractImageFile.name : 'Chọn ảnh hợp đồng đã ký...'}</span>
                  <span className="font-semibold text-[#635bff]">Tải ảnh lên</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setForm({ ...form, signedContractImageFile: e.target.files?.[0] || null })}
                  />
                </label>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} /> Quay lại
                </Button>
                <Button type="button" onClick={() => setStep(3)}>
                  Tiếp theo <ChevronRight size={16} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Xác nhận và tạo */}
          {step === 3 && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-800">Xác nhận thông tin hợp đồng</h4>
                    <p className="text-sm text-emerald-700">Vui lòng kiểm tra lại thông tin trước khi tạo</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-500">Thông tin căn hộ</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div><span className="text-slate-500">Mã:</span> <span className="font-medium">{selectedApartment?.ApartmentCode}</span></div>
                    <div><span className="text-slate-500">Tòa nhà:</span> <span className="font-medium">{selectedApartment?.BuildingName}</span></div>
                    <div><span className="text-slate-500">Tầng:</span> <span className="font-medium">{selectedApartment?.FloorNumber}</span></div>
                    <div><span className="text-slate-500">Diện tích:</span> <span className="font-medium">{selectedApartment?.Area} m²</span></div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-500">Thông tin hợp đồng</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div><span className="text-slate-500">Mã HĐ:</span> <span className="font-medium">{form.contractNumber}</span></div>
                    <div><span className="text-slate-500">Ngày ký:</span> <span className="font-medium">{formatDate(form.signDate)}</span></div>
                    <div><span className="text-slate-500">Thời hạn:</span> <span className="font-medium">{formatDate(form.startDate)} → {formatDate(form.endDate)}</span></div>
                    <div><span className="text-slate-500">Giá thuê:</span> <span className="font-medium text-[#635bff]">{money(FIXED_MONTHLY_RENT)}/tháng</span></div>
                    <div><span className="text-slate-500">Tiền cọc:</span> <span className="font-medium">{money(Number(form.depositMonths || 1) * FIXED_MONTHLY_RENT)} ({form.depositMonths} tháng)</span></div>
                    <div><span className="text-slate-500">Chu kỳ đóng:</span> <span className="font-medium">{form.paymentCycleMonths} tháng / lần</span></div>
                    <div><span className="text-slate-500">Ngày chốt tiền:</span> <span className="font-medium">Ngày 10 hằng tháng</span></div>
                    <div><span className="text-slate-500">Ảnh hợp đồng:</span> <span className="font-medium">{form.signedContractImageFile?.name || 'Chưa chọn'}</span></div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Cư dân trong hợp đồng</p>
                <div className="mt-2 space-y-1">
                  {form.residents.map((resident, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{resident.FullName}</span>
                      <Badge tone="slate">{resident.Relationship}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                  <ArrowLeft size={16} /> Quay lại
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  Tạo hợp đồng
                </Button>
              </div>
            </motion.div>
          )}
        </form>
      </Card>
    </motion.div>
  );
}
