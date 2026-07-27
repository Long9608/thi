// src/pages/SystemInfo.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Info, Server, Database, Clock, Shield,
  CheckCircle2, AlertCircle, RefreshCw,
  HardDrive, Cpu, Globe, Lock, Users,
  Building2, FileText, CreditCard, Wrench,
  Activity, BarChart3, PieChart,
  Car, Bell  // ✅ THÊM Car VÀ Bell
} from 'lucide-react';
import { Card, Button, Badge, StatCard } from '../components/UI';
import { formatDate } from '../utils/formatters';

export default function SystemInfo({ flash }) {
  const [loading, setLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const fetchSystemInfo = async () => {
    try {
      setLoading(true);
      
      // Giả lập dữ liệu hệ thống
      const mockSystemInfo = {
        name: 'Đức Vũ Tower - Property Management System',
        version: '2.0.0',
        build: '2026.07.26.001',
        environment: 'Production',
        server: {
          node: 'v18.17.0',
          express: '4.18.2',
          database: 'SQL Server 2022',
          os: 'Windows Server 2022',
          uptime: '15 ngày 7 giờ 32 phút'
        },
        database: {
          name: 'ApartmentManagement',
          size: '256 MB',
          tables: 28,
          records: 1524,
          lastBackup: '2026-07-25 02:00:00'
        },
        features: {
          apartments: 150,
          residents: 248,
          contracts: 45,
          invoices: 320,
          services: 12,
          tickets: 56,
          vehicles: 89,
          notifications: 125
        },
        status: {
          database: 'Connected',
          api: 'Running',
          storage: 'Healthy',
          cache: 'Active'
        },
        lastMaintenance: '2026-07-20 03:00:00',
        nextMaintenance: '2026-08-20 03:00:00'
      };
      
      setSystemInfo(mockSystemInfo);
      
      // Giả lập thống kê
      const mockStats = {
        totalUsers: 15,
        activeUsers: 12,
        totalModules: 13,
        activeModules: 13,
        totalPermissions: 45,
        apiCalls: 2847,
        errors: 23,
        responseTime: '142ms'
      };
      setStats(mockStats);
      
    } catch (error) {
      console.error('Error fetching system info:', error);
      if (flash) flash('❌ Không thể tải thông tin hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'Connected': { tone: 'green', label: 'Đã kết nối' },
      'Running': { tone: 'green', label: 'Đang chạy' },
      'Healthy': { tone: 'green', label: 'Bình thường' },
      'Active': { tone: 'green', label: 'Hoạt động' },
      'Disconnected': { tone: 'red', label: 'Mất kết nối' },
      'Stopped': { tone: 'red', label: 'Đã dừng' },
      'Warning': { tone: 'amber', label: 'Cảnh báo' },
      'Error': { tone: 'red', label: 'Lỗi' }
    };
    const info = map[status] || { tone: 'slate', label: status };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
        <p className="mt-3 font-bold text-slate-900">Đang tải thông tin hệ thống...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Thông tin hệ thống</h3>
            <p className="text-sm text-slate-500">Thông tin chi tiết về hệ thống quản lý</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={fetchSystemInfo} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </Button>
          </div>
        </div>
      </Card>

      {/* System Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Server} label="Hệ thống" value="Đang chạy" trend="✓" hint={systemInfo?.version} />
        <StatCard icon={Database} label="Database" value={systemInfo?.status.database || 'Đã kết nối'} hint={systemInfo?.database.name} />
        <StatCard icon={Clock} label="Uptime" value={systemInfo?.server.uptime || 'N/A'} hint="Thời gian hoạt động" />
        <StatCard icon={Activity} label="API Calls" value={stats?.apiCalls || 0} hint={`Thời gian đáp ứng: ${stats?.responseTime || 'N/A'}`} />
      </div>

      {/* Main Info */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* System Details */}
        <Card className="p-6">
          <h4 className="font-bold text-slate-950 mb-4 flex items-center gap-2">
            <Info size={20} className="text-[#1f4f46]" />
            Thông tin hệ thống
          </h4>
          
          <div className="space-y-3">
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Tên hệ thống</span>
              <span className="font-semibold text-slate-950 text-right max-w-[60%]">
                {systemInfo?.name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Phiên bản</span>
              <span className="font-semibold text-slate-950">v{systemInfo?.version || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Build</span>
              <span className="font-semibold text-slate-950">{systemInfo?.build || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Môi trường</span>
              <Badge tone={systemInfo?.environment === 'Production' ? 'green' : 'amber'}>
                {systemInfo?.environment || 'N/A'}
              </Badge>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Hệ điều hành</span>
              <span className="font-semibold text-slate-950">{systemInfo?.server.os || 'N/A'}</span>
            </div>
          </div>
        </Card>

        {/* Server & Database */}
        <Card className="p-6">
          <h4 className="font-bold text-slate-950 mb-4 flex items-center gap-2">
            <Server size={20} className="text-[#1f4f46]" />
            Server & Database
          </h4>
          
          <div className="space-y-3">
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Node.js</span>
              <span className="font-semibold text-slate-950">{systemInfo?.server.node || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Express</span>
              <span className="font-semibold text-slate-950">{systemInfo?.server.express || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Database</span>
              <span className="font-semibold text-slate-950">{systemInfo?.server.database || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Dung lượng DB</span>
              <span className="font-semibold text-slate-950">{systemInfo?.database.size || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Số bảng</span>
              <span className="font-semibold text-slate-950">{systemInfo?.database.tables || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Tổng số bản ghi</span>
              <span className="font-semibold text-slate-950">{systemInfo?.database.records || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-600">Sao lưu gần nhất</span>
              <span className="font-semibold text-slate-950">{formatDate(systemInfo?.database.lastBackup)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Features Stats */}
      <Card className="p-6">
        <h4 className="font-bold text-slate-950 mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-[#1f4f46]" />
          Thống kê dữ liệu
        </h4>
        
        <div className="grid gap-3 md:grid-cols-4">
          <div className="p-4 rounded-xl bg-[#eef5f2] text-center">
            <Building2 size={28} className="mx-auto text-[#1f4f46] mb-2" />
            <p className="text-2xl font-bold text-slate-950">{systemInfo?.features.apartments || 0}</p>
            <p className="text-sm text-slate-500">Căn hộ</p>
          </div>
          <div className="p-4 rounded-xl bg-[#eef5f2] text-center">
            <Users size={28} className="mx-auto text-[#1f4f46] mb-2" />
            <p className="text-2xl font-bold text-slate-950">{systemInfo?.features.residents || 0}</p>
            <p className="text-sm text-slate-500">Cư dân</p>
          </div>
          <div className="p-4 rounded-xl bg-[#eef5f2] text-center">
            <FileText size={28} className="mx-auto text-[#1f4f46] mb-2" />
            <p className="text-2xl font-bold text-slate-950">{systemInfo?.features.contracts || 0}</p>
            <p className="text-sm text-slate-500">Hợp đồng</p>
          </div>
          <div className="p-4 rounded-xl bg-[#eef5f2] text-center">
            <CreditCard size={28} className="mx-auto text-[#1f4f46] mb-2" />
            <p className="text-2xl font-bold text-slate-950">{systemInfo?.features.invoices || 0}</p>
            <p className="text-sm text-slate-500">Hóa đơn</p>
          </div>
          <div className="p-4 rounded-xl bg-[#eef5f2] text-center">
            <Wrench size={28} className="mx-auto text-[#1f4f46] mb-2" />
            <p className="text-2xl font-bold text-slate-950">{systemInfo?.features.services || 0}</p>
            <p className="text-sm text-slate-500">Dịch vụ</p>
          </div>
          <div className="p-4 rounded-xl bg-[#eef5f2] text-center">
            <AlertCircle size={28} className="mx-auto text-[#1f4f46] mb-2" />
            <p className="text-2xl font-bold text-slate-950">{systemInfo?.features.tickets || 0}</p>
            <p className="text-sm text-slate-500">Ticket</p>
          </div>
          <div className="p-4 rounded-xl bg-[#eef5f2] text-center">
            <Car size={28} className="mx-auto text-[#1f4f46] mb-2" />
            <p className="text-2xl font-bold text-slate-950">{systemInfo?.features.vehicles || 0}</p>
            <p className="text-sm text-slate-500">Xe</p>
          </div>
          <div className="p-4 rounded-xl bg-[#eef5f2] text-center">
            <Bell size={28} className="mx-auto text-[#1f4f46] mb-2" />
            <p className="text-2xl font-bold text-slate-950">{systemInfo?.features.notifications || 0}</p>
            <p className="text-sm text-slate-500">Thông báo</p>
          </div>
        </div>
      </Card>

      {/* System Status Details */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <h4 className="font-bold text-slate-950 mb-3 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            Trạng thái
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Database</span>
              {getStatusBadge(systemInfo?.status.database)}
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">API Server</span>
              {getStatusBadge(systemInfo?.status.api)}
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Storage</span>
              {getStatusBadge(systemInfo?.status.storage)}
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Cache</span>
              {getStatusBadge(systemInfo?.status.cache)}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-bold text-slate-950 mb-3 flex items-center gap-2">
            <Clock size={18} className="text-[#1f4f46]" />
            Bảo trì
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Lần cuối</span>
              <span className="font-semibold text-slate-950">{formatDate(systemInfo?.lastMaintenance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Kế tiếp</span>
              <span className="font-semibold text-slate-950">{formatDate(systemInfo?.nextMaintenance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Trạng thái</span>
              <Badge tone="green">Bình thường</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-bold text-slate-950 mb-3 flex items-center gap-2">
            <Shield size={18} className="text-[#1f4f46]" />
            Bảo mật
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">SSL/TLS</span>
              <Badge tone="green">Đã bật</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Xác thực</span>
              <Badge tone="green">JWT</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Phân quyền</span>
              <Badge tone="green">RBAC</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Audit Log</span>
              <Badge tone="green">Đã bật</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}