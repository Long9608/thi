// src/pages/RegisterService.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, CheckCircle2, X, RefreshCw,
  FileText, Home, Users, Calendar, Clock,
  Wrench, Dumbbell, Waves, Wifi, Tv,
  Coffee, Sparkles, Package, AlertCircle,
  Building2  // 🔥 ĐÃ THÊM
} from 'lucide-react';
import { serviceAPI, contractAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money } from '../utils/formatters';

export default function RegisterService({ flash }) {
  const [services, setServices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    contractId: '',
    serviceId: '',
    quantity: 1,
    endDate: ''
  });
  const [categories, setCategories] = useState([]);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await serviceAPI.getAll(search, selectedCategory);
      console.log('📊 Services:', res);
      
      const data = res?.data || res || [];
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching services:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải dịch vụ'));
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, flash]);

  const fetchContracts = useCallback(async () => {
    try {
      const res = await contractAPI.getAll('', 1, 999);
      const data = res?.data || res || [];
      setContracts(Array.isArray(data) ? data.filter(c => c.StatusID === 2) : []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await serviceAPI.getCategories();
      const data = res?.data || res || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchContracts();
    fetchCategories();
  }, [fetchServices, fetchContracts, fetchCategories]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await serviceAPI.register({
        contractId: parseInt(form.contractId),
        serviceId: parseInt(form.serviceId),
        quantity: parseInt(form.quantity),
        endDate: form.endDate || null
      });

      if (flash) flash('✅ Đăng ký dịch vụ thành công!');
      setModalOpen(false);
      setForm({ contractId: '', serviceId: '', quantity: 1, endDate: '' });
      fetchServices();
    } catch (error) {
      console.error('Register error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể đăng ký dịch vụ'));
    } finally {
      setLoading(false);
    }
  };

  // 🔥 SỬA HÀM NÀY - DÙNG ICON ĐÃ IMPORT
  const getServiceIcon = (serviceName) => {
    if (!serviceName) return <Wrench size={20} />;
    
    const name = serviceName.toLowerCase();
    if (name.includes('quản lý') || name.includes('vận hành')) {
      return <Building2 size={20} />;
    }
    if (name.includes('internet') || name.includes('wifi') || name.includes('fpt')) {
      return <Wifi size={20} />;
    }
    if (name.includes('bể bơi') || name.includes('hồ bơi')) {
      return <Waves size={20} />;
    }
    if (name.includes('gym') || name.includes('thể dục')) {
      return <Dumbbell size={20} />;
    }
    if (name.includes('truyền hình') || name.includes('tv')) {
      return <Tv size={20} />;
    }
    return <Wrench size={20} />;
  };

  const filteredServices = services.filter(s => 
    s.ServiceName?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: services.length,
    active: services.filter(s => s.Status === 1).length,
    registered: services.reduce((sum, s) => sum + (s.ActiveRegistrations || 0), 0)
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Đăng ký dịch vụ</h3>
            <p className="text-sm text-slate-500">
              Đăng ký dịch vụ công ích cho cư dân.
              <span className="ml-2 text-[#1f4f46] font-semibold">
                {stats.registered} lượt đăng ký
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm dịch vụ..."
              className="w-48"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map(c => (
                <option key={c.CategoryID} value={c.CategoryID}>
                  {c.CategoryName}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={fetchServices} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Wrench} label="Tổng dịch vụ" value={stats.total} hint="Đang quản lý" />
        <StatCard icon={CheckCircle2} label="Đang hoạt động" value={stats.active} hint="Có thể đăng ký" />
        <StatCard icon={Users} label="Đã đăng ký" value={stats.registered} hint="Lượt đăng ký" />
      </div>

      {/* Services List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách dịch vụ...</p>
        </Card>
      ) : filteredServices.length === 0 ? (
        <Card className="p-8 text-center">
          <Wrench size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có dịch vụ</h3>
          <p className="text-sm text-slate-500">Chưa có dịch vụ nào trong hệ thống</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((service) => (
            <Card key={service.ServiceID} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#eef5f2] p-2 text-[#1f4f46] group-hover:bg-[#1f4f46] group-hover:text-white transition">
                      {getServiceIcon(service.ServiceName)}
                    </div>
                    <div>
                      <Badge tone="slate" className="mb-1">{service.CategoryName}</Badge>
                      <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                        {service.ServiceName}
                      </h3>
                      <p className="text-sm text-slate-500">{service.Unit || 'Dịch vụ'}</p>
                    </div>
                  </div>
                  <Badge tone={service.Status === 1 ? 'green' : 'red'}>
                    {service.Status === 1 ? 'Hoạt động' : 'Tạm dừng'}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Giá</span>
                    <span className="font-bold text-[#1f4f46]">{money(service.Price)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Đã đăng ký</span>
                    <span className="font-bold text-slate-950">{service.ActiveRegistrations || 0}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <Button 
                    className="w-full"
                    disabled={service.Status !== 1}
                    onClick={() => {
                      setSelectedService(service);
                      setForm({ ...form, serviceId: service.ServiceID });
                      setModalOpen(true);
                    }}
                  >
                    <Plus size={14} /> Đăng ký
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Register Modal */}
      <Modal
        open={modalOpen}
        title="Đăng ký dịch vụ"
        description={`Đăng ký dịch vụ ${selectedService?.ServiceName}`}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleRegister} className="space-y-4">
          {selectedService && (
            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Dịch vụ</span>
                <span className="font-bold text-slate-950">{selectedService.ServiceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Giá</span>
                <span className="font-bold text-[#1f4f46]">{money(selectedService.Price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Đơn vị</span>
                <span className="font-bold text-slate-950">{selectedService.Unit || 'Tháng'}</span>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Hợp đồng *</label>
            <select
              value={form.contractId}
              onChange={(e) => setForm({ ...form, contractId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
              required
            >
              <option value="">Chọn hợp đồng</option>
              {contracts.map(c => (
                <option key={c.ContractID} value={c.ContractID}>
                  {c.ContractNumber} - {c.ApartmentCode} ({c.OwnerName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Số lượng</label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
              placeholder="1"
              min="1"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày kết thúc (tùy chọn)</label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">Để trống nếu đăng ký không giới hạn</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Đăng ký
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}