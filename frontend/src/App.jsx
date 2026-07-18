// src/App.jsx
import React, { useEffect, useMemo, useState, useCallback, memo } from "react";
import * as XLSX from "xlsx";
import { AnimatePresence, motion } from "framer-motion";

// Import từ api.js
import api, { 
  apartmentAPI,
  contractAPI,
  invoiceAPI,
  residentAPI,
  serviceAPI,
  ticketAPI,
  vehicleAPI,
  notificationAPI,
  utilityAPI,
  dashboardAPI,
  setAuthToken,
  logout,
  authAPI,
  userAPI
} from "./api";

// Import các component
import EmployeeManagement from './components/EmployeeManagement';
import PermissionManagement from './components/PermissionManagement';
import RoleManagement from './components/RoleManagement';

// ============= IMPORT ICONS =============
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Bolt,
  Bot,
  Building2,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  Droplet,
  Dumbbell,
  Eye,
  EyeOff,
  FileText,
  Home,
  Import,
  Info,
  KeyRound,
  LockKeyhole,
  Mail,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  Waves,
  Wrench,
  X,
  Save
} from "lucide-react";

// ============= IMPORT REACT CHARTS =============
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ============================================================
// CÁC HÀM TIỆN ÍCH
// ============================================================
function cls(...items) {
  return items.filter(Boolean).join(" ");
}

function formatBirthday(date) {
  if (!date) return "Chưa cập nhật";
  try {
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "Chưa cập nhật";
  }
}

function money(value) {
  return new Intl.NumberFormat("vi-VN", { 
    style: "currency", 
    currency: "VND", 
    maximumFractionDigits: 0 
  }).format(value || 0);
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return parts
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

// ============================================================
// UI COMPONENTS - Tối ưu với memo
// ============================================================

const Card = memo(({ children, className = "" }) => {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
});

const Button = memo(({ children, variant = "primary", className = "", ...props }) => {
  const styles = {
    primary: "bg-[#1f4f46] text-white hover:bg-[#173f38] shadow-sm",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    warning: "bg-amber-500 text-white hover:bg-amber-600",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

const Input = memo(({ icon: Icon, right, className = "", ...props }) => {
  return (
    <div className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-[#1f4f46] ${className}`}>
      {Icon && <Icon size={16} className="text-slate-400" />}
      <input className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" {...props} />
      {right}
    </div>
  );
});

const Select = memo(({ className = "", ...props }) => {
  return (
    <select
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#1f4f46] ${className}`}
      {...props}
    />
  );
});

const Badge = memo(({ children, tone = "slate" }) => {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-rose-200 bg-rose-50 text-rose-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    purple: "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
});

const PageTitle = memo(({ eyebrow, title, description, actions }) => {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 lg:flex-row lg:items-center lg:px-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f4f46]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
});

const StatCard = memo(({ icon: Icon, label, value, hint, trend }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-3xl font-bold tracking-tight text-slate-950">{value}</p>
              {trend && <span className="mb-1 text-xs font-bold text-emerald-600">{trend}</span>}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
          </div>
          <div className="rounded-xl bg-[#eef5f2] p-3 text-[#1f4f46]">
            <Icon size={20} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

const Modal = memo(({ open, title, description, children, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 12 }}
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <h3 className="text-xl font-bold text-slate-950">{title}</h3>
                {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const EmptyState = memo(({ title, description }) => {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
});

// ============================================================
// LOGIN PAGE
// ============================================================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("admin@anbinh.vn");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError("Vui lòng nhập email và mật khẩu.");
      setLoading(false);
      return;
    }

    try {
    const response = await authAPI.login({ 
      username: email, 
      password: password 
    });
      
      if (response.success) {
        setAuthToken(response.data.token);
        
        // Lấy permissions của user
        let permissions = [];
        try {
          const permRes = await userAPI.getCurrentUserPermissions();
          permissions = permRes?.data?.permissions || [];
        } catch (e) {
          console.warn('⚠️ Không thể lấy permissions:', e);
        }
        
        const userData = {
          ...response.data.user,
          permissions: permissions
        };
        localStorage.setItem('user', JSON.stringify(userData));
        
        onLogin({
        name: response.data.user?.employee?.fullName || 
              response.data.user?.username || 
              'Ban quản lý',
        email: response.data.user?.email || email,
        role: response.data.user?.role || 'Quản trị viên',
        permissions: permissions,
        remember,
      });
      } else {
        setError(response.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#173f38] p-10 text-white lg:block">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute left-16 top-16 h-56 w-56 rounded-full border border-white" />
            <div className="absolute bottom-20 right-16 h-72 w-72 rounded-full border border-white" />
            <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#1f4f46]">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-lg font-bold">Đức Vũ Tower</p>
                <p className="text-sm text-white/70">Nền tảng quản lý vận hành chung cư</p>
              </div>
            </div>

            <div className="max-w-xl">
              <Badge tone="green">Nội bộ ban quản lý</Badge>
              <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight">Quản lý cư dân, căn hộ và vận hành trong một nơi.</h1>
              <p className="mt-5 text-base leading-7 text-white/75">
                Quản lý dữ liệu cư dân, căn hộ, thu phí, yêu cầu sửa chữa và bãi xe bằng các thao tác thực tế, dễ kiểm tra và dễ xuất báo cáo.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-bold">248</p>
                  <p className="mt-1 text-xs text-white/70">Cư dân</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-bold">96%</p>
                  <p className="mt-1 text-xs text-white/70">Lấp đầy</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-bold">12</p>
                  <p className="mt-1 text-xs text-white/70">Việc hôm nay</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <ShieldCheck size={22} />
                <div>
                  <p className="font-semibold">Đăng nhập thử nghiệm</p>
                  <p className="text-sm text-white/70">Email có sẵn: admin@anbinh.vn · Mật khẩu: 123456</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-8">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f4f46] text-white">
                <Building2 size={22} />
              </div>
              <div>
                <p className="font-bold text-slate-950">Đức Vũ Tower</p>
                <p className="text-sm text-slate-500">Property Admin</p>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5f2] text-[#1f4f46]">
                  <LockKeyhole size={23} />
                </div>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">Đăng nhập hệ thống</h2>
                <p className="mt-1 text-sm text-slate-500">Dành cho ban quản lý và nhân sự vận hành chung cư.</p>
              </div>

              <form className="space-y-4 p-6" onSubmit={submit}>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                  <Input icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@anbinh.vn" />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu</label>
                  <Input
                    icon={KeyRound}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    right={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-700">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#1f4f46]" />
                    Ghi nhớ đăng nhập
                  </label>
                  <button type="button" className="font-semibold text-[#1f4f46] hover:underline">Quên mật khẩu?</button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <Button className="w-full" disabled={loading}>
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
              </form>
            </Card>

            <p className="mt-5 text-center text-xs text-slate-500">Phiên bản giao diện kết nối dữ liệu cục bộ. Khi nối backend, form này sẽ gọi API đăng nhập và lưu token phiên làm việc.</p>
          </motion.div>
        </section>
      </div>
    </div>
  );
}

// ============================================================
// DỮ LIỆU MẪU (FALLBACK)
// ============================================================
const revenueData = [
  { month: "T1", amount: 56 },
  { month: "T2", amount: 68 },
  { month: "T3", amount: 61 },
  { month: "T4", amount: 83 },
  { month: "T5", amount: 79 },
  { month: "T6", amount: 92 },
];

const utilityData = [
  { month: "T1", electricity: 45, water: 32 },
  { month: "T2", electricity: 52, water: 38 },
  { month: "T3", electricity: 48, water: 35 },
  { month: "T4", electricity: 63, water: 42 },
  { month: "T5", electricity: 58, water: 39 },
  { month: "T6", electricity: 71, water: 45 },
];

const contractStatusData = [
  { name: "Đang hiệu lực", value: 45 },
  { name: "Sắp hết hạn", value: 12 },
  { name: "Đã hết hạn", value: 8 },
  { name: "Chưa ký", value: 15 },
];

const recentActivities = [
  { id: 1, type: "resident", action: "Đăng ký mới", name: "Nguyễn Văn A", time: "5 phút trước" },
  { id: 2, type: "contract", action: "Gia hạn hợp đồng", name: "Căn A-1201", time: "15 phút trước" },
  { id: 3, type: "ticket", action: "Yêu cầu sửa chữa", name: "Căn B-0805", time: "30 phút trước" },
  { id: 4, type: "payment", action: "Thanh toán phí", name: "Căn C-1012", time: "1 giờ trước" },
  { id: 5, type: "vehicle", action: "Đăng ký xe mới", name: "30H-123.45", time: "2 giờ trước" },
];

// ============================================================
// CẤU TRÚC MENU VỚI PERMISSION
// ============================================================
const MENU_STRUCTURE = [
  {
    id: "dashboard",
    label: "Tổng quan",
    icon: Home,
    permission: "DASHBOARD_VIEW",
    items: [
      { id: "dashboard", label: "Dashboard", icon: Home, permission: "DASHBOARD_VIEW" },
      { id: "quick-report", label: "Báo cáo nhanh", icon: FileText, permission: "REPORT_VIEW" }
    ]
  },
  {
    id: "residents",
    label: "Quản lý cư dân",
    icon: Users,
    permission: "RESIDENT_VIEW",
    items: [
      { id: "residents", label: "Danh sách cư dân", icon: Users, permission: "RESIDENT_VIEW" },
      { id: "register-resident", label: "Đăng ký cư dân mới", icon: UserRound, permission: "RESIDENT_CREATE" },
      { id: "id-cards", label: "CCCD / Hồ sơ", icon: ShieldCheck, permission: "RESIDENT_VIEW" },
      { id: "family-members", label: "Thành viên hộ gia đình", icon: Users, permission: "RESIDENT_VIEW" },
      { id: "residence-history", label: "Lịch sử cư trú", icon: CalendarClock, permission: "RESIDENT_VIEW" }
    ]
  },
  {
    id: "apartments",
    label: "Quản lý căn hộ",
    icon: Building2,
    permission: "APARTMENT_VIEW",
    items: [
      { id: "apartments", label: "Danh sách căn hộ", icon: Building2, permission: "APARTMENT_VIEW" },
      { id: "buildings", label: "Tòa nhà", icon: Home, permission: "APARTMENT_VIEW" },
      { id: "floors", label: "Tầng", icon: ClipboardList, permission: "APARTMENT_VIEW" },
      { id: "apartment-status", label: "Trạng thái căn hộ", icon: CheckCircle2, permission: "APARTMENT_VIEW" },
      { id: "rental-history", label: "Lịch sử thuê", icon: CalendarClock, permission: "APARTMENT_VIEW" }
    ]
  },
  {
    id: "contracts",
    label: "Quản lý hợp đồng",
    icon: FileText,
    permission: "CONTRACT_VIEW",
    items: [
      { id: "contract-list", label: "Danh sách hợp đồng", icon: FileText, permission: "CONTRACT_VIEW" },
      { id: "create-contract", label: "Tạo hợp đồng", icon: Plus, permission: "CONTRACT_CREATE" },
      { id: "contract-renewal", label: "Gia hạn", icon: RefreshCw, permission: "CONTRACT_RENEW" },
      { id: "contract-terminate", label: "Thanh lý", icon: X, permission: "CONTRACT_LIQUIDATE" },
      { id: "deposits", label: "Tiền cọc", icon: CreditCard, permission: "CONTRACT_VIEW" }
    ]
  },
  {
    id: "services",
    label: "Dịch vụ công ích",
    icon: Wrench,
    permission: "SERVICE_VIEW",
    items: [
      { id: "electricity", label: "Điện", icon: Bolt, permission: "SERVICE_VIEW" },
      { id: "water", label: "Nước", icon: Droplet, permission: "SERVICE_VIEW" },
      { id: "register-service", label: "Đăng ký dịch vụ", icon: Plus, permission: "SERVICE_CREATE" },
      { id: "gym", label: "Gym", icon: Dumbbell, permission: "SERVICE_VIEW" },
      { id: "pool", label: "Hồ bơi", icon: Waves, permission: "SERVICE_VIEW" },
      { id: "event-space", label: "Event Space", icon: CalendarClock, permission: "SERVICE_VIEW" }
    ]
  },
  {
    id: "finance",
    label: "Hóa đơn & Tài chính",
    icon: CreditCard,
    permission: "INVOICE_VIEW",
    items: [
      { id: "fees", label: "Hóa đơn", icon: FileText, permission: "INVOICE_VIEW" },
      { id: "payments", label: "Thanh toán", icon: CreditCard, permission: "PAYMENT_CREATE" },
      { id: "debts", label: "Công nợ", icon: AlertCircle, permission: "DEBT_VIEW" },
      { id: "fee-collection", label: "Thu phí", icon: WalletCards, permission: "PAYMENT_CREATE" },
      { id: "revenue", label: "Doanh thu", icon: TrendingUp, permission: "REPORT_VIEW" }
    ]
  },
  {
    id: "vehicles",
    label: "Gửi xe",
    icon: Car,
    permission: "PARKING_VIEW",
    items: [
      { id: "vehicles", label: "Xe cư dân", icon: Car, permission: "PARKING_VIEW" },
      { id: "vehicle-cards", label: "Thẻ xe", icon: CreditCard, permission: "CARD_CREATE" },
      { id: "parking-lot", label: "Bãi xe", icon: Home, permission: "PARKING_VIEW" },
      { id: "entry-exit-history", label: "Lịch sử ra/vào", icon: CalendarClock, permission: "PARKING_HISTORY" }
    ]
  },
  {
    id: "operations",
    label: "Vận hành",
    icon: Wrench,
    permission: "TICKET_VIEW",
    items: [
      { id: "tickets", label: "Ticket", icon: Wrench, permission: "TICKET_VIEW" },
      { id: "maintenance", label: "Bảo trì", icon: Settings, permission: "MAINTENANCE_UPDATE" },
      { id: "feedbacks", label: "Phản ánh", icon: AlertCircle, permission: "TICKET_VIEW" },
      { id: "maintenance-schedule", label: "Lịch bảo trì", icon: CalendarClock, permission: "MAINTENANCE_UPDATE" },
      { id: "equipment", label: "Thiết bị", icon: ClipboardList, permission: "DEVICE_MANAGE" }
    ]
  },
  {
    id: "notifications",
    label: "Thông báo",
    icon: Bell,
    permission: "NOTIFICATION_VIEW",
    items: [
      { id: "notifications", label: "Danh sách", icon: Bell, permission: "NOTIFICATION_VIEW" },
      { id: "send-notification", label: "Gửi thông báo", icon: Send, permission: "NOTIFICATION_SEND" },
      { id: "schedule-notification", label: "Lịch gửi", icon: CalendarClock, permission: "NOTIFICATION_SEND" }
    ]
  },
  {
    id: "hr",
    label: "Nhân sự",
    icon: Users,
    permission: "EMPLOYEE_VIEW",
    items: [
      { id: "employees", label: "Nhân viên", icon: UserRound, permission: "EMPLOYEE_VIEW" },
      { id: "permissions", label: "Phân quyền", icon: ShieldCheck, permission: "PERMISSION_MANAGE" },
      { id: "roles", label: "Vai trò", icon: Users, permission: "ROLE_MANAGE" },
      { id: "system-logs", label: "Nhật ký hệ thống", icon: ClipboardList, permission: "SYSTEM_SETTING" }
    ]
  },
  {
    id: "reports",
    label: "Báo cáo",
    icon: FileText,
    permission: "REPORT_VIEW",
    items: [
      { id: "revenue-report", label: "Doanh thu", icon: TrendingUp, permission: "REPORT_VIEW" },
      { id: "debt-report", label: "Công nợ", icon: AlertCircle, permission: "REPORT_VIEW" },
      { id: "apartment-report", label: "Căn hộ", icon: Building2, permission: "REPORT_VIEW" },
      { id: "service-report", label: "Dịch vụ", icon: Wrench, permission: "REPORT_VIEW" },
      { id: "export-excel", label: "Excel", icon: Download, permission: "REPORT_EXCEL" },
      { id: "export-pdf", label: "PDF", icon: FileText, permission: "REPORT_PDF" }
    ]
  },
  {
    id: "ai",
    label: "AI Assistant",
    icon: Bot,
    permission: "AI_CHAT",
    items: [
      { id: "ai-chat", label: "Chat AI", icon: MessageSquare, permission: "AI_CHAT" },
      { id: "ai-stats", label: "Thống kê AI", icon: BarChart, permission: "AI_STATISTIC" },
      { id: "ai-predict", label: "Dự đoán hợp đồng", icon: TrendingUp, permission: "AI_PREDICT" },
      { id: "ai-search", label: "AI tìm kiếm", icon: Search, permission: "AI_SEARCH" }
    ]
  },
  {
    id: "settings",
    label: "Cài đặt",
    icon: Settings,
    permission: "PROFILE_UPDATE",
    items: [
      { id: "profile", label: "Hồ sơ", icon: UserRound, permission: "PROFILE_UPDATE" },
      { id: "change-password", label: "Đổi mật khẩu", icon: LockKeyhole, permission: "PASSWORD_CHANGE" },
      { id: "system-info", label: "Thông tin hệ thống", icon: Info, permission: "SYSTEM_SETTING" }
    ]
  }
];

// ============================================================
// CONTENT TITLES
// ============================================================
const CONTENT_TITLES = {
  dashboard: ["Bảng điều khiển", "Theo dõi vận hành chung cư, thông báo và tình trạng căn hộ trong ngày."],
  "quick-report": ["Báo cáo nhanh", "Xem báo cáo tổng hợp nhanh"],
  residents: ["Danh sách cư dân", "Quản lý hồ sơ cư dân, liên hệ, ngày sinh và căn hộ đang ở."],
  "register-resident": ["Đăng ký cư dân mới", "Thêm cư dân mới vào hệ thống"],
  "id-cards": ["CCCD / Hồ sơ", "Quản lý CCCD và hồ sơ cư dân"],
  "family-members": ["Thành viên hộ gia đình", "Quản lý thành viên trong hộ gia đình"],
  "residence-history": ["Lịch sử cư trú", "Xem lịch sử cư trú của cư dân"],
  apartments: ["Danh sách căn hộ", "Quản lý căn hộ, trạng thái và thông tin liên quan."],
  buildings: ["Tòa nhà", "Quản lý thông tin tòa nhà"],
  floors: ["Tầng", "Quản lý thông tin tầng"],
  "apartment-status": ["Trạng thái căn hộ", "Xem trạng thái các căn hộ"],
  "rental-history": ["Lịch sử thuê", "Lịch sử cho thuê căn hộ"],
  "contract-list": ["Danh sách hợp đồng", "Quản lý hợp đồng thuê"],
  "create-contract": ["Tạo hợp đồng", "Tạo hợp đồng thuê mới"],
  "contract-renewal": ["Gia hạn hợp đồng", "Gia hạn hợp đồng thuê"],
  "contract-terminate": ["Thanh lý hợp đồng", "Thanh lý hợp đồng thuê"],
  deposits: ["Tiền cọc", "Quản lý tiền cọc"],
  electricity: ["Điện", "Quản lý điện năng"],
  water: ["Nước", "Quản lý nước"],
  "register-service": ["Đăng ký dịch vụ", "Đăng ký dịch vụ công ích"],
  gym: ["Gym", "Quản lý phòng gym"],
  pool: ["Hồ bơi", "Quản lý hồ bơi"],
  "event-space": ["Event Space", "Quản lý không gian sự kiện"],
  fees: ["Hóa đơn", "Quản lý hóa đơn và thu phí"],
  payments: ["Thanh toán", "Quản lý thanh toán"],
  debts: ["Công nợ", "Quản lý công nợ"],
  "fee-collection": ["Thu phí", "Thu phí dịch vụ"],
  revenue: ["Doanh thu", "Báo cáo doanh thu"],
  vehicles: ["Xe cư dân", "Quản lý xe cư dân"],
  "vehicle-cards": ["Thẻ xe", "Quản lý thẻ xe"],
  "parking-lot": ["Bãi xe", "Quản lý bãi xe"],
  "entry-exit-history": ["Lịch sử ra/vào", "Lịch sử ra vào bãi xe"],
  tickets: ["Ticket hỗ trợ", "Quản lý yêu cầu hỗ trợ"],
  maintenance: ["Bảo trì", "Quản lý bảo trì"],
  feedbacks: ["Phản ánh", "Quản lý phản ánh của cư dân"],
  "maintenance-schedule": ["Lịch bảo trì", "Lịch bảo trì thiết bị"],
  equipment: ["Thiết bị", "Quản lý thiết bị"],
  notifications: ["Thông báo", "Quản lý thông báo"],
  "send-notification": ["Gửi thông báo", "Gửi thông báo đến cư dân"],
  "schedule-notification": ["Lịch gửi", "Lịch gửi thông báo"],
  employees: ["Nhân viên", "Quản lý nhân viên"],
  permissions: ["Phân quyền", "Phân quyền người dùng"],
  roles: ["Vai trò", "Quản lý vai trò"],
  "system-logs": ["Nhật ký hệ thống", "Xem nhật ký hệ thống"],
  "revenue-report": ["Báo cáo doanh thu", "Báo cáo doanh thu chi tiết"],
  "debt-report": ["Báo cáo công nợ", "Báo cáo công nợ chi tiết"],
  "apartment-report": ["Báo cáo căn hộ", "Báo cáo căn hộ"],
  "service-report": ["Báo cáo dịch vụ", "Báo cáo dịch vụ"],
  "export-excel": ["Xuất Excel", "Xuất báo cáo Excel"],
  "export-pdf": ["Xuất PDF", "Xuất báo cáo PDF"],
  "ai-chat": ["Chat AI", "Trò chuyện với AI"],
  "ai-stats": ["Thống kê AI", "Thống kê từ AI"],
  "ai-predict": ["Dự đoán hợp đồng", "Dự đoán từ AI"],
  "ai-search": ["AI tìm kiếm", "Tìm kiếm với AI"],
  profile: ["Hồ sơ", "Quản lý hồ sơ"],
  "change-password": ["Đổi mật khẩu", "Đổi mật khẩu"],
  "system-info": ["Thông tin hệ thống", "Thông tin hệ thống"],
};

// ============================================================
// COMPONENT CHÍNH: ApartmentManagementWeb
// ============================================================
export default function ApartmentManagementWeb() {
  // ===== State =====
  const [user, setUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [tab, setTab] = useState(null); // Sửa: mặc định là null (trống)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [apartmentStatus, setApartmentStatus] = useState("Tất cả");
  const [toast, setToast] = useState("");

  // Menu expanded states
  const getInitialExpanded = () => {
    try {
      const saved = localStorage.getItem('menuExpanded');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...parsed, dashboard: true };
      }
    } catch {}
    return { dashboard: true };
  };

  const [expandedMenus, setExpandedMenus] = useState(getInitialExpanded);

  // Lưu trạng thái menu
  useEffect(() => {
    localStorage.setItem('menuExpanded', JSON.stringify(expandedMenus));
  }, [expandedMenus]);

  // ===== Lấy permissions từ user =====
  useEffect(() => {
    if (user) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUserPermissions(userData.permissions || []);
        } catch {}
      }
    }
  }, [user]);

  // Data states
  const [residents, setResidents] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [history, setHistory] = useState([]);
  const [queue, setQueue] = useState([]);
  const [fees, setFees] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Loading states
  const [loadingApartments, setLoadingApartments] = useState(true);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [loadingFees, setLoadingFees] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Modal states
  const [selectedResident, setSelectedResident] = useState(null);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [birthdayMonthDay, setBirthdayMonthDay] = useState("04-27");

  // Notice form
  const [notice, setNotice] = useState({
    title: "Bảo trì thang máy Block A",
    body: "Ban quản lý thông báo thang máy Block A bảo trì từ 09:00 đến 11:00. Mong cư dân thông cảm.",
    target: "Tất cả cư dân",
    start: "2026-04-27T09:00",
    end: "2026-04-27T11:00",
    timezone: "Asia/Ho_Chi_Minh",
  });

  // New ticket form
  const [newTicket, setNewTicket] = useState({
    title: "",
    resident: "",
    apartment: "",
    category: "Bảo trì",
    priority: "Trung bình",
  });

  // New vehicle form
  const [newVehicle, setNewVehicle] = useState({
    plate: "",
    owner: "",
    apartment: "",
    type: "Ô tô",
    slot: "",
  });

  // ===== Functions =====
  const flash = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2800);
  }, []);

  const toggleMenu = useCallback((menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  }, []);

  // ===== Filter menu theo permissions =====
  const filteredMenu = useMemo(() => {
    // Nếu là admin (có tất cả quyền) hoặc chưa có permissions thì hiển thị tất cả
    if (userPermissions.includes('ADMIN') || userPermissions.length === 0) {
      return MENU_STRUCTURE;
    }

    return MENU_STRUCTURE
      .filter(menu => {
        // Kiểm tra menu cha
        if (menu.permission && !userPermissions.includes(menu.permission)) {
          const hasChildWithPermission = menu.items.some(item => 
            !item.permission || userPermissions.includes(item.permission)
          );
          return hasChildWithPermission;
        }
        return true;
      })
      .map(menu => ({
        ...menu,
        items: menu.items.filter(item => 
          !item.permission || userPermissions.includes(item.permission)
        )
      }))
      .filter(menu => menu.items.length > 0);
  }, [userPermissions]);

  // ===== Hàm kiểm tra có quyền truy cập tab =====
  const hasTabPermission = useCallback((tabId) => {
    if (!tabId) return false;
    if (userPermissions.includes('ADMIN') || userPermissions.length === 0) {
      return true;
    }

    for (const menu of MENU_STRUCTURE) {
      for (const item of menu.items) {
        if (item.id === tabId) {
          return !item.permission || userPermissions.includes(item.permission);
        }
      }
    }
    return false;
  }, [userPermissions]);

  // ===== Khi đổi tab, kiểm tra quyền =====
  const handleTabChange = useCallback((newTab) => {
    if (newTab && hasTabPermission(newTab)) {
      setTab(newTab);
      setSidebarOpen(false);
      setSelectedResident(null);
      setSelectedApartment(null);
    } else if (newTab) {
      flash('⚠️ Bạn không có quyền truy cập chức năng này');
    }
  }, [hasTabPermission, flash]);

  // ===== Excel Functions =====
  const exportSheet = useCallback((fileName, sheetName, rows) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  }, []);

  const downloadResidentTemplate = useCallback(() => {
    exportSheet("mau-import-cu-dan.xlsx", "CuDan", [
      {
        MaCuDan: "R007",
        HoTen: "Nguyễn Văn A",
        Email: "vana@example.com",
        SoDienThoai: "0912345678",
        NgaySinh: "1998-04-27",
        CanHo: "A-0101",
        Block: "A",
        TrangThai: "Đang ở",
      },
    ]);
  }, [exportSheet]);

  // ===== API Functions =====
  const fetchAllData = useCallback(async () => {
    try {
      setLoadingApartments(true);
      try {
        const aptData = await apartmentAPI.getAll('', '', 1, 999);
        const data = aptData?.data || aptData || [];
        const mappedApartments = data.map((item) => ({
          id: item.ApartmentCode || item.apartmentCode || item.code || item.id,
          code: item.ApartmentCode || item.apartmentCode || item.code,
          tower: item.BuildingName || item.buildingName || item.tower || '',
          floor: item.FloorNumber || item.floorNumber || item.floor || '',
          area: item.Area || item.area || 0,
          status: item.Status || item.statusName || item.status || 'Trống',
          owners: item.OwnerName || item.ownerName || item.owners || 'Chưa cập nhật',
          view: item.view || 'Nội khu',
          balcony: item.balcony || 'Đông Nam',
          furniture: item.furniture || 'Cơ bản',
          purpose: item.purpose || 'Để ở',
          handoverDate: item.handoverDate || 'Đã đồng bộ',
        }));
        setApartments(mappedApartments);
      } catch (e) {
        console.error('❌ Error fetching apartments:', e);
      } finally {
        setLoadingApartments(false);
      }

      setLoadingResidents(true);
      try {
        const resData = await residentAPI.getAll('', 1, 999);
        const data = resData?.data || resData || [];
        const mappedResidents = data.map((item) => ({
          id: item.ResidentID || item.residentId || item.id,
          name: item.FullName || item.fullName || item.name,
          phone: item.Phone || item.phone || '',
          email: item.Email || item.email || '',
          birthday: item.BirthDate || item.birthDate || item.birthday || '',
          apartment: item.ApartmentCode || item.apartmentCode || item.apartment || '',
          tower: item.BuildingName || item.buildingName || item.tower || '',
          idCard: {
            number: item.IdentityNumber || item.identityNumber || '',
            date: item.IssueDate || item.issueDate || '',
            place: item.IssuePlace || item.issuePlace || '',
          },
          isOwner: item.isOwner || false,
          household: item.household || 'Chưa cập nhật',
          address: item.Address || item.address || 'Chưa cập nhật',
          status: item.Status || item.status || 'Đang ở',
        }));
        setResidents(mappedResidents);
      } catch (e) {
        console.error('❌ Error fetching residents:', e);
      } finally {
        setLoadingResidents(false);
      }

      setLoadingFees(true);
      try {
        const invData = await invoiceAPI.getAll('', '', '', 1, 999);
        const data = invData?.data || invData || [];
        const mappedFees = data.map((item) => ({
          id: item.InvoiceID || item.invoiceId || item.id,
          apartment: item.ApartmentCode || item.apartmentCode || item.apartment || '',
          owner: item.OwnerName || item.ownerName || item.owner || '',
          month: item.InvoiceMonth || item.invoiceMonth || item.month || '01',
          year: item.InvoiceYear || item.invoiceYear || item.year || '2026',
          service: item.serviceFee || 0,
          parking: item.parkingFee || 0,
          water: item.waterFee || 0,
          status: item.StatusName || item.statusName || item.status || 'Chưa thanh toán',
          total: item.TotalAmount || item.totalAmount || 0,
        }));
        setFees(mappedFees);
      } catch (e) {
        console.error('❌ Error fetching invoices:', e);
      } finally {
        setLoadingFees(false);
      }

      setLoadingTickets(true);
      try {
        const tickData = await ticketAPI.getAll('', 1, 999);
        const data = tickData?.data || tickData || [];
        const mappedTickets = data.map((item) => ({
          id: item.RequestID || item.requestId || item.id,
          title: item.Title || item.title || '',
          resident: item.ResidentName || item.residentName || item.resident || '',
          apartment: item.ApartmentCode || item.apartmentCode || item.apartment || '',
          category: item.Category || item.category || 'Bảo trì',
          priority: item.Priority || item.priority || 'Trung bình',
          status: item.StatusName || item.statusName || item.status || 'Mới',
          createdAt: item.RequestDate || item.requestDate || item.createdAt || new Date().toLocaleString(),
        }));
        setTickets(mappedTickets);
      } catch (e) {
        console.error('❌ Error fetching tickets:', e);
      } finally {
        setLoadingTickets(false);
      }

      setLoadingVehicles(true);
      try {
        const vehData = await vehicleAPI.getAll('', '', 1, 999);
        const data = vehData?.data || vehData || [];
        const mappedVehicles = data.map((item) => ({
          id: item.VehicleID || item.vehicleId || item.id,
          plate: item.PlateNumber || item.plateNumber || item.plate || '',
          owner: item.OwnerName || item.ownerName || item.owner || '',
          apartment: item.ApartmentCode || item.apartmentCode || item.apartment || '',
          type: item.VehicleType || item.vehicleType || item.type || 'Ô tô',
          slot: item.SlotNumber || item.slotNumber || item.slot || '',
          status: item.StatusName || item.statusName || item.status || 'Hoạt động',
        }));
        setVehicles(mappedVehicles);
      } catch (e) {
        console.error('❌ Error fetching vehicles:', e);
      } finally {
        setLoadingVehicles(false);
      }

      try {
        const historyData = await notificationAPI.getAll('', 1, 999);
        const data = historyData?.data || historyData || [];
        setHistory(data);
      } catch (e) {
        console.warn('⚠️ Notifications not available:', e.message);
        setHistory([]);
      }

      flash('✅ Đã tải dữ liệu thành công!');
    } catch (error) {
      console.error('❌ Lỗi khi tải dữ liệu:', error);
      flash('Không thể tải dữ liệu từ máy chủ!');
    }
  }, [flash]);

  // ===== Business Functions =====
  const validateNotice = useCallback(() => {
    if (!notice.title.trim()) return "Vui lòng nhập tiêu đề thông báo.";
    if (!notice.body.trim()) return "Vui lòng nhập nội dung thông báo.";
    if (!notice.start || !notice.end) return "Vui lòng chọn thời gian bắt đầu và kết thúc.";
    if (new Date(notice.start) >= new Date(notice.end)) return "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc.";
    if (!notice.timezone.includes("/")) return "Timezone chưa hợp lệ, ví dụ: Asia/Ho_Chi_Minh.";
    return "";
  }, [notice]);

  const scheduleNotice = useCallback(() => {
    const error = validateNotice();
    if (error) {
      flash(error);
      return;
    }

    const newItem = {
      id: `Q${String(queue.length + 1).padStart(3, "0")}`,
      title: notice.title,
      start: notice.start,
      end: notice.end,
      timezone: notice.timezone,
      target: notice.target,
      status: "Chờ gửi",
    };

    setQueue([newItem, ...queue]);
    setNotifyOpen(false);
    flash("Đã thêm lịch gửi thông báo.");
  }, [validateNotice, flash, queue, notice]);

  const markFeePaid = useCallback((id) => {
    setFees(fees.map((fee) => (fee.id === id ? { ...fee, status: "Đã thanh toán" } : fee)));
    flash("Đã cập nhật trạng thái thanh toán.");
  }, [fees, flash]);

  const createTicket = useCallback(() => {
    if (!newTicket.title || !newTicket.resident || !newTicket.apartment) {
      flash("Vui lòng nhập đủ tiêu đề, cư dân và căn hộ.");
      return;
    }
    setTickets([
      {
        id: `T${String(tickets.length + 1).padStart(3, "0")}`,
        ...newTicket,
        status: "Mới",
        createdAt: new Date().toLocaleString("vi-VN", { hour12: false }),
      },
      ...tickets,
    ]);
    setNewTicket({ title: "", resident: "", apartment: "", category: "Bảo trì", priority: "Trung bình" });
    setTicketOpen(false);
    flash("Đã tạo yêu cầu xử lý mới.");
  }, [newTicket, tickets, flash]);

  const updateTicketStatus = useCallback((id, status) => {
    setTickets(tickets.map((ticket) => (ticket.id === id ? { ...ticket, status } : ticket)));
    flash("Đã cập nhật trạng thái yêu cầu.");
  }, [tickets, flash]);

  const createVehicle = useCallback(() => {
    if (!newVehicle.plate || !newVehicle.owner || !newVehicle.apartment || !newVehicle.slot) {
      flash("Vui lòng nhập đủ biển số, chủ xe, căn hộ và vị trí đỗ.");
      return;
    }
    setVehicles([
      {
        id: `V${String(vehicles.length + 1).padStart(3, "0")}`,
        ...newVehicle,
        status: "Hoạt động",
      },
      ...vehicles,
    ]);
    setNewVehicle({ plate: "", owner: "", apartment: "", type: "Ô tô", slot: "" });
    setVehicleOpen(false);
    flash("Đã đăng ký xe mới.");
  }, [newVehicle, vehicles, flash]);

  // ===== useEffect =====
  useEffect(() => {
    if (!user) return;
    fetchAllData();
    userAPI.getAuditLogs({ limit: 50 }).then(res => {
      if (res?.data) setAuditLogs(res.data);
    }).catch(() => {});
  }, [user, fetchAllData]);

  // ===== Filtered Data =====
  const filteredResidents = useMemo(() => {
    const q = search.toLowerCase();
    return residents.filter((r) =>
      [r.name, r.phone, r.email, r.apartment, r.tower].some((field) => String(field).toLowerCase().includes(q))
    );
  }, [residents, search]);

  const filteredApartments = useMemo(() => {
    return apartments.filter((a) => {
      const matchStatus = apartmentStatus === "Tất cả" || a.status === apartmentStatus;
      const q = search.toLowerCase();
      const ownersText = Array.isArray(a.owners) ? a.owners.join(" ") : a.owners || "";
      const matchSearch = [a.id, a.tower, a.type, ownersText, a.status].some((field) => String(field).toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [apartments, apartmentStatus, search]);

  const filteredFees = useMemo(() => {
    const q = search.toLowerCase();
    return fees.filter((f) =>
      [f.apartment, f.owner, f.month, f.status].some((field) => String(field).toLowerCase().includes(q))
    );
  }, [fees, search]);

  const filteredTickets = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter((t) =>
      [t.title, t.resident, t.apartment, t.category, t.status].some((field) => String(field).toLowerCase().includes(q))
    );
  }, [tickets, search]);

  const filteredVehicles = useMemo(() => {
    const q = search.toLowerCase();
    return vehicles.filter((v) =>
      [v.plate, v.owner, v.apartment, v.type, v.slot, v.status].some((field) => String(field).toLowerCase().includes(q))
    );
  }, [vehicles, search]);

  const birthdayResidents = useMemo(
    () => residents.filter((r) => formatBirthday(r.birthday) === birthdayMonthDay),
    [residents, birthdayMonthDay]
  );

  const occupancyData = useMemo(() => {
    const groups = apartments.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [apartments]);

  const historyChart = useMemo(() => {
    const groups = history.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + (item.count || 0);
      return acc;
    }, {});
    return Object.entries(groups).map(([name, count]) => ({ name, count }));
  }, [history]);

  const totalFees = useMemo(() => fees.reduce((sum, item) => sum + (item.service || 0) + (item.parking || 0) + (item.water || 0), 0), [fees]);
  const unpaidFees = useMemo(() => fees
    .filter((item) => item.status !== "Đã thanh toán")
    .reduce((sum, item) => sum + (item.service || 0) + (item.parking || 0) + (item.water || 0), 0), [fees]);

  // ===== Sidebar Component =====
  const Sidebar = useMemo(() => (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f4f46] text-white">
          <Building2 size={21} />
        </div>
        <div>
          <h1 className="text-base font-bold leading-tight text-slate-950">Đức Vũ Tower</h1>
          <p className="text-xs text-slate-500">Property Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {filteredMenu.map((menu) => {
          const Icon = menu.icon;
          const isExpanded = expandedMenus[menu.id];
          const isActive = menu.items.some(item => item.id === tab);
          
          return (
            <div key={menu.id} className="mb-1">
              <button
                onClick={() => toggleMenu(menu.id)}
                className={cls(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                  isActive ? "bg-[#eef5f2] text-[#1f4f46]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} />
                  {menu.label}
                </span>
                <ChevronRight 
                  size={16} 
                  className={cls(
                    "transition-transform duration-200",
                    isExpanded ? "rotate-90" : ""
                  )}
                />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-3 mt-1 space-y-0.5 border-l border-slate-200 pl-3">
                      {menu.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive = tab === item.id;
                        // Kiểm tra quyền cho item
                        const hasPermission = !item.permission || userPermissions.includes(item.permission);
                        
                        if (!hasPermission) return null;

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={cls(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                              isItemActive
                                ? "bg-[#eef5f2] text-[#1f4f46] font-semibold"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            )}
                          >
                            <ItemIcon size={16} />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck size={16} className="text-[#1f4f46]" />
          Đã đăng nhập
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">{user?.email}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {userPermissions.slice(0, 3).map((perm, idx) => (
            <Badge key={idx} tone="slate" className="text-[10px]">{perm}</Badge>
          ))}
          {userPermissions.length > 3 && (
            <Badge tone="slate" className="text-[10px]">+{userPermissions.length - 3}</Badge>
          )}
        </div>
        <Button variant="secondary" className="mt-3 w-full" onClick={() => logout()}>
          Đăng xuất
        </Button>
      </div>
    </aside>
  ), [filteredMenu, tab, expandedMenus, toggleMenu, handleTabChange, user, userPermissions]);

  // ===== Render =====
  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-slate-900">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-72">
        {Sidebar}
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-slate-950/40" onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="relative h-full w-72">
              {Sidebar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <Input icon={Search} placeholder="Tìm kiếm..." className="hidden w-[360px] md:flex" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
              <Bell size={18} />
            </button>
            <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
              <Settings size={18} />
            </button>
            <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" onClick={fetchAllData}>
              <RefreshCw size={18} />
            </button>
            <div className="ml-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f4f46] text-xs font-bold text-white">QL</div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold leading-tight text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Title - Chỉ hiển thị khi có tab được chọn */}
        {tab && (
          <PageTitle
            eyebrow="Chung cư Đức Vũ Tower"
            title={CONTENT_TITLES[tab]?.[0] || "Dashboard"}
            description={CONTENT_TITLES[tab]?.[1] || ""}
            actions={
              <>
                <Button variant="secondary" onClick={() => setImportOpen(true)}>
                  <Import size={16} /> Nhập Excel
                </Button>
                <Button onClick={() => setNotifyOpen(true)}>
                  <CalendarClock size={16} /> Lên lịch gửi
                </Button>
              </>
            }
          />
        )}

        <main className="p-4 lg:p-8">
          {/* TRANG TRỐNG KHI CHƯA CHỌN TAB */}
          {!tab && (
            <motion.section 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="text-center max-w-2xl">
                <div className="mb-8 flex justify-center">
                  <div className="rounded-full bg-[#eef5f2] p-8">
                    <Building2 size={80} className="text-[#1f4f46]" />
                  </div>
                </div>
                <h2 className="text-4xl font-bold text-slate-950 mb-4">Chào mừng đến với Đức Vũ Tower</h2>
                <p className="text-lg text-slate-600 mb-6">
                  Vui lòng chọn một chức năng từ menu bên trái để bắt đầu quản lý vận hành chung cư.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <Users className="text-[#1f4f46] mx-auto mb-2" size={32} />
                    <p className="font-semibold text-slate-900">Quản lý cư dân</p>
                    <p className="text-sm text-slate-500">Theo dõi hồ sơ cư dân</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <Building2 className="text-[#1f4f46] mx-auto mb-2" size={32} />
                    <p className="font-semibold text-slate-900">Quản lý căn hộ</p>
                    <p className="text-sm text-slate-500">Kiểm soát tình trạng căn hộ</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <CreditCard className="text-[#1f4f46] mx-auto mb-2" size={32} />
                    <p className="font-semibold text-slate-900">Quản lý tài chính</p>
                    <p className="text-sm text-slate-500">Theo dõi thu chi và công nợ</p>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* DASHBOARD TAB */}
          {tab === "dashboard" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Users} label="Cư dân" value={residents.length} trend="+12%" hint="Hồ sơ đang quản lý trong hệ thống" />
                <StatCard icon={Building2} label="Căn hộ" value={apartments.length} hint="Bao gồm đang thuê, trống và bảo trì" />
                <StatCard icon={FileText} label="Hợp đồng" value="45" trend="+5%" hint="Đang hiệu lực" />
                <StatCard icon={CreditCard} label="Doanh thu tháng" value={money(totalFees).replace("₫", "")} trend="+8%" hint="Tổng thu từ phí dịch vụ" />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={AlertCircle} label="Công nợ" value={money(unpaidFees).replace("₫", "")} hint="Cần thu hồi" />
                <StatCard icon={Wrench} label="Ticket" value={tickets.filter((t) => t.status !== "Hoàn tất").length} hint="Đang xử lý" />
                <StatCard icon={Car} label="Xe" value={vehicles.length} hint="Đang hoạt động" />
                <StatCard icon={Bolt} label="Điện" value="12,847 kWh" trend="+3%" hint="Tiêu thụ tháng này" />
                <StatCard icon={Droplet} label="Nước" value="4,231 m³" trend="+2%" hint="Tiêu thụ tháng này" />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 p-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">Doanh thu & Tiêu thụ dịch vụ</h3>
                      <p className="text-sm text-slate-500">Biểu đồ so sánh doanh thu và tiêu thụ điện/nước.</p>
                    </div>
                    <Badge tone="green">6 tháng</Badge>
                  </div>
                  <div className="h-80 p-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1f4f46" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#1f4f46" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="amount" stroke="#1f4f46" strokeWidth={3} fill="url(#revenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="overflow-hidden">
                  <div className="border-b border-slate-200 p-5">
                    <h3 className="text-base font-bold text-slate-950">Tình trạng căn hộ</h3>
                    <p className="text-sm text-slate-500">Trống / đã thuê / bảo trì.</p>
                  </div>
                  <div className="h-64 p-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={occupancyData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={4} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                          {occupancyData.map((_, index) => (
                            <Cell key={index} fill={["#1f4f46", "#d99a35", "#64748b"][index % 3]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 border-t border-slate-200 text-center text-sm">
                    {occupancyData.map((item) => (
                      <div key={item.name} className="p-3">
                        <p className="font-bold text-slate-900">{item.value}</p>
                        <p className="text-xs text-slate-500">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <Card className="overflow-hidden">
                  <div className="border-b border-slate-200 p-5">
                    <h3 className="text-base font-bold text-slate-950">Tiêu thụ điện & nước</h3>
                    <p className="text-sm text-slate-500">Biểu đồ so sánh tiêu thụ theo tháng.</p>
                  </div>
                  <div className="h-72 p-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={utilityData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="electricity" name="Điện (kWh)" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="water" name="Nước (m³)" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 p-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">Tình trạng hợp đồng</h3>
                      <p className="text-sm text-slate-500">Phân bố hợp đồng theo trạng thái.</p>
                    </div>
                    <Badge tone="blue">45 hợp đồng</Badge>
                  </div>
                  <div className="h-72 p-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={contractStatusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={4} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                          {contractStatusData.map((_, index) => (
                            <Cell key={index} fill={["#10b981", "#f59e0b", "#ef4444", "#94a3b8"][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 border-t border-slate-200 text-center text-sm">
                    {contractStatusData.map((item) => (
                      <div key={item.name} className="p-3 border-r border-slate-200 last:border-r-0">
                        <p className="font-bold text-slate-900">{item.value}</p>
                        <p className="text-xs text-slate-500">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 p-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Hoạt động gần đây</h3>
                    <p className="text-sm text-slate-500">Các sự kiện và giao dịch mới nhất.</p>
                  </div>
                  <Button variant="secondary" onClick={() => flash("Đã tải thêm hoạt động.")}>Xem tất cả</Button>
                </div>
                <div className="divide-y divide-slate-100">
                  {recentActivities.map((activity) => {
                    const getIcon = () => {
                      switch(activity.type) {
                        case "resident": return <Users size={16} className="text-emerald-600" />;
                        case "contract": return <FileText size={16} className="text-blue-600" />;
                        case "ticket": return <Wrench size={16} className="text-amber-600" />;
                        case "payment": return <CreditCard size={16} className="text-green-600" />;
                        case "vehicle": return <Car size={16} className="text-purple-600" />;
                        default: return <Bell size={16} className="text-slate-600" />;
                      }
                    };
                    
                    const getBadgeColor = () => {
                      switch(activity.type) {
                        case "resident": return "green";
                        case "contract": return "blue";
                        case "ticket": return "amber";
                        case "payment": return "green";
                        case "vehicle": return "purple";
                        default: return "slate";
                      }
                    };

                    return (
                      <div key={activity.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">{getIcon()}</div>
                          <div>
                            <p className="font-medium text-slate-900">
                              <span className="font-bold">{activity.name}</span>
                              <span className="text-slate-500 ml-1">{activity.action}</span>
                            </p>
                            <p className="text-xs text-slate-400">{activity.time}</p>
                          </div>
                        </div>
                        <Badge tone={getBadgeColor()}>{activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}</Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><CheckCircle2 size={24} /></div>
                    <div>
                      <p className="text-sm font-medium text-emerald-700">Tỷ lệ lấp đầy</p>
                      <p className="text-2xl font-bold text-slate-950">
                        {apartments.length > 0 ? Math.round((apartments.filter(a => a.status === "Đã thuê").length / apartments.length) * 100) : 0}%
                      </p>
                      <p className="text-xs text-emerald-600">Căn hộ đã cho thuê</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 bg-gradient-to-br from-blue-50 to-white border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-100 p-3 text-blue-700"><CalendarClock size={24} /></div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Sắp hết hạn</p>
                      <p className="text-2xl font-bold text-slate-950">12</p>
                      <p className="text-xs text-blue-600">Hợp đồng cần gia hạn</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 bg-gradient-to-br from-amber-50 to-white border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-100 p-3 text-amber-700"><Bell size={24} /></div>
                    <div>
                      <p className="text-sm font-medium text-amber-700">Thông báo mới</p>
                      <p className="text-2xl font-bold text-slate-950">8</p>
                      <p className="text-xs text-amber-600">Chưa đọc</p>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.section>
          )}

          {/* NOTIFICATIONS TAB */}
          {tab === "notifications" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="overflow-hidden">
                <div className="border-b border-slate-200 p-5">
                  <h3 className="text-base font-bold text-slate-950">Tạo thông báo mới</h3>
                  <p className="text-sm text-slate-500">Validate thời gian, timezone và đối tượng nhận trước khi gửi.</p>
                </div>
                <div className="space-y-4 p-5">
                  <Input value={notice.title} onChange={(e) => setNotice({ ...notice, title: e.target.value })} placeholder="Tiêu đề thông báo" />
                  <textarea
                    className="min-h-36 w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#1f4f46]"
                    value={notice.body}
                    onChange={(e) => setNotice({ ...notice, body: e.target.value })}
                    placeholder="Nội dung thông báo"
                  />
                  <Select value={notice.target} onChange={(e) => setNotice({ ...notice, target: e.target.value })} className="w-full">
                    <option>Tất cả cư dân</option>
                    <option>Block A</option>
                    <option>Block B</option>
                    <option>Block C</option>
                    <option>Cư dân sinh nhật hôm nay</option>
                  </Select>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input type="datetime-local" value={notice.start} onChange={(e) => setNotice({ ...notice, start: e.target.value })} />
                    <Input type="datetime-local" value={notice.end} onChange={(e) => setNotice({ ...notice, end: e.target.value })} />
                  </div>
                  <Input value={notice.timezone} onChange={(e) => setNotice({ ...notice, timezone: e.target.value })} placeholder="Asia/Ho_Chi_Minh" />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={scheduleNotice}><CalendarClock size={16} /> Thêm vào lịch gửi</Button>
                    <Button variant="secondary" onClick={() => {
                      const item = { ...notice, id: "manual" };
                      setQueue(queue.filter((q) => q.id !== item.id));
                      setHistory([
                        {
                          id: `H${String(history.length + 1).padStart(3, "0")}`,
                          title: item.title,
                          type: "Gửi hàng loạt",
                          target: item.target,
                          sentAt: new Date().toLocaleString("vi-VN", { hour12: false }),
                          state: "Đã gửi",
                          count: item.target === "Tất cả cư dân" ? residents.length : 1,
                        },
                        ...history,
                      ]);
                      flash("Đã gửi thông báo và lưu lịch sử gửi.");
                    }}><Send size={16} /> Gửi ngay</Button>
                  </div>
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="overflow-hidden">
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">Cư dân sinh nhật</h3>
                      <p className="text-sm text-slate-500">Lọc theo MM-DD, không cần năm sinh.</p>
                    </div>
                    <Input value={birthdayMonthDay} onChange={(e) => setBirthdayMonthDay(e.target.value)} className="md:w-40" placeholder="04-27" />
                  </div>
                  <div className="space-y-3 p-5">
                    {birthdayResidents.length === 0 && <EmptyState title="Không có cư dân phù hợp" description="Thử nhập ngày theo định dạng MM-DD, ví dụ 04-27." />}
                    {birthdayResidents.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef5f2] text-sm font-bold text-[#1f4f46]">{getInitials(r.name)}</div>
                          <div>
                            <p className="font-bold text-slate-950">{r.name}</p>
                            <p className="text-sm text-slate-500">{r.apartment} · {formatBirthday(r.birthday)} · {r.phone}</p>
                          </div>
                        </div>
                        <Button variant="success" onClick={() => flash(`Đã gửi lời chúc sinh nhật đến ${r.name}`)}>
                          <Mail size={16} /> Gửi
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="overflow-hidden">
                  <div className="border-b border-slate-200 p-5">
                    <h3 className="text-base font-bold text-slate-950">Thống kê gửi theo loại</h3>
                    <p className="text-sm text-slate-500">Phân nhóm dữ liệu lịch sử thông báo.</p>
                  </div>
                  <div className="h-64 p-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historyChart}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1f4f46" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </motion.section>
          )}

          {/* RESIDENTS TAB */}
          {tab === "residents" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Card className="p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Hồ sơ cư dân</h3>
                    <p className="text-sm text-slate-500">Quản lý định danh, hộ khẩu và trạng thái cư trú.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, CMND..." />
                    <Button onClick={() => setImportOpen(true)}><Import size={16} /> Nhập liệu</Button>
                    <Button variant="secondary" onClick={() => {
                      exportSheet("danh-sach-cu-dan.xlsx", "CuDan", residents.map((r) => ({
                        MaCuDan: r.id,
                        HoTen: r.name,
                        Email: r.email,
                        SoDienThoai: r.phone,
                        NgaySinh: r.birthday,
                        CanHo: r.apartment,
                        Block: r.tower,
                        TrangThai: r.status,
                      })));
                    }}><Download size={16} /> Xuất Excel</Button>
                  </div>
                </div>
              </Card>
              {loadingResidents ? (
                <Card className="p-8 text-center"><p className="font-bold text-slate-900">Đang tải danh sách cư dân...</p></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredResidents.map((r) => (
                    <Card key={r.id} className="group p-5 hover:border-[#1f4f46]/30 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef5f2] text-[#1f4f46] font-bold">{getInitials(r.name)}</div>
                          <div>
                            <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">{r.name}</h3>
                            <p className="text-xs text-slate-500">CCCD: {r.idCard?.number || 'Chưa có'}</p>
                          </div>
                        </div>
                        <Badge tone={r.isOwner ? "green" : "blue"}>{r.isOwner ? "Chủ hộ" : "Cư dân"}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1"><Building2 size={14} /> Căn {r.apartment}</div>
                        <div className="flex items-center gap-1"><Phone size={14} /> {r.phone}</div>
                      </div>
                      <Button variant="secondary" className="mt-4 w-full" onClick={() => setSelectedResident(r)}>
                        <UserRound size={16} /> Xem hồ sơ chi tiết
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {/* APARTMENTS TAB */}
          {tab === "apartments" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Card className="p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Danh sách căn hộ</h3>
                    <p className="text-sm text-slate-500">Quản lý căn hộ, trạng thái và thông tin liên quan.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm căn hộ..." />
                    <Select value={apartmentStatus} onChange={(e) => setApartmentStatus(e.target.value)}>
                      <option value="Tất cả">Tất cả</option>
                      <option value="Đã thuê">Đã thuê</option>
                      <option value="Trống">Trống</option>
                      <option value="Bảo trì">Bảo trì</option>
                    </Select>
                  </div>
                </div>
              </Card>
              {loadingApartments ? (
                <Card className="p-8 text-center"><p className="font-bold text-slate-900">Đang tải danh sách căn hộ...</p></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredApartments.map((a) => (
                    <Card key={a.id} className="group hover:border-[#1f4f46]/40 transition-all">
                      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h4 className="text-2xl font-black text-slate-900 group-hover:text-[#1f4f46]">{a.code || a.id}</h4>
                        <Badge tone={a.status === "Đã thuê" ? "green" : a.status === "Trống" ? "blue" : "amber"}>{a.status}</Badge>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Block {a.tower} · Tầng {a.floor}</span>
                          <span className="text-[#1f4f46]">{a.area} m²</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-xs font-medium text-slate-400">Chủ sở hữu</p>
                          <p className="text-sm font-bold text-slate-700">{a.owners || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <div className="flex border-t border-slate-100">
                        <button className="flex-1 py-3 text-sm font-medium text-[#1f4f46] hover:bg-[#eef5f2] transition-colors" onClick={() => setSelectedApartment(a)}>
                          <ClipboardList size={16} className="inline mr-1" /> Xem chi tiết
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {/* FEES TAB */}
          {tab === "fees" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard icon={WalletCards} label="Tổng phí tháng" value={money(totalFees).replace("₫", "")} hint="Phí dịch vụ + gửi xe + nước" />
                <StatCard icon={AlertCircle} label="Chưa thu" value={money(unpaidFees).replace("₫", "")} hint="Cần gửi nhắc thanh toán" />
                <StatCard icon={CheckCircle2} label="Đã thanh toán" value={fees.filter((f) => f.status === "Đã thanh toán").length} hint="Số căn đã hoàn tất" />
              </div>

              <Card className="overflow-hidden">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Bảng phí dịch vụ</h3>
                    <p className="text-sm text-slate-500">Cập nhật thanh toán và gửi nhắc phí nhanh.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => {
                      exportSheet("bang-phi-dich-vu.xlsx", "PhiDichVu", fees.map((f) => ({
                        MaPhi: f.id,
                        CanHo: f.apartment,
                        ChuHo: f.owner,
                        Thang: f.month,
                        PhiDichVu: f.service,
                        PhiGuiXe: f.parking,
                        TienNuoc: f.water,
                        TongCong: (f.service || 0) + (f.parking || 0) + (f.water || 0),
                        TrangThai: f.status,
                      })));
                    }}><Download size={16} /> Xuất Excel</Button>
                    <Button variant="secondary"><FileText size={16} /> Xuất hóa đơn</Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Căn hộ</th>
                        <th className="px-5 py-3">Chủ hộ</th>
                        <th className="px-5 py-3">Tháng</th>
                        <th className="px-5 py-3">Dịch vụ</th>
                        <th className="px-5 py-3">Gửi xe</th>
                        <th className="px-5 py-3">Nước</th>
                        <th className="px-5 py-3">Tổng</th>
                        <th className="px-5 py-3">Trạng thái</th>
                        <th className="px-5 py-3">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredFees.map((fee) => {
                        const total = (fee.service || 0) + (fee.parking || 0) + (fee.water || 0);
                        return (
                          <tr key={fee.id} className="hover:bg-slate-50/80">
                            <td className="px-5 py-4 font-bold text-slate-950">{fee.apartment}</td>
                            <td className="px-5 py-4 text-slate-600">{fee.owner}</td>
                            <td className="px-5 py-4 text-slate-600">{fee.month}</td>
                            <td className="px-5 py-4 text-slate-600">{money(fee.service)}</td>
                            <td className="px-5 py-4 text-slate-600">{money(fee.parking)}</td>
                            <td className="px-5 py-4 text-slate-600">{money(fee.water)}</td>
                            <td className="px-5 py-4 font-bold text-slate-950">{money(total)}</td>
                            <td className="px-5 py-4"><Badge tone={fee.status === "Đã thanh toán" ? "green" : fee.status === "Quá hạn" ? "red" : "amber"}>{fee.status}</Badge></td>
                            <td className="px-5 py-4">
                              {fee.status === "Đã thanh toán" ? (
                                <Button variant="secondary" onClick={() => flash("Đã tải hóa đơn mẫu.")}><Download size={15} /> Hóa đơn</Button>
                              ) : (
                                <div className="flex gap-2">
                                  <Button variant="secondary" onClick={() => flash(`Đã gửi nhắc phí đến ${fee.owner}.`)}><Send size={15} /> Nhắc</Button>
                                  <Button onClick={() => markFeePaid(fee.id)}>Đã thu</Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.section>
          )}

          {/* TICKETS TAB */}
          {tab === "tickets" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Card className="p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Danh sách yêu cầu</h3>
                    <p className="text-sm text-slate-500">Tạo mới, phân loại và cập nhật trạng thái xử lý.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => {
                      exportSheet("yeu-cau-cu-dan.xlsx", "YeuCau", tickets.map((t) => ({
                        MaYeuCau: t.id,
                        TieuDe: t.title,
                        CuDan: t.resident,
                        CanHo: t.apartment,
                        PhanLoai: t.category,
                        UuTien: t.priority,
                        TrangThai: t.status,
                        NgayTao: t.createdAt,
                      })));
                    }}><Download size={16} /> Xuất Excel</Button>
                    <Button onClick={() => setTicketOpen(true)}><Plus size={16} /> Tạo yêu cầu</Button>
                  </div>
                </div>
              </Card>
              <div className="grid gap-4 xl:grid-cols-3">
                {filteredTickets.map((ticket) => (
                  <Card key={ticket.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge tone={ticket.priority === "Cao" ? "red" : ticket.priority === "Trung bình" ? "amber" : "slate"}>{ticket.priority}</Badge>
                        <h3 className="mt-3 font-bold text-slate-950">{ticket.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{ticket.resident} · {ticket.apartment}</p>
                      </div>
                      <Badge tone={ticket.status === "Hoàn tất" ? "green" : ticket.status === "Đang xử lý" ? "amber" : "blue"}>{ticket.status}</Badge>
                    </div>
                    <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      <p>Loại: <b>{ticket.category}</b></p>
                      <p className="mt-1">Ngày tạo: {ticket.createdAt}</p>
                    </div>
                    <div className="mt-5 flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => updateTicketStatus(ticket.id, "Đang xử lý")}>Nhận xử lý</Button>
                      <Button className="flex-1" onClick={() => updateTicketStatus(ticket.id, "Hoàn tất")}>Hoàn tất</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.section>
          )}

          {/* VEHICLES TAB */}
          {tab === "vehicles" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Card className="p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Danh sách xe</h3>
                    <p className="text-sm text-slate-500">Quản lý biển số, loại xe, vị trí đỗ và trạng thái thẻ xe.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => {
                      exportSheet("danh-sach-xe.xlsx", "BaiXe", vehicles.map((v) => ({
                        MaXe: v.id,
                        BienSo: v.plate,
                        ChuXe: v.owner,
                        CanHo: v.apartment,
                        LoaiXe: v.type,
                        ViTriDo: v.slot,
                        TrangThai: v.status,
                      })));
                    }}><Download size={16} /> Xuất Excel</Button>
                    <Button onClick={() => setVehicleOpen(true)}><Plus size={16} /> Đăng ký xe</Button>
                  </div>
                </div>
              </Card>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredVehicles.map((vehicle) => (
                  <Card key={vehicle.id} className="overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">Biển số</p>
                          <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{vehicle.plate}</h3>
                        </div>
                        <Badge tone={vehicle.status === "Hoạt động" ? "green" : "red"}>{vehicle.status}</Badge>
                      </div>
                    </div>
                    <div className="space-y-3 p-5 text-sm text-slate-600">
                      <div className="flex items-center justify-between"><span>Chủ xe</span><b className="text-slate-950">{vehicle.owner}</b></div>
                      <div className="flex items-center justify-between"><span>Căn hộ</span><b className="text-slate-950">{vehicle.apartment}</b></div>
                      <div className="flex items-center justify-between"><span>Loại xe</span><b className="text-slate-950">{vehicle.type}</b></div>
                      <div className="flex items-center justify-between"><span>Vị trí</span><b className="text-slate-950">{vehicle.slot}</b></div>
                    </div>
                    <div className="flex border-t border-slate-200">
                      <button className="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => flash("Đã mở lịch sử ra vào mẫu.")}>Lịch sử</button>
                      <button className="flex flex-1 items-center justify-center gap-2 border-l border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => flash("Đã cập nhật trạng thái thẻ xe.")}>Khóa thẻ</button>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.section>
          )}

          {/* EMPLOYEES TAB */}
          {tab === "employees" && (
            <EmployeeManagement flash={flash} />
          )}

          {/* PERMISSIONS TAB */}
          {tab === "permissions" && (
            <PermissionManagement flash={flash} />
          )}

          {/* ROLES TAB */}
          {tab === "roles" && (
            <RoleManagement flash={flash} />
          )}

          {/* SYSTEM LOGS TAB */}
          {tab === "system-logs" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Card className="p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Nhật ký hệ thống</h3>
                    <p className="text-sm text-slate-500">Theo dõi các hoạt động và thay đổi trong hệ thống.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => flash('Đã tải lại nhật ký')}>
                      <RefreshCw size={16} /> Làm mới
                    </Button>
                    <Button variant="secondary">
                      <Download size={16} /> Xuất Excel
                    </Button>
                  </div>
                </div>
              </Card>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Thời gian</th>
                        <th className="px-5 py-3">Người dùng</th>
                        <th className="px-5 py-3">Hành động</th>
                        <th className="px-5 py-3">Bảng</th>
                        <th className="px-5 py-3">ID</th>
                        <th className="px-5 py-3">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-5 py-8 text-center text-slate-500">Chưa có nhật ký hoạt động</td>
                        </tr>
                      ) : (
                        auditLogs.map((log, index) => (
                          <tr key={index} className="hover:bg-slate-50/80">
                            <td className="px-5 py-4 text-slate-600">{new Date(log.Timestamp).toLocaleString('vi-VN')}</td>
                            <td className="px-5 py-4 font-medium text-slate-900">{log.Username || 'System'}</td>
                            <td className="px-5 py-4">
                              <Badge tone={log.Action === 'INSERT' ? 'green' : log.Action === 'UPDATE' ? 'blue' : 'red'}>
                                {log.Action}
                              </Badge>
                            </td>
                            <td className="px-5 py-4 text-slate-600">{log.TableName}</td>
                            <td className="px-5 py-4 text-slate-600">{log.RecordID}</td>
                            <td className="px-5 py-4 text-slate-600">{log.IPAddress || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.section>
          )}

          {/* Placeholder cho các tab khác */}
          {[
            "quick-report", "register-resident", "id-cards", "family-members", "residence-history",
            "buildings", "floors", "apartment-status", "rental-history",
            "contract-list", "create-contract", "contract-renewal", "contract-terminate", "deposits",
            "electricity", "water", "register-service", "gym", "pool", "event-space",
            "payments", "debts", "fee-collection", "revenue",
            "vehicle-cards", "parking-lot", "entry-exit-history",
            "maintenance", "feedbacks", "maintenance-schedule", "equipment",
            "send-notification", "schedule-notification",
            "revenue-report", "debt-report", "apartment-report", "service-report", "export-excel", "export-pdf",
            "ai-chat", "ai-stats", "ai-predict", "ai-search",
            "profile", "change-password", "system-info"
          ].includes(tab) && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-[#eef5f2] p-6">
                    <Building2 size={48} className="text-[#1f4f46]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Tính năng đang được phát triển</h3>
                  <p className="text-sm text-slate-500 max-w-md">Chức năng này đang trong quá trình xây dựng. Vui lòng quay lại sau.</p>
                  <Badge tone="amber">Đang phát triển</Badge>
                </div>
              </Card>
            </motion.section>
          )}
        </main>
      </div>

      {/* MODALS */}
      <Modal open={notifyOpen} title="Tạo lịch gửi thông báo" description="Lưu lịch để scheduler gửi tự động hoặc gửi ngay nếu cần." onClose={() => setNotifyOpen(false)}>
        <div className="space-y-4">
          <Input value={notice.title} onChange={(e) => setNotice({ ...notice, title: e.target.value })} placeholder="Tiêu đề thông báo" />
          <textarea
            className="min-h-28 w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-[#1f4f46]"
            value={notice.body}
            onChange={(e) => setNotice({ ...notice, body: e.target.value })}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Input type="datetime-local" value={notice.start} onChange={(e) => setNotice({ ...notice, start: e.target.value })} />
            <Input type="datetime-local" value={notice.end} onChange={(e) => setNotice({ ...notice, end: e.target.value })} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={notice.target} onChange={(e) => setNotice({ ...notice, target: e.target.value })}>
              <option>Tất cả cư dân</option>
              <option>Block A</option>
              <option>Block B</option>
              <option>Block C</option>
              <option>Cư dân sinh nhật hôm nay</option>
            </Select>
            <Input value={notice.timezone} onChange={(e) => setNotice({ ...notice, timezone: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setNotifyOpen(false)}>Hủy</Button>
            <Button onClick={scheduleNotice}><CheckCircle2 size={16} /> Lưu lịch gửi</Button>
          </div>
        </div>
      </Modal>

      <Modal open={importOpen} title="Nhập dữ liệu cư dân từ Excel" description="Đọc file .xlsx trực tiếp trên trình duyệt, kiểm tra dữ liệu rồi thêm vào danh sách." onClose={() => setImportOpen(false)}>
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="font-bold text-slate-950">Cột cần có trong file</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              MaCuDan, HoTen, Email, SoDienThoai, NgaySinh, CanHo, Block, TrangThai. Ngày sinh dùng định dạng YYYY-MM-DD.
            </p>
          </div>

          <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center hover:bg-slate-50">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef5f2] text-[#1f4f46]">
              <Import size={26} />
            </div>
            <h4 className="mt-4 text-lg font-bold text-slate-950">Chọn file Excel .xlsx</h4>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Hệ thống sẽ báo lỗi nếu thiếu họ tên, căn hộ, số điện thoại, email sai định dạng hoặc trùng mã cư dân.
            </p>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;

              const reader = new FileReader();
              reader.onload = (e) => {
                try {
                  const data = new Uint8Array(e.target.result);
                  const workbook = XLSX.read(data, { type: "array" });
                  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

                  if (!rows.length) {
                    flash("File Excel không có dữ liệu.");
                    return;
                  }

                  const imported = rows.map((row, index) => {
                    const id = String(row.MaCuDan || row.ID || row.id || `R${String(residents.length + index + 1).padStart(3, "0")}`).trim();
                    const name = String(row.HoTen || row.Name || row.name || "").trim();
                    const email = String(row.Email || row.email || "").trim();
                    const phone = String(row.SoDienThoai || row.Phone || row.phone || "").trim();
                    const birthdayRaw = row.NgaySinh || row.Birthday || row.birthday || "";
                    const apartment = String(row.CanHo || row.Apartment || row.apartment || "").trim().toUpperCase();
                    const tower = String(row.Block || row.Tower || row.tower || apartment.split("-")[0] || "").trim().toUpperCase();
                    const status = String(row.TrangThai || row.Status || row.status || "Đang ở").trim();

                    let birthday = String(birthdayRaw).trim();
                    if (typeof birthdayRaw === "number") {
                      const parsed = XLSX.SSF.parse_date_code(birthdayRaw);
                      if (parsed) birthday = `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
                    }

                    return { id, name, email, phone, birthday, apartment, tower, status };
                  });

                  const existingIds = new Set(residents.map((r) => r.id));
                  const errors = [];
                  const validRows = [];

                  imported.forEach((row, index) => {
                    const line = index + 2;
                    if (!row.name) errors.push(`Dòng ${line}: thiếu họ tên`);
                    if (!row.apartment) errors.push(`Dòng ${line}: thiếu căn hộ`);
                    if (!row.phone) errors.push(`Dòng ${line}: thiếu số điện thoại`);
                    if (!row.email.includes("@") || !row.email.includes(".")) errors.push(`Dòng ${line}: email không hợp lệ`);
                    const parts = String(row.birthday).split("-");
                    if (!(parts.length === 3 && parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2)) {
                      errors.push(`Dòng ${line}: ngày sinh phải dạng YYYY-MM-DD`);
                    }
                    if (existingIds.has(row.id)) errors.push(`Dòng ${line}: mã cư dân đã tồn tại`);
                    validRows.push(row);
                  });

                  if (errors.length) {
                    flash(errors.slice(0, 3).join(" • ") + (errors.length > 3 ? "..." : ""));
                    return;
                  }

                  setResidents([...validRows, ...residents]);
                  setImportOpen(false);
                  flash(`Đã nhập ${validRows.length} cư dân từ Excel.`);
                } catch {
                  flash("Không đọc được file Excel. Vui lòng kiểm tra đúng định dạng .xlsx.");
                } finally {
                  event.target.value = "";
                }
              };
              reader.readAsArrayBuffer(file);
            }} />
          </label>

          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={downloadResidentTemplate}><Download size={16} /> Tải file mẫu</Button>
            <Button variant="secondary" onClick={() => {
              exportSheet("danh-sach-cu-dan.xlsx", "CuDan", residents.map((r) => ({
                MaCuDan: r.id,
                HoTen: r.name,
                Email: r.email,
                SoDienThoai: r.phone,
                NgaySinh: r.birthday,
                CanHo: r.apartment,
                Block: r.tower,
                TrangThai: r.status,
              })));
            }}><Download size={16} /> Xuất danh sách hiện tại</Button>
          </div>
        </div>
      </Modal>

      <Modal open={ticketOpen} title="Tạo yêu cầu cư dân" description="Ghi nhận phản ánh hoặc yêu cầu sửa chữa mới." onClose={() => setTicketOpen(false)}>
        <div className="space-y-4">
          <Input value={newTicket.title} onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })} placeholder="Tiêu đề yêu cầu" />
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={newTicket.resident} onChange={(e) => setNewTicket({ ...newTicket, resident: e.target.value })} placeholder="Tên cư dân" />
            <Input value={newTicket.apartment} onChange={(e) => setNewTicket({ ...newTicket, apartment: e.target.value })} placeholder="Mã căn hộ" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={newTicket.category} onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}>
              <option>Bảo trì</option>
              <option>Điện</option>
              <option>Nước</option>
              <option>An ninh</option>
              <option>Vệ sinh</option>
            </Select>
            <Select value={newTicket.priority} onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}>
              <option>Thấp</option>
              <option>Trung bình</option>
              <option>Cao</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setTicketOpen(false)}>Hủy</Button>
            <Button onClick={createTicket}>Tạo yêu cầu</Button>
          </div>
        </div>
      </Modal>

      <Modal open={vehicleOpen} title="Đăng ký xe" description="Thêm xe mới và gán vị trí đỗ trong bãi xe." onClose={() => setVehicleOpen(false)}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={newVehicle.plate} onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })} placeholder="Biển số" />
            <Select value={newVehicle.type} onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value })}>
              <option>Ô tô</option>
              <option>Xe máy</option>
              <option>Xe đạp điện</option>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={newVehicle.owner} onChange={(e) => setNewVehicle({ ...newVehicle, owner: e.target.value })} placeholder="Chủ xe" />
            <Input value={newVehicle.apartment} onChange={(e) => setNewVehicle({ ...newVehicle, apartment: e.target.value })} placeholder="Mã căn hộ" />
          </div>
          <Input value={newVehicle.slot} onChange={(e) => setNewVehicle({ ...newVehicle, slot: e.target.value })} placeholder="Vị trí đỗ, ví dụ B1-022" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setVehicleOpen(false)}>Hủy</Button>
            <Button onClick={createVehicle}>Đăng ký xe</Button>
          </div>
        </div>
      </Modal>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}