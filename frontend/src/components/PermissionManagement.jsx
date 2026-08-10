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

const permissionLabels = {
  DASHBOARD_VIEW: 'Dashboard',
  REPORT_VIEW: 'Báo cáo',
  RESIDENT_VIEW: 'Danh sách cư dân',
  RESIDENT_CREATE: 'Thêm cư dân',
  RESIDENT_UPDATE: 'Sửa cư dân',
  RESIDENT_DELETE: 'Xóa cư dân',
  APARTMENT_VIEW: 'Tòa nhà',
  APARTMENT_CREATE: 'Thêm căn hộ',
  APARTMENT_UPDATE: 'Sửa căn hộ',
  APARTMENT_DELETE: 'Xóa căn hộ',
  CONTRACT_VIEW: 'Danh sách hợp đồng',
  CONTRACT_CREATE: 'Tạo hợp đồng',
  CONTRACT_RENEW: 'Gia hạn hợp đồng',
  CONTRACT_LIQUIDATE: 'Thanh lý hợp đồng',
  CONTRACT_UPDATE: 'Cập nhật hợp đồng',
  SERVICE_VIEW: 'Dịch vụ',
  SERVICE_CREATE: 'Đăng ký dịch vụ',
  SERVICE_UPDATE: 'Sửa dịch vụ',
  SERVICE_DELETE: 'Xóa dịch vụ',
  METER_READING_CREATE: 'Nhập chỉ số điện nước',
  INVOICE_VIEW: 'Hóa đơn',
  INVOICE_CREATE: 'Tạo hóa đơn',
  PAYMENT_CREATE: 'Thu phí',
  DEBT_VIEW: 'Công nợ',
  PARKING_VIEW: 'Xe cư dân',
  VEHICLE_CREATE: 'Thêm xe',
  CARD_CREATE: 'Cấp thẻ xe',
  PARKING_HISTORY: 'Lịch sử ra vào',
  TICKET_VIEW: 'Ticket',
  TICKET_CREATE: 'Tạo ticket',
  MAINTENANCE_UPDATE: 'Quản lý bảo trì',
  DEVICE_MANAGE: 'Quản lý thiết bị',
  NOTIFICATION_VIEW: 'Thông báo',
  NOTIFICATION_SEND: 'Gửi thông báo',
  EMPLOYEE_VIEW: 'Nhân viên',
  EMPLOYEE_CREATE: 'Thêm nhân viên',
  ROLE_MANAGE: 'Quản lý vai trò',
  PERMISSION_MANAGE: 'Phân quyền',
  SYSTEM_SETTING: 'Cài đặt hệ thống',
  AI_CHAT: 'Chat AI',
  AI_STATISTIC: 'Thống kê AI',
  AI_SEARCH: 'AI tìm kiếm',
  AI_PREDICT: 'Dự đoán AI',
  PROFILE_UPDATE: 'Hồ sơ cá nhân',
  PASSWORD_CHANGE: 'Đổi mật khẩu'
};

// Các mục đúng theo thanh menu. Mã quyền kỹ thuật chỉ được dùng nội bộ để lưu.
const menuPermissionGroups = [
  ['Tổng quan', [['Dashboard',['DASHBOARD_VIEW']], ['Báo cáo nhanh',['REPORT_VIEW']]]],
  ['Quản lý chung cư', [['Danh sách cư dân',['RESIDENT_VIEW','RESIDENT_CREATE','RESIDENT_UPDATE','RESIDENT_DELETE']], ['Tòa nhà',['APARTMENT_VIEW','APARTMENT_CREATE','APARTMENT_UPDATE','APARTMENT_DELETE']], ['Danh sách hợp đồng',['CONTRACT_VIEW','CONTRACT_CREATE','CONTRACT_UPDATE','CONTRACT_RENEW','CONTRACT_LIQUIDATE']]]],
  ['Dịch vụ công ích', [['Điện',['SERVICE_VIEW','METER_READING_CREATE']], ['Nước',['SERVICE_VIEW','METER_READING_CREATE']], ['Đăng ký dịch vụ',['SERVICE_CREATE','SERVICE_UPDATE','SERVICE_DELETE']], ['Gym',['SERVICE_VIEW','SERVICE_CREATE','SERVICE_UPDATE','SERVICE_DELETE']], ['Hồ bơi',['SERVICE_VIEW','SERVICE_CREATE','SERVICE_UPDATE','SERVICE_DELETE']], ['Event Space',['SERVICE_VIEW','SERVICE_CREATE','SERVICE_UPDATE','SERVICE_DELETE']]]],
  ['Hóa đơn & Tài chính', [['Hóa đơn',['INVOICE_VIEW','INVOICE_CREATE']], ['Thanh toán',['PAYMENT_CREATE']], ['Công nợ',['DEBT_VIEW']], ['Thu phí',['PAYMENT_CREATE']], ['Doanh thu',['REPORT_VIEW']]]],
  ['Gửi xe', [['Xe cư dân',['PARKING_VIEW','VEHICLE_CREATE']], ['Thẻ xe',['CARD_CREATE']], ['Bãi xe',['PARKING_VIEW']], ['Lịch sử ra/vào',['PARKING_HISTORY']]]],
  ['Vận hành', [['Ticket hỗ trợ',['TICKET_VIEW','TICKET_CREATE']], ['Bảo trì',['MAINTENANCE_UPDATE']], ['Phản ánh',['TICKET_VIEW']], ['Lịch bảo trì',['MAINTENANCE_UPDATE']], ['Thiết bị',['DEVICE_MANAGE']]]],
  ['Thông báo', [['Danh sách',['NOTIFICATION_VIEW']], ['Gửi thông báo',['NOTIFICATION_SEND']], ['Lịch gửi',['NOTIFICATION_SEND']]]],
  ['Nhân sự', [['Nhân viên',['EMPLOYEE_VIEW','EMPLOYEE_CREATE']], ['Phân quyền',['PERMISSION_MANAGE']], ['Vai trò',['ROLE_MANAGE']], ['Nhật ký hệ thống',['SYSTEM_SETTING']]]],
  ['Báo cáo', [['Doanh thu',['REPORT_VIEW']], ['Công nợ',['REPORT_VIEW']], ['Căn hộ',['REPORT_VIEW']], ['Dịch vụ',['REPORT_VIEW']]]],
  ['AI Assistant', [['Chat AI',['AI_CHAT']], ['Thống kê AI',['AI_STATISTIC']], ['Dự đoán hợp đồng',['AI_PREDICT']], ['AI tìm kiếm',['AI_SEARCH']]]],
  ['Cài đặt', [['Hồ sơ',['PROFILE_UPDATE']], ['Đổi mật khẩu',['PASSWORD_CHANGE']], ['Thông tin hệ thống',['SYSTEM_SETTING']]]]
];

const menuItemIds = [
  ['dashboard','quick-report'], ['residents','buildings','contract-list'], ['electricity','water','register-service','gym','pool','event-space'],
  ['fees','payments','debts','fee-collection','revenue'], ['vehicles','vehicle-cards','parking-lot','parking-history'], ['tickets','maintenance','feedbacks','maintenance-schedule','equipment'],
  ['notifications','send-notification','schedule-notification'], ['employees','permissions','roles','system-logs'], ['revenue-report','debt-report','apartment-report','service-report'],
  ['ai-chat','ai-stats','ai-predict','ai-search'], ['profile','change-password','system-info']
];

const menuViewCode = (id) => `MENU_${id.toUpperCase().replace(/-/g, '_')}_VIEW`;

const actionName = (code) => ({ VIEW: 'Xem', CREATE: 'Thêm', UPDATE: 'Sửa', DELETE: 'Xóa', RENEW: 'Gia hạn', LIQUIDATE: 'Thanh lý', SEND: 'Gửi', MANAGE: 'Quản lý', CREATE: 'Thêm' })[code.split('_').pop()] || 'Cho phép';

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
      let loadedModules = [];
      if (modulesRes && modulesRes.data) {
        if (Array.isArray(modulesRes.data)) {
          loadedModules = modulesRes.data;
        } else if (modulesRes.data.data && Array.isArray(modulesRes.data.data)) {
          loadedModules = modulesRes.data.data;
        } else if (modulesRes.data.recordset && Array.isArray(modulesRes.data.recordset)) {
          loadedModules = modulesRes.data.recordset;
        }
      }
      setModules(loadedModules);

      // Mở rộng tất cả module mặc định
      const expanded = {};
      loadedModules.forEach(mod => {
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
              Đã chọn: <span className="font-bold text-[#1f4f46]">{selectedPermissions.length}</span> quyền trên 45 chức năng menu
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

          {/* 45 mục trên thanh menu, mỗi mục chỉ hiển thị các thao tác có ý nghĩa. */}
          {menuPermissionGroups.map(([groupName, items], groupIndex) => (
            <section key={groupName} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 font-semibold text-slate-900">{groupName}</div>
              <div className="divide-y divide-slate-100">
                {items.map(([itemName, codes], itemIndex) => (
                  <div key={`${groupName}-${itemName}`} className="flex flex-col gap-2 p-3 md:flex-row md:items-center">
                    <span className="w-48 text-sm font-medium text-slate-800">{itemName}</span>
                    <div className="flex flex-wrap gap-2">
                      {[menuViewCode(menuItemIds[groupIndex][itemIndex]), ...codes.filter((code) => !code.endsWith('_VIEW'))].map((code) => {
                        const permission = permissions.find((p) => (p.PermissionCode || p.permissionCode) === code);
                        if (!permission) return null;
                        const permissionId = permission.PermissionID || permission.id;
                        return <label key={code} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${selectedPermissions.includes(permissionId) ? 'border-[#1f4f46] bg-[#1f4f46]/5' : 'border-slate-200'}`}>
                          <input type="checkbox" checked={selectedPermissions.includes(permissionId)} onChange={() => togglePermission(permissionId)} className="accent-[#1f4f46]" />
                          {actionName(code)}
                        </label>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

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
