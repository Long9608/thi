// src/components/PermissionManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, ShieldCheck, ShieldAlert, Plus, Search, 
  Edit, Trash2, Check, X, RefreshCw, Eye,
  Users, Lock, Key, Building2, Home, FileText,
  CreditCard, Car, Wrench, Bell, Bot, Settings,
  Save, AlertCircle, ChevronDown, ChevronRight,
  CheckCircle2  // 🔥 THÊM DÒNG NÀY
} from 'lucide-react';
import { userAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from './UI';

// Map module code to icon
const moduleIcons = {
  DASHBOARD: Home,
  RESIDENT: Users,
  APARTMENT: Building2,
  CONTRACT: FileText,
  SERVICE: Wrench,
  FINANCE: CreditCard,
  PARKING: Car,
  OPERATION: Wrench,
  NOTIFICATION: Bell,
  EMPLOYEE: Users,
  REPORT: FileText,
  AI: Bot,
  SETTING: Settings
};

export default function PermissionManagement({ flash }) {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  
  // Selected role for permission assignment
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [rolesRes, permsRes, modulesRes] = await Promise.all([
        userAPI.getRoles(),
        userAPI.getPermissions(),
        userAPI.getModules()
      ]);
      
      console.log('📊 Roles:', rolesRes);
      console.log('📊 Permissions:', permsRes);
      console.log('📊 Modules:', modulesRes);

      // Xử lý roles
      if (rolesRes && rolesRes.data) {
        if (Array.isArray(rolesRes.data)) {
          setRoles(rolesRes.data);
        } else if (rolesRes.data.data && Array.isArray(rolesRes.data.data)) {
          setRoles(rolesRes.data.data);
        } else if (rolesRes.data.recordset && Array.isArray(rolesRes.data.recordset)) {
          setRoles(rolesRes.data.recordset);
        }
      }

      // Xử lý permissions
      if (permsRes && permsRes.data) {
        if (Array.isArray(permsRes.data)) {
          setPermissions(permsRes.data);
        } else if (permsRes.data.data && Array.isArray(permsRes.data.data)) {
          setPermissions(permsRes.data.data);
        } else if (permsRes.data.recordset && Array.isArray(permsRes.data.recordset)) {
          setPermissions(permsRes.data.recordset);
        }
      }

      // Xử lý modules
      if (modulesRes && modulesRes.data) {
        if (Array.isArray(modulesRes.data)) {
          setModules(modulesRes.data);
        } else if (modulesRes.data.data && Array.isArray(modulesRes.data.data)) {
          setModules(modulesRes.data.data);
        } else if (modulesRes.data.recordset && Array.isArray(modulesRes.data.recordset)) {
          setModules(modulesRes.data.recordset);
        }
      }

      // Mở rộng tất cả module mặc định
      const expanded = {};
      modules.forEach(mod => {
        expanded[mod.ModuleID || mod.id] = true;
      });
      setExpandedModules(expanded);

      if (flash) flash('✅ Đã tải dữ liệu phân quyền!');
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setError(error.message || 'Không thể tải dữ liệu phân quyền');
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải dữ liệu phân quyền'));
    } finally {
      setLoading(false);
    }
  };

  const openPermissionModal = async (role) => {
    try {
      setSelectedRole(role);
      // Lấy danh sách quyền hiện tại của role
      const roleId = role.RoleID || role.id;
      const res = await userAPI.getRolePermissions(roleId);
      console.log('📊 Role permissions:', res);
      
      let currentPerms = [];
      if (res && res.data) {
        if (Array.isArray(res.data)) {
          currentPerms = res.data;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          currentPerms = res.data.data;
        } else if (res.data.recordset && Array.isArray(res.data.recordset)) {
          currentPerms = res.data.recordset.map(row => row.id || row.PermissionID);
        } else if (res.data.permissionIds) {
          currentPerms = res.data.permissionIds;
        }
      }
      
      setSelectedPermissions(currentPerms);
      setModalOpen(true);
    } catch (error) {
      console.error('❌ Error fetching role permissions:', error);
      if (flash) flash('❌ Không thể tải quyền của vai trò');
    }
  };

  const handleSavePermissions = async () => {
    try {
      setSaving(true);
      const roleId = selectedRole.RoleID || selectedRole.id;
      await userAPI.updateRolePermissions(roleId, selectedPermissions);
      if (flash) flash('✅ Cập nhật phân quyền thành công!');
      setModalOpen(false);
      await fetchAllData();
    } catch (error) {
      console.error('❌ Error saving permissions:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể cập nhật phân quyền'));
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permissionId) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const toggleModulePermissions = (moduleId) => {
    const modulePerms = permissions.filter(p => p.ModuleID === moduleId);
    const modulePermIds = modulePerms.map(p => p.PermissionID || p.id);
    const allSelected = modulePermIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !modulePermIds.includes(id)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...modulePermIds])]);
    }
  };

  const getModulePermissions = (moduleId) => {
    return permissions.filter(p => p.ModuleID === moduleId);
  };

  const isModuleFullySelected = (moduleId) => {
    const modulePerms = permissions.filter(p => p.ModuleID === moduleId);
    return modulePerms.length > 0 && modulePerms.every(p => selectedPermissions.includes(p.PermissionID || p.id));
  };

  const isModulePartiallySelected = (moduleId) => {
    const modulePerms = permissions.filter(p => p.ModuleID === moduleId);
    const selectedCount = modulePerms.filter(p => selectedPermissions.includes(p.PermissionID || p.id)).length;
    return selectedCount > 0 && selectedCount < modulePerms.length;
  };

  const getRoleName = (role) => {
    return role.RoleName || role.roleName || '';
  };

  const getRoleCode = (role) => {
    return role.RoleCode || role.roleCode || '';
  };

  const getModuleName = (module) => {
    return module.ModuleName || module.moduleName || '';
  };

  const getModuleCode = (module) => {
    return module.ModuleCode || module.moduleCode || '';
  };

  const filteredRoles = useMemo(() => {
    const q = search.toLowerCase();
    return roles.filter(r => {
      const name = getRoleName(r).toLowerCase();
      const code = getRoleCode(r).toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [roles, search]);

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    const grouped = {};
    modules.forEach(mod => {
      const moduleId = mod.ModuleID || mod.id;
      grouped[moduleId] = {
        module: mod,
        permissions: permissions.filter(p => p.ModuleID === moduleId)
      };
    });
    return grouped;
  }, [modules, permissions]);

  // Tính thống kê
  const stats = useMemo(() => {
    const totalRoles = roles.length;
    const activeRoles = roles.filter(r => (r.Status || r.status || 1) === 1).length;
    const totalPermissions = permissions.length;
    const totalModules = modules.length;
    return { totalRoles, activeRoles, totalPermissions, totalModules };
  }, [roles, permissions, modules]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Phân quyền hệ thống</h3>
            <p className="text-sm text-slate-500">Quản lý và gán quyền truy cập cho từng vai trò.</p>
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
            <Button variant="secondary" onClick={fetchAllData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Shield} label="Tổng vai trò" value={stats.totalRoles} hint="Vai trò trong hệ thống" />
        <StatCard icon={CheckCircle2} label="Đang hoạt động" value={stats.activeRoles} hint="Vai trò đang sử dụng" />
        <StatCard icon={Key} label="Tổng quyền" value={stats.totalPermissions} hint="Quyền trong hệ thống" />
        <StatCard icon={Building2} label="Module" value={stats.totalModules} hint="Module chức năng" />
      </div>

      {/* Error */}
      {error && (
        <Card className="p-4 border-rose-200 bg-rose-50">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchAllData} className="ml-auto">
              <RefreshCw size={14} /> Thử lại
            </Button>
          </div>
        </Card>
      )}

      {/* Roles List */}
      {loading ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={32} className="animate-spin text-[#1f4f46]" />
            <p className="font-bold text-slate-900">Đang tải dữ liệu...</p>
          </div>
        </Card>
      ) : filteredRoles.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Shield size={48} className="text-slate-300" />
            <h3 className="text-xl font-bold text-slate-900">Không tìm thấy vai trò</h3>
            <p className="text-sm text-slate-500">Vui lòng tạo vai trò trước khi phân quyền</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRoles.map((role) => {
            const roleId = role.RoleID || role.id;
            const roleName = getRoleName(role);
            const roleCode = getRoleCode(role);
            const permCount = role.PermissionCount || role.permissionCount || 0;
            const userCount = role.UserCount || role.userCount || 0;
            const status = role.Status !== undefined ? role.Status : (role.status !== undefined ? role.status : 1);
            
            return (
              <Card key={roleId} className="group hover:border-[#1f4f46]/30 transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge tone="purple" className="mb-2">{roleCode}</Badge>
                      <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                        {roleName}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                        {role.Description || role.description || 'Không có mô tả'}
                      </p>
                    </div>
                    <Badge tone={status ? 'green' : 'red'}>
                      {status ? 'Hoạt động' : 'Khóa'}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Users size={14} /> {userCount} người dùng
                    </span>
                    <span className="flex items-center gap-1">
                      <Key size={14} /> {permCount} quyền
                    </span>
                  </div>

                  {/* 🔥 NÚT PHÂN QUYỀN - ĐÃ CÓ CHỨC NĂNG */}
                  <Button 
                    className="mt-4 w-full"
                    onClick={() => openPermissionModal(role)}
                  >
                    <Lock size={16} /> Phân quyền
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 🔥 MODAL PHÂN QUYỀN - ĐÃ HOÀN CHỈNH */}
      <Modal 
        open={modalOpen} 
        title={`Phân quyền cho ${selectedRole ? getRoleName(selectedRole) : ''}`}
        description={`Quản lý quyền truy cập cho vai trò ${selectedRole ? getRoleCode(selectedRole) : ''}`}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Select all / Deselect all */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span className="text-sm font-medium text-slate-700">
              Đã chọn: <span className="font-bold text-[#1f4f46]">{selectedPermissions.length}</span> / {permissions.length} quyền
            </span>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  const allPermIds = permissions.map(p => p.PermissionID || p.id);
                  setSelectedPermissions(allPermIds);
                }}
              >
                <Check size={14} /> Chọn tất cả
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setSelectedPermissions([])}
              >
                <X size={14} /> Bỏ chọn
              </Button>
            </div>
          </div>

          {/* Modules and Permissions */}
          {modules.map(mod => {
            const moduleId = mod.ModuleID || mod.id;
            const moduleName = getModuleName(mod);
            const moduleCode = getModuleCode(mod);
            const modulePerms = getModulePermissions(moduleId);
            const fullSelected = isModuleFullySelected(moduleId);
            const partialSelected = isModulePartiallySelected(moduleId);
            const isExpanded = expandedModules[moduleId] !== false;
            const Icon = moduleIcons[moduleCode] || Shield;

            if (modulePerms.length === 0) return null;

            return (
              <div key={moduleId} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Module header */}
                <div 
                  className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleModule(moduleId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f4f46]/10 text-[#1f4f46]">
                      <Icon size={16} />
                    </div>
                    <span className="font-semibold text-slate-900">{moduleName}</span>
                    <Badge tone="slate" className="text-xs">
                      {modulePerms.filter(p => selectedPermissions.includes(p.PermissionID || p.id)).length}/{modulePerms.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleModulePermissions(moduleId);
                      }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                        ${fullSelected ? 'bg-[#1f4f46] border-[#1f4f46] text-white' : 
                          partialSelected ? 'bg-[#1f4f46]/30 border-[#1f4f46]' : 
                          'border-slate-300 hover:border-[#1f4f46]'}`}
                    >
                      {fullSelected && <Check size={12} />}
                      {partialSelected && <span className="w-2 h-0.5 bg-[#1f4f46]"></span>}
                    </button>
                    {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Module permissions */}
                {isExpanded && (
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {modulePerms.map(perm => {
                      const permId = perm.PermissionID || perm.id;
                      const isSelected = selectedPermissions.includes(permId);
                      return (
                        <label 
                          key={permId}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                            ${isSelected ? 'bg-[#1f4f46]/5 border-[#1f4f46]' : 'hover:bg-slate-50 border-transparent'}
                            border`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePermission(permId)}
                            className="w-4 h-4 rounded border-slate-300 accent-[#1f4f46]"
                          />
                          <span className="text-sm text-slate-700">{perm.PermissionName || perm.permissionName}</span>
                          <span className="text-xs text-slate-400 ml-auto">{perm.PermissionCode || perm.permissionCode}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {modules.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Shield size={48} className="mx-auto mb-3 text-slate-300" />
              <p>Chưa có module hoặc quyền trong hệ thống</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSavePermissions} disabled={saving}>
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            Lưu phân quyền
          </Button>
        </div>
      </Modal>
    </div>
  );
}