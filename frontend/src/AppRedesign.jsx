import MyApartments from './components/MyApartments';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  authAPI,
  notificationAPI,
  setAuthToken,
  userAPI,
} from './api';

import EmployeeManagement from './components/EmployeeManagement';
import PermissionManagement from './components/PermissionManagement';
import RoleManagement from './components/RoleManagement';
import ResidentManagement from './components/ResidentManagement';
import ApartmentBuildingWorkspace from './components/ApartmentBuildingWorkspace';

import AIChat from './pages/AIChat';
import AIContractPrediction from './pages/AIContractPrediction';
import AISearch from './pages/AISearch';
import AIStatistics from './pages/AIStatistics';
import ApartmentReport from './pages/ApartmentReport';
import ChangePassword from './pages/ChangePassword';
import ContractList from './pages/ContractList';
import DebtReport from './pages/DebtReport';
import EquipmentManagement from './pages/EquipmentManagement';
import FeedbackManagement from './pages/FeedbackManagement';
import Fees from './pages/Fees';
import GymManagement from './pages/GymManagement';
import MaintenanceManagement from './pages/MaintenanceManagement';
import MaintenanceSchedule from './pages/MaintenanceSchedule';
import NotificationList from './pages/NotificationList';
import ParkingCardManagement from './pages/ParkingCardManagement';
import ParkingHistory from './pages/ParkingHistory';
import ParkingSlotManagement from './pages/ParkingSlotManagement';
import PoolManagement from './pages/PoolManagement';
import Profile from './pages/Profile';
import RevenueReport from './pages/RevenueReport';
import ScheduleNotification from './pages/ScheduleNotification';
import SendNotification from './pages/SendNotification';
import ServiceReport from './pages/ServiceReport';
import SystemInfo from './pages/SystemInfo';
import TicketManagement from './pages/TicketManagement';
import VehicleManagement from './pages/VehicleManagement';
import WifiManagement from './pages/WifiManagement';

import CondoShell from './redesign/CondoShell';
import RoleDashboard from './redesign/RoleDashboard';
import SystemLogPanel from './redesign/SystemLogPanel';
import {
  findNavigationItem,
  firstAccessiblePage,
  itemIsAccessible,
} from './redesign/navigation';
import { usePermissions } from './permissions';

function normalizeUser(raw = {}, permissions = []) {
  const roleCodes = Array.isArray(raw.roleCodes)
    ? raw.roleCodes
    : raw.roleCode
      ? [raw.roleCode]
      : [];
  const roles = Array.isArray(raw.roles)
    ? raw.roles
    : raw.role
      ? [raw.role]
      : [];

  return {
    ...raw,
    userId: raw.userId ?? raw.id ?? raw.UserID,
    name: raw.resident?.fullName
      || raw.employee?.fullName
      || raw.name
      || raw.username
      || 'Người dùng',
    roleCodes,
    roles,
    role: roles.join(', ') || raw.role || roleCodes.join(', ') || 'Người dùng',
    permissions: Array.from(new Set(permissions || raw.permissions || [])),
  };
}

function LoginPage({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Vui lòng nhập tài khoản và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({ username: username.trim(), password });
      if (!response?.success || !response?.data?.token) {
        throw new Error(response?.message || 'Đăng nhập thất bại.');
      }

      setAuthToken(response.data.token);
      const rawUser = response.data.user || {};
      const permissions = rawUser.permissions || [];
      const normalized = normalizeUser(rawUser, permissions);
      localStorage.setItem('user', JSON.stringify(normalized));
      onSuccess(normalized);
    } catch (requestError) {
      setError(requestError?.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.12fr_0.88fr]">
        <section className="relative hidden overflow-hidden bg-[#0d1b33] p-10 text-white lg:block xl:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.45),transparent_34%),radial-gradient(circle_at_85%_75%,rgba(6,182,212,0.28),transparent_36%)]" />
          <div className="absolute -left-28 top-1/3 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -right-24 top-20 h-96 w-96 rounded-full border border-white/10" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-xl shadow-blue-950/40">
                <Building2 size={25} />
              </div>
              <div>
                <p className="text-lg font-extrabold tracking-tight">ĐỨC VŨ TOWER</p>
                <p className="text-xs text-slate-400">Nền tảng quản lý vận hành chung cư</p>
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                <Sparkles size={14} /> Một hệ thống cho toàn bộ vận hành
              </div>
              <h1 className="mt-6 text-5xl font-extrabold leading-[1.08] tracking-tight xl:text-6xl">
                Quản lý chung cư rõ ràng, nhanh và đúng nghiệp vụ.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
                Theo dõi cư dân, căn hộ, hợp đồng, hóa đơn, bãi xe và yêu cầu sửa chữa trên một giao diện thống nhất.
              </p>

              <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
                {[
                  ['Dữ liệu thật', 'Dashboard đọc trực tiếp từ API'],
                  ['Đúng quyền', 'Menu ẩn theo permission'],
                  ['Responsive', 'Dùng tốt trên laptop và điện thoại'],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                    <ShieldCheck size={18} className="text-emerald-300" />
                    <p className="mt-3 text-sm font-bold">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500">© 2026 Đức Vũ Tower • Hệ thống nội bộ ban quản lý</p>
          </div>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Building2 size={22} />
              </div>
              <div>
                <p className="font-extrabold">ĐỨC VŨ TOWER</p>
                <p className="text-xs text-slate-500">Quản lý vận hành chung cư</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40">
              <div className="border-b border-slate-100 p-6 sm:p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <LockKeyhole size={23} />
                </div>
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight">Đăng nhập hệ thống</h2>
                <p className="mt-1.5 text-sm text-slate-500">Sử dụng tài khoản đã được ban quản trị cấp.</p>
              </div>

              <form onSubmit={submit} className="space-y-4 p-6 sm:p-7">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-700">Tài khoản hoặc email</span>
                  <span className="relative block">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Nhập tài khoản"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-700">Mật khẩu</span>
                  <span className="relative block">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Nhập mật khẩu"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-extrabold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <LoaderCircle size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                </button>
              </form>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}

function PageContent({
  activePage,
  canAccess,
  canAny,
  flash,
  onNavigate,
  user
}) {
  switch (activePage) {
    case 'dashboard': return <RoleDashboard canAccess={canAccess} canAny={canAny} onNavigate={onNavigate} user={user} />;
    case 'residents': return <ResidentManagement flash={flash} />;
    case 'buildings': return canAccess('APARTMENT_VIEW_ALL') && !(user?.roleCodes || []).includes('RESIDENT') ? <ApartmentBuildingWorkspace flash={flash} /> : <MyApartments onNavigate={onNavigate} />;
    case 'contract-list': return <ContractList flash={flash} />;
    case 'fees': return <Fees flash={flash} />;
    case 'vehicles': return <VehicleManagement flash={flash} />;
    case 'parking-cards': return <ParkingCardManagement flash={flash} />;
    case 'parking-slots': return <ParkingSlotManagement flash={flash} />;
    case 'parking-history': return <ParkingHistory flash={flash} canRecordAccess={canAccess('PARKING_ACCESS_CREATE')} />;
    case 'gym': return <GymManagement flash={flash} />;
    case 'pool': return <PoolManagement flash={flash} />;
    case 'wifi': return <WifiManagement flash={flash} />;
    case 'tickets': return <TicketManagement flash={flash} />;
    case 'maintenance': return <TicketManagement flash={flash} />;
    case 'feedbacks': return <FeedbackManagement flash={flash} />;
    case 'maintenance-schedule': return <MaintenanceSchedule flash={flash} />;
    case 'equipment': return <EquipmentManagement flash={flash} />;
    case 'notifications': return <NotificationList flash={flash} />;
    case 'send-notification': return <SendNotification flash={flash} />;
    case 'schedule-notification': return <ScheduleNotification flash={flash} />;
    case 'revenue-report': return <RevenueReport flash={flash} />;
    case 'debt-report': return <DebtReport flash={flash} />;
    case 'apartment-report': return <ApartmentReport flash={flash} />;
    case 'service-report': return <ServiceReport flash={flash} />;
    case 'employees': return <EmployeeManagement flash={flash} />;
    case 'permissions': return <PermissionManagement flash={flash} />;
    case 'roles': return <RoleManagement flash={flash} />;
    case 'system-logs': return <SystemLogPanel flash={flash} />;
    case 'ai-chat': return <AIChat />;
    case 'ai-stats': return <AIStatistics />;
    case 'ai-predict': return <AIContractPrediction />;
    case 'ai-search': return <AISearch />;
    case 'profile': return <Profile flash={flash} />;
    case 'change-password': return <ChangePassword flash={flash} />;
    case 'system-info': return <SystemInfo flash={flash} />;
    default:
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Building2 size={42} className="mx-auto text-slate-300" />
          <h2 className="mt-4 text-lg font-extrabold text-slate-800">Không có chức năng để hiển thị</h2>
          <p className="mt-1 text-sm text-slate-500">Tài khoản này chưa được cấp quyền truy cập module.</p>
        </div>
      );
  }
}

export default function AppRedesign() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [activePage, setActivePage] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [toast, setToast] = useState('');

  const { can, canAny } = usePermissions(user);
  const audience = useMemo(() => {
    return (user?.roleCodes || []).some(role => String(role).toUpperCase() === 'RESIDENT') ? 'resident' : 'staff';
  }, [user]);
  const canAccess = useCallback((permission) => can(permission), [can]);

  const flash = useCallback((message) => {
    if (!message) return;
    setToast(message);
    window.clearTimeout(flash.timeoutId);
    flash.timeoutId = window.setTimeout(() => setToast(''), 3200);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (!cancelled) setBooting(false);
        return;
      }

      try {
        const [profileResponse, permissionResponse] = await Promise.all([
          authAPI.getMe(),
          userAPI.getCurrentUserPermissions(),
        ]);
        const rawUser = profileResponse?.data || {};
        const currentPermissions = permissionResponse?.data?.permissions
          || rawUser.permissions
          || [];
        const normalized = normalizeUser(rawUser, currentPermissions);

        if (!cancelled) {
          setUser(normalized);
          localStorage.setItem('user', JSON.stringify(normalized));
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        if (!cancelled) setBooting(false);
      }
    };

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) {
      setActivePage(null);
      return;
    }

    const currentItem = findNavigationItem(activePage);
    if (!currentItem || !itemIsAccessible(currentItem, canAccess, audience)) {
      setActivePage(firstAccessiblePage(canAccess, audience));
    }
  }, [activePage, audience, canAccess, user]);

  const loadNotificationCount = useCallback(async () => {
    if (!canAny(['NOTIFICATION_VIEW_ALL', 'NOTIFICATION_VIEW_OWN'])) {
      setNotificationCount(0);
      return;
    }
    try {
      const response = await notificationAPI.getUnreadCount();
      setNotificationCount(Number(response?.data?.unreadCount) || 0);
    } catch {
      setNotificationCount(0);
    }
  }, [canAccess]);

  useEffect(() => {
    if (user) loadNotificationCount();
    const timer = window.setInterval(() => { if (user) loadNotificationCount(); }, 20000);
    return () => window.clearInterval(timer);
  }, [loadNotificationCount, user]);

  const navigate = useCallback((pageId) => {
    const item = findNavigationItem(pageId);
    if (!item || !itemIsAccessible(item, canAccess, audience)) {
      flash('Bạn không có quyền truy cập chức năng này.');
      return;
    }
    setActivePage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [canAccess, flash, audience]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setActivePage(null);
    setNotificationCount(0);
  }, []);

  const refresh = useCallback(() => {
    setRefreshVersion((value) => value + 1);
    loadNotificationCount();
    flash('Đang tải lại dữ liệu trang hiện tại.');
  }, [flash, loadNotificationCount]);

  if (booting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d1b33] text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-950/50">
          <Building2 size={27} />
        </div>
        <LoaderCircle size={25} className="mt-6 animate-spin text-cyan-300" />
        <p className="mt-3 text-sm font-semibold text-slate-300">Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  }

  if (!user) return <LoginPage onSuccess={setUser} />;

  return (
    <>
      <CondoShell
        activePage={activePage}
        canAccess={canAccess}
        audience={audience}
        notificationCount={notificationCount}
        onLogout={logout}
        onNavigate={navigate}
        onRefresh={refresh}
        user={user}
      >
        <div key={`${activePage}-${refreshVersion}`}>
          <PageContent
            activePage={activePage}
            canAccess={canAccess}
            canAny={canAny}
            flash={flash}
            onNavigate={navigate}
            user={user}
          />
        </div>
      </CondoShell>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="fixed bottom-5 right-5 z-[100] max-w-sm rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
