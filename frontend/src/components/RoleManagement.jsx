// src/components/RoleManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Plus, Search, Edit, Trash2, 
  Users, CheckCircle2, X, RefreshCw, 
  Key, Lock, Eye, UserPlus, AlertCircle
} from 'lucide-react';
import { userAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from './UI';

export default function RoleManagement({ flash }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({
    roleCode: '',
    roleName: '',
    description: '',
    status: 1
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await userAPI.getRoles();
      console.log('📊 Roles response:', res);
      
      if (res && res.data) {
        if (Array.isArray(res.data)) {
          setRoles(res.data);
        } else if (res.data.data && Array.isArray(res.data.data)) {
          setRoles(res.data.data);
        } else if (res.data.recordset && Array.isArray(res.data.recordset)) {
          setRoles(res.data.recordset);
        } else {
          setRoles([]);
        }
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error('❌ Error fetching roles:', error);
      setError(error.message || 'Không thể tải danh sách vai trò');
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách vai trò'));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const data = {
        roleCode: form.roleCode,
        roleName: form.roleName,
        description: form.description,
        status: form.status
      };

      if (modalMode === 'create') {
        await userAPI.createRole(data);
        if (flash) flash('✅ Tạo vai trò thành công!');
      } else {
        await userAPI.updateRole(selectedRole?.RoleID || selectedRole?.id, data);
        if (flash) flash('✅ Cập nhật vai trò thành công!');
      }
      
      setModalOpen(false);
      resetForm();
      await fetchRoles();
    } catch (error) {
      console.error('❌ Submit error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Có lỗi xảy ra'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa vai trò này?')) return;
    try {
      setLoading(true);
      await userAPI.deleteRole(id);
      if (flash) flash('✅ Xóa vai trò thành công!');
      await fetchRoles();
    } catch (error) {
      console.error('❌ Delete error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa vai trò'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      roleCode: '',
      roleName: '',
      description: '',
      status: 1
    });
    setSelectedRole(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditModal = (role) => {
    setSelectedRole(role);
    setForm({
      roleCode: role.RoleCode || role.roleCode || '',
      roleName: role.RoleName || role.roleName || '',
      description: role.Description || role.description || '',
      status: role.Status !== undefined ? role.Status : (role.status !== undefined ? role.status : 1)
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const getStatusBadge = (status) => {
    return status ? 
      <Badge tone="green">Hoạt động</Badge> : 
      <Badge tone="red">Khóa</Badge>;
  };

  const filteredRoles = useMemo(() => {
    const q = search.toLowerCase();
    return roles.filter(r => {
      const name = r.RoleName || r.roleName || '';
      const code = r.RoleCode || r.roleCode || '';
      const desc = r.Description || r.description || '';
      return name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q);
    });
  }, [roles, search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý vai trò</h3>
            <p className="text-sm text-slate-500">Quản lý các vai trò trong hệ thống và phân quyền truy cập.</p>
            {roles.length === 0 && !loading && (
              <Badge tone="amber" className="mt-2">⚠️ Chưa có vai trò</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input 
              icon={Search} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Tìm vai trò..." 
              className="w-48"
            />
            <Button onClick={openCreateModal} disabled={loading}>
              <Plus size={16} /> Tạo vai trò
            </Button>
            <Button variant="secondary" onClick={fetchRoles} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          icon={Shield} 
          label="Tổng vai trò" 
          value={roles.length} 
          hint="Vai trò trong hệ thống" 
        />
        <StatCard 
          icon={CheckCircle2} 
          label="Đang hoạt động" 
          value={roles.filter(r => (r.Status || r.status || 1) === 1).length} 
          hint="Vai trò đang sử dụng" 
        />
        <StatCard 
          icon={Users} 
          label="Người dùng" 
          value={roles.reduce((sum, r) => sum + (r.UserCount || r.userCount || 0), 0)} 
          hint="Tổng người dùng" 
        />
      </div>

      {/* Error */}
      {error && (
        <Card className="p-4 border-rose-200 bg-rose-50">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchRoles} className="ml-auto">
              <RefreshCw size={14} /> Thử lại
            </Button>
          </div>
        </Card>
      )}

      {/* Role List */}
      {loading ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={32} className="animate-spin text-[#1f4f46]" />
            <p className="font-bold text-slate-900">Đang tải danh sách vai trò...</p>
          </div>
        </Card>
      ) : filteredRoles.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Shield size={48} className="text-slate-300" />
            <h3 className="text-xl font-bold text-slate-900">Chưa có vai trò</h3>
            <p className="text-sm text-slate-500">Nhấn "Tạo vai trò" để tạo mới</p>
            <Button onClick={openCreateModal}>
              <Plus size={16} /> Tạo vai trò
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRoles.map((role) => (
            <Card key={role.RoleID || role.id} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge tone="purple" className="mb-2">{role.RoleCode || role.roleCode}</Badge>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                      {role.RoleName || role.roleName}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {role.Description || role.description || 'Không có mô tả'}
                    </p>
                  </div>
                  {getStatusBadge(role.Status !== undefined ? role.Status : (role.status !== undefined ? role.status : 1))}
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users size={14} /> {role.UserCount || role.userCount || 0} người dùng
                  </span>
                  <span className="flex items-center gap-1">
                    <Key size={14} /> {role.PermissionCount || role.permissionCount || 0} quyền
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={() => openEditModal(role)}
                  >
                    <Edit size={14} /> Sửa
                  </Button>
                  <Button 
                    variant="danger" 
                    className="flex-1" 
                    onClick={() => handleDelete(role.RoleID || role.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal 
        open={modalOpen} 
        title={modalMode === 'create' ? 'Tạo vai trò mới' : 'Cập nhật vai trò'}
        description={modalMode === 'create' ? 'Thêm vai trò mới vào hệ thống' : 'Chỉnh sửa thông tin vai trò'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Mã vai trò *</label>
            <Input 
              value={form.roleCode} 
              onChange={(e) => setForm({...form, roleCode: e.target.value.toUpperCase()})} 
              placeholder="ADMIN" 
              required 
              disabled={modalMode === 'edit'}
            />
            <p className="mt-1 text-xs text-slate-500">Mã vai trò viết hoa, không dấu</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Tên vai trò *</label>
            <Input 
              value={form.roleName} 
              onChange={(e) => setForm({...form, roleName: e.target.value})} 
              placeholder="Quản trị viên" 
              required 
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Mô tả</label>
            <Input 
              value={form.description} 
              onChange={(e) => setForm({...form, description: e.target.value})} 
              placeholder="Mô tả vai trò..." 
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái</label>
            <select 
              value={form.status} 
              onChange={(e) => setForm({...form, status: parseInt(e.target.value)})}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value={1}>Hoạt động</option>
              <option value={0}>Khóa</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {modalMode === 'create' ? 'Tạo vai trò' : 'Cập nhật'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}   