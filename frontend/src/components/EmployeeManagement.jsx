import { PermissionGate, createPermissionChecker } from '../permissions';
// src/components/EmployeeManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  UserRound, Plus, Search, Download, Edit, Trash2, 
  Mail, Phone, Calendar, MapPin, Shield, CheckCircle2,
  X, RefreshCw, MoreHorizontal, Eye, UserPlus, Users,
  Building2, CreditCard, Clock, AlertCircle
} from 'lucide-react';
// SỬA: Import userAPI từ api
import { userAPI, residentAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from './UI';

export default function EmployeeManagement({ flash }) {
  const { can } = createPermissionChecker(JSON.parse(localStorage.getItem('user') || '{}'));
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [roles, setRoles] = useState([]);
  const [availableResidents, setAvailableResidents] = useState([]);
  const [error, setError] = useState(null);

  // Form state
  const [form, setForm] = useState({
    username: '',
    password: '',
    residentId: '',
    email: '',
    phone: '',
    fullName: '',
    gender: 1,
    birthDate: '',
    address: '',
    cccd: '',
    hireDate: '',
    roleIds: []
  });

  useEffect(() => {
    fetchEmployees(roleFilter);
    fetchRoles();
  }, []);

  useEffect(() => {
    if (roleFilter !== '') fetchEmployees(roleFilter);
  }, [roleFilter]);

  // 🔥 Gọi API lấy danh sách nhân viên
  const fetchEmployees = async (selectedRoleId = roleFilter) => {
    try {
      setLoading(true);
      setError(null);
      const res = await userAPI.getEmployees('', '', selectedRoleId);
      console.log('📊 Employee API response:', res);
      
      if (res && res.data) {
        // Nếu API trả về data là mảng
        if (Array.isArray(res.data)) {
          setEmployees(res.data);
        } 
        // Nếu API trả về có cấu trúc { data: [...] }
        else if (res.data.data && Array.isArray(res.data.data)) {
          setEmployees(res.data.data);
        }
        // Nếu API trả về có cấu trúc khác
        else if (res.data.recordset && Array.isArray(res.data.recordset)) {
          setEmployees(res.data.recordset);
        }
        else {
          setEmployees([]);
        }
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      setError(error.message || 'Không thể tải danh sách nhân viên');
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách nhân viên'));
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Gọi API lấy danh sách roles
  const fetchRoles = async () => {
    try {
      const res = await userAPI.getEmployeeRoles();
      console.log('📊 Roles API response:', res);
      
      if (res && res.data) {
        if (Array.isArray(res.data)) {
          setRoles(res.data);
        } else if (res.data.data && Array.isArray(res.data.data)) {
          setRoles(res.data.data);
        } else if (res.data.recordset && Array.isArray(res.data.recordset)) {
          setRoles(res.data.recordset);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching roles:', error);
    }
  };

  // Lấy danh sách cư dân chưa có tài khoản
  const fetchResidentsWithoutAccount = async () => {
    try {
      const res = await residentAPI.getAll('', 1, 999, false);
      console.log('📊 Residents without account:', res);

      if (res && Array.isArray(res.data)) {
        setAvailableResidents(res.data);
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        setAvailableResidents(res.data.data);
      } else if (res?.data?.recordset && Array.isArray(res.data.recordset)) {
        setAvailableResidents(res.data.recordset);
      } else {
        setAvailableResidents([]);
      }
    } catch (error) {
      console.error('❌ Error fetching residents without account:', error);
      setAvailableResidents([]);
      if (flash) flash('❌ Không thể tải danh sách cư dân chưa có tài khoản');
    }
  };

  // 🔥 Tạo/cập nhật người dùng
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isResidentRole && !form.residentId) {
        if (flash) flash('❌ Vui lòng chọn cư dân chưa có tài khoản');
        return;
      }

      setLoading(true);
      
      const submitData = {
        username: form.username,
        status: form.status ?? 1,
        ...(form.password ? { password: form.password } : {}),
        residentId: form.residentId ? Number(form.residentId) : null,
        email: form.email,
        phone: form.phone,
        fullName: form.fullName,
        gender: form.gender,
        birthDate: form.birthDate || null,
        address: form.address,
        cccd: form.cccd,
        hireDate: form.hireDate || new Date().toISOString().split('T')[0],
        ...((JSON.parse(localStorage.getItem('user') || '{}').permissions || []).includes('ROLE_MANAGE') ? { roleIds: form.roleIds } : {})
      };

      let response;
      if (modalMode === 'create') {
        response = await userAPI.createEmployee(submitData);
        if (flash) flash('✅ Thêm người dùng thành công!');
      } else {
        response = await userAPI.updateAccount(selectedEmployee.UserID, submitData);
        if (flash) flash('✅ Cập nhật người dùng thành công!');
      }
      
      console.log('📊 Submit response:', response);
      setModalOpen(false);
      resetForm();
      await fetchEmployees(); // Tải lại danh sách
      
    } catch (error) {
      console.error('❌ Submit error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại'));
    } finally {
      setLoading(false);
    }
  };

  // Xóa vĩnh viễn tài khoản; hồ sơ cư dân vẫn được giữ lại nhưng mất liên kết đăng nhập.
  const handleDelete = async (userId) => {
    if (!confirm('Bạn có chắc muốn xóa vĩnh viễn tài khoản này? Thao tác không thể hoàn tác.')) return;
    try {
      setLoading(true);
      await userAPI.deleteEmployee(userId);
      if (flash) flash('✅ Đã xóa vĩnh viễn tài khoản!');
      await fetchEmployees();
    } catch (error) {
      console.error('❌ Delete error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa nhân viên'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      username: '',
      password: '',
      residentId: '',
      email: '',
      phone: '',
      fullName: '',
      gender: 1,
      birthDate: '',
      address: '',
      cccd: '',
      hireDate: '',
      roleIds: []
    });
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setSelectedEmployee(null);
    setModalOpen(true);
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setForm({
      status: Number(employee.Status),
      username: employee.Username || employee.username || '',
      password: '',
      residentId: employee.ResidentID || '',
      email: employee.Email || employee.email || '',
      phone: employee.Phone || employee.phone || '',
      fullName: employee.FullName || employee.fullName || '',
      gender: employee.Gender ?? employee.gender ?? 1,
      birthDate: employee.BirthDate || employee.birthDate ? new Date(employee.BirthDate || employee.birthDate).toISOString().split('T')[0] : '',
      address: employee.Address || employee.address || '',
      cccd: employee.CCCD || employee.cccd || '',
      hireDate: employee.HireDate || employee.hireDate ? new Date(employee.HireDate || employee.hireDate).toISOString().split('T')[0] : '',
      roleIds: employee.RoleIDs || employee.roleIds ? (employee.RoleIDs || employee.roleIds).split(',').map(Number) : []
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const openViewModal = (employee) => {
    setSelectedEmployee(employee);
    setModalMode('view');
    setModalOpen(true);
  };

  const getRoleNames = (employee) => {
    if (employee.RoleNames) return employee.RoleNames;
    if (employee.roleNames) return employee.roleNames;
    if (employee.Roles) return employee.Roles;
    return 'Chưa có vai trò';
  };

  const getStatusBadge = (status) => {
    return status ? 
      <Badge tone="green">Đang hoạt động</Badge> : 
      <Badge tone="red">Đã nghỉ</Badge>;
  };

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => {
      const fullName = e.FullName || e.fullName || '';
      const email = e.Email || e.email || '';
      const phone = e.Phone || e.phone || '';
      const username = e.Username || e.username || '';
      return fullName.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        phone.includes(q) ||
        username.toLowerCase().includes(q);
    });
  }, [employees, search]);

  // Kiểm tra form hiện có đang chọn vai trò RESIDENT hay không
  const residentRole = roles.find((role) => {
    const roleId = Number(role.RoleID || role.roleId || role.id);
    const roleCode = role.RoleCode || role.roleCode || role.code;
    return roleCode === 'RESIDENT' && form.roleIds.includes(roleId);
  });

  const isResidentRole = Boolean(residentRole);
  const isResidentCreate = isResidentRole && (modalMode === 'create' || !selectedEmployee?.ResidentID);

  // Khi chọn vai trò Cư dân trong form tạo mới, tải cư dân chưa có tài khoản
  useEffect(() => {
    if (modalOpen && isResidentCreate) {
      fetchResidentsWithoutAccount();
    }
  }, [modalOpen, isResidentCreate]);

  // Khi bỏ vai trò Cư dân thì bỏ lựa chọn cư dân cũ
  useEffect(() => {
    if (modalMode === 'create' && !isResidentRole && form.residentId) {
      setForm((prev) => ({ ...prev, residentId: '' }));
    }
  }, [modalMode, isResidentRole, form.residentId]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý người dùng</h3>
            <p className="text-sm text-slate-500">Quản lý người dùng, vai trò và phân quyền truy cập hệ thống.</p>
            {employees.length === 0 && !loading && (
              <Badge tone="amber" className="mt-2">⚠️ Chưa có dữ liệu</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input 
              icon={Search} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Tìm người dùng..." 
              className="w-48"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#635bff]"
            >
              <option value="">Tất cả quyền</option>
              {roles.map(role => <option key={role.RoleID || role.roleId || role.id} value={role.RoleID || role.roleId || role.id}>
                {role.RoleName || role.roleName || role.name}
              </option>)}
            </select>
            <PermissionGate permission="EMPLOYEE_CREATE"><Button onClick={openCreateModal} disabled={loading}>
              <Plus size={16} /> Thêm người dùng
            </Button></PermissionGate>
            <Button variant="secondary" onClick={fetchEmployees} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Users}
          label="Tổng tài khoản"
          value={employees.length}
          hint="Tài khoản nhân viên và cư dân"
        />
        <StatCard
          icon={CheckCircle2}
          label="Đang hoạt động"
          value={employees.filter(e => Number(e.Status ?? e.status ?? 1) === 1).length}
          hint="Tài khoản có thể đăng nhập"
        />
        <StatCard 
          icon={Shield} 
          label="Vai trò" 
          value={roles.length} 
          hint="Vai trò trong hệ thống" 
        />
        <StatCard 
          icon={Clock} 
          label="Mới nhất" 
          value={employees.length > 0 ? 'Hôm nay' : 'Chưa có'} 
          hint="Nhân viên mới nhất" 
        />
      </div>

      {/* Error */}
      {error && (
        <Card className="p-4 border-rose-200 bg-rose-50">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchEmployees} className="ml-auto">
              <RefreshCw size={14} /> Thử lại
            </Button>
          </div>
        </Card>
      )}

      {/* Employee List */}
      {loading ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={32} className="animate-spin text-[#635bff]" />
            <p className="font-bold text-slate-900">Đang tải danh sách nhân viên...</p>
          </div>
        </Card>
      ) : filteredEmployees.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Users size={48} className="text-slate-300" />
            <h3 className="text-xl font-bold text-slate-900">Chưa có người dùng</h3>
            <p className="text-sm text-slate-500">Nhấn "Thêm người dùng" để tạo mới</p>
            <PermissionGate permission="EMPLOYEE_CREATE"><Button onClick={openCreateModal}>
              <Plus size={16} /> Thêm người dùng
            </Button></PermissionGate>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <Card key={employee.UserID} className="group hover:border-[#635bff]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0efff] text-[#635bff] font-bold text-lg">
                      {(employee.FullName || employee.fullName || '?').charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-950 group-hover:text-[#635bff]">
                        {employee.FullName || employee.fullName}
                      </h3>
                      <p className="text-xs text-slate-500">@{employee.Username || employee.username}</p>
                    </div>
                  </div>
                  {getStatusBadge(employee.Status !== undefined ? employee.Status : (employee.status !== undefined ? employee.status : 1))}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={14} />
                    <span>{employee.Email || employee.email || 'Chưa có email'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} />
                    <span>{employee.Phone || employee.phone || 'Chưa có số điện thoại'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Shield size={14} />
                    <span>{getRoleNames(employee)}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={() => openViewModal(employee)}
                  >
                    <Eye size={14} /> Xem
                  </Button>
                  <PermissionGate permission="EMPLOYEE_UPDATE"><Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={() => openEditModal(employee)}
                  >
                    <Edit size={14} /> Sửa
                  </Button></PermissionGate>
                  <PermissionGate permission="EMPLOYEE_DELETE"><Button 
                    variant="danger" 
                    className="flex-1" 
                    onClick={() => handleDelete(employee.UserID || employee.userId)}
                  >
                    <Trash2 size={14} />
                  </Button></PermissionGate>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal 
        open={modalOpen} 
        title={modalMode === 'create' ? 'Thêm người dùng mới' : 
               modalMode === 'edit' ? 'Cập nhật người dùng' : 
               'Thông tin người dùng'}
        description={modalMode === 'view' ? 'Xem chi tiết hồ sơ người dùng' : 'Nhập thông tin người dùng'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {modalMode === 'view' && selectedEmployee ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0efff] text-[#635bff] text-2xl font-bold">
                {(selectedEmployee.FullName || selectedEmployee.fullName || '?').charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold">{selectedEmployee.FullName || selectedEmployee.fullName}</h3>
                <p className="text-sm text-slate-500">@{selectedEmployee.Username || selectedEmployee.username}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><span className="text-sm text-slate-500">Email</span><p className="font-medium">{selectedEmployee.Email || selectedEmployee.email || 'Chưa có'}</p></div>
              <div><span className="text-sm text-slate-500">Số điện thoại</span><p className="font-medium">{selectedEmployee.Phone || selectedEmployee.phone || 'Chưa có'}</p></div>
              <div><span className="text-sm text-slate-500">Giới tính</span><p className="font-medium">{selectedEmployee.Gender || selectedEmployee.gender ? 'Nam' : 'Nữ'}</p></div>
              <div><span className="text-sm text-slate-500">Ngày sinh</span><p className="font-medium">{selectedEmployee.BirthDate || selectedEmployee.birthDate || 'Chưa cập nhật'}</p></div>
              <div className="md:col-span-2"><span className="text-sm text-slate-500">Địa chỉ</span><p className="font-medium">{selectedEmployee.Address || selectedEmployee.address || 'Chưa có'}</p></div>
              <div><span className="text-sm text-slate-500">CCCD</span><p className="font-medium">{selectedEmployee.CCCD || selectedEmployee.cccd || 'Chưa có'}</p></div>
              <div><span className="text-sm text-slate-500">Ngày vào làm</span><p className="font-medium">{selectedEmployee.HireDate || selectedEmployee.hireDate || 'Chưa cập nhật'}</p></div>
              <div className="md:col-span-2"><span className="text-sm text-slate-500">Vai trò</span><p className="font-medium">{getRoleNames(selectedEmployee)}</p></div>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Tên đăng nhập *</label>
                <Input 
                  value={form.username} 
                  onChange={(e) => setForm({...form, username: e.target.value})} 
                  placeholder="username" 
                  required 
                  disabled={modalMode === 'edit'}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Mật khẩu {modalMode === 'edit' && '(để trống nếu không đổi)'}</label>
                <Input 
                  type="password"
                  value={form.password} 
                  onChange={(e) => setForm({...form, password: e.target.value})} 
                  placeholder={modalMode === 'edit' ? '********' : 'Nhập mật khẩu'} 
                  required={modalMode === 'create'}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Họ tên *</label>
                <Input 
                  value={form.fullName} 
                  onChange={(e) => setForm({...form, fullName: e.target.value})} 
                  placeholder="Nguyễn Văn A" 
                  required 
                  disabled={isResidentCreate}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                <Input 
                  type="email"
                  value={form.email} 
                  onChange={(e) => setForm({...form, email: e.target.value})} 
                  placeholder="nhanvien@ducvu.vn" 
                  disabled={isResidentCreate}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Số điện thoại</label>
                <Input 
                  value={form.phone} 
                  onChange={(e) => setForm({...form, phone: e.target.value})} 
                  placeholder="0900000000" 
                  disabled={isResidentCreate}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Giới tính</label>
                <select 
                  value={form.gender} 
                  onChange={(e) => setForm({...form, gender: parseInt(e.target.value)})}
                  disabled={isResidentCreate}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#635bff]"
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
                  onChange={(e) => setForm({...form, birthDate: e.target.value})} 
                  disabled={isResidentCreate}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Địa chỉ</label>
              <Input 
                value={form.address} 
                onChange={(e) => setForm({...form, address: e.target.value})} 
                placeholder="Số nhà, đường, quận/huyện..." 
                disabled={isResidentCreate}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">CCCD</label>
                <Input 
                  value={form.cccd} 
                  onChange={(e) => setForm({...form, cccd: e.target.value})} 
                  placeholder="012345678901" 
                  disabled={isResidentCreate}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày vào làm</label>
                <Input 
                  type="date"
                  value={form.hireDate} 
                  onChange={(e) => setForm({...form, hireDate: e.target.value})} 
                  disabled={isResidentCreate}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Vai trò</label>
              <select 
                multiple
                disabled={!can('ROLE_MANAGE')}
                value={form.roleIds} 
                onChange={(e) => {
                  const options = e.target.options;
                  const values = [];
                  for (let i = 0; i < options.length; i++) {
                    if (options[i].selected) {
                      values.push(parseInt(options[i].value));
                    }
                  }
                  setForm({...form, roleIds: values});
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#635bff] min-h-[100px]"
              >
                {roles.map(role => (
                  <option key={role.RoleID || role.roleId || role.id} value={role.RoleID || role.roleId || role.id}>
                    {role.RoleName || role.roleName || role.name} ({role.RoleCode || role.roleCode || role.code})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Giữ Ctrl để chọn nhiều vai trò</p>
            </div>

            {modalMode === 'edit' && <div><label className="mb-1 block text-sm font-semibold">Trạng thái tài khoản</label><select className="w-full rounded-xl border p-3" value={form.status ?? 1} onChange={e => setForm({...form,status:Number(e.target.value)})}><option value={1}>Đang hoạt động</option><option value={0}>Khóa tài khoản</option></select></div>}
            {isResidentCreate && (
              <div className="rounded-xl border border-[#635bff]/20 bg-[#f8f7ff] p-4">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Chọn cư dân chưa có tài khoản *
                </label>
                <select
                  value={form.residentId}
                  onChange={(e) => {
                    const residentId = e.target.value;
                    const resident = availableResidents.find(
                      (item) => String(item.ResidentID || item.residentId) === String(residentId)
                    );

                    if (!resident) {
                      setForm((prev) => ({ ...prev, residentId: '' }));
                      return;
                    }

                    const birthDate = resident.BirthDate || resident.birthDate;

                    setForm((prev) => ({
                      ...prev,
                      residentId,
                      fullName: resident.FullName || resident.fullName || '',
                      email: resident.Email || resident.email || '',
                      phone: resident.Phone || resident.phone || '',
                      gender:
                        resident.Gender !== undefined && resident.Gender !== null
                          ? Number(resident.Gender)
                          : (resident.gender !== undefined && resident.gender !== null
                              ? Number(resident.gender)
                              : 1),
                      birthDate: birthDate
                        ? new Date(birthDate).toISOString().split('T')[0]
                        : '',
                      address: resident.Address || resident.address || '',
                      cccd: resident.IdentityNumber || resident.identityNumber || ''
                    }));
                  }}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#635bff]"
                >
                  <option value="">-- Chọn cư dân --</option>
                  {availableResidents.map((resident) => (
                    <option
                      key={resident.ResidentID || resident.residentId}
                      value={resident.ResidentID || resident.residentId}
                    >
                      {resident.FullName || resident.fullName || 'Không có tên'}
                      {' - '}
                      {resident.ApartmentCode || resident.apartmentCode || 'Chưa có căn hộ'}
                      {' - '}
                      {resident.Phone || resident.phone || 'Chưa có SĐT'}
                    </option>
                  ))}
                </select>

                {availableResidents.length === 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-600">
                    Không có cư dân nào chưa có tài khoản.
                  </p>
                )}

                {form.residentId && (
                  <p className="mt-2 text-xs text-slate-500">
                    Thông tin bên trên được lấy trực tiếp từ hồ sơ cư dân đã chọn.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {modalMode === 'create' ? 'Thêm người dùng' : 'Cập nhật'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
