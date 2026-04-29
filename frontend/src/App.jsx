import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Building2,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  Home,
  Import,
  KeyRound,
  LockKeyhole,
  Mail,
  Menu,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
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

const residentsSeed = [
  // ... (giữ lại các cư dân cũ nếu muốn)
  {
    id: "R005",
    name: "Lê Văn Tám",
    phone: "0912 888 999",
    email: "vantam@example.com",
    birthday: "1985-05-15",
    apartment: "B-0501",
    tower: "B",
    status: "Đang ở",
    idCard: { number: "042085001234", date: "2022-06-10", place: "Cục CS QLHC về TTXH" },
    household: "32 Hàng Mã, Hoàn Kiếm, Hà Nội",
    address: "Căn B-0501, ChiLo Tower",
    isOwner: true
  },
  {
    id: "R006",
    name: "Hoàng Thị Thanh",
    phone: "0988 777 666",
    email: "thanhhoang@example.com",
    birthday: "1988-12-20",
    apartment: "B-0501",
    tower: "B",
    status: "Đang ở",
    idCard: { number: "042188005678", date: "2023-02-15", place: "CA Hà Nội" },
    household: "32 Hàng Mã, Hoàn Kiếm, Hà Nội",
    address: "Căn B-0501, ChiLo Tower",
    isOwner: true // Đồng sở hữu với Lê Văn Tám
  },
  {
    id: "R007",
    name: "Phan Anh Tuấn",
    phone: "0934 555 444",
    email: "anhtuan@example.com",
    birthday: "1990-01-01",
    apartment: "A-1502",
    tower: "A",
    status: "Đang ở",
    idCard: { number: "079090009999", date: "2021-08-20", place: "Cục CS QLHC về TTXH" },
    household: "15/4 Đoàn Văn Bơ, Quận 4, TP.HCM",
    address: "Căn A-1502, ChiLo Tower",
    isOwner: true
  },
  {
    id: "R008",
    name: "Đặng Thu Thảo",
    phone: "0909 123 456",
    email: "thuthao@example.com",
    birthday: "1992-03-08",
    apartment: "C-1012",
    tower: "C",
    status: "Đang ở",
    idCard: { number: "079092004321", date: "2020-11-12", place: "CA TP.HCM" },
    household: "789 Cách Mạng Tháng 8, Quận 10, TP.HCM",
    address: "Căn C-1012, ChiLo Tower",
    isOwner: true
  },
  {
    id: "R009",
    name: "Trịnh Gia Bảo",
    phone: "0977 444 333",
    email: "giabao@example.com",
    birthday: "1995-07-22",
    apartment: "B-1210",
    tower: "B",
    status: "Tạm vắng",
    idCard: { number: "079095008888", date: "2022-05-30", place: "Cục CS QLHC về TTXH" },
    household: "22 Trần Phú, Quận Ba Đình, Hà Nội",
    address: "Căn B-1210, Đức Vũ Tower",
    isOwner: true
  },
  {
    id: "R010",
    name: "Lý Hải Nam",
    phone: "0903 000 111",
    email: "hainam@example.com",
    birthday: "1980-09-15",
    apartment: "C-1801",
    tower: "C",
    status: "Đang ở",
    idCard: { number: "001080005555", date: "2021-04-10", place: "CA TP. Hà Nội" },
    household: "101 Phố Huế, Hai Bà Trưng, Hà Nội",
    address: "Căn C-1801, Đức Vũ Tower",
    isOwner: true
  },
  {
    id: "R011",
    name: "Vũ Phương Ly",
    phone: "0945 999 000",
    email: "phuongly@example.com",
    birthday: "1998-02-14",
    apartment: "A-2005",
    tower: "A",
    status: "Đang ở",
    idCard: { number: "079098007777", date: "2023-10-05", place: "Cục CS QLHC về TTXH" },
    household: "55 Nam Kỳ Khởi Nghĩa, Quận 1, TP.HCM",
    address: "Căn A-2005, Đức Vũ Tower",
    isOwner: true
  },
  {
    id: "R012",
    name: "Bùi Tiến Dũng",
    phone: "0966 111 222",
    email: "tiendung@example.com",
    birthday: "1987-11-30",
    apartment: "C-0101",
    tower: "C",
    status: "Đang ở",
    idCard: { number: "031087006666", date: "2022-09-12", place: "CA Hải Phòng" },
    household: "88 Lạch Tray, Ngô Quyền, Hải Phòng",
    address: "Căn C-0101, Đức Vũ Tower",
    isOwner: true
  },
  {
    id: "R013",
    name: "Ngô Mỹ Linh",
    phone: "0982 333 555",
    email: "mylinh@example.com",
    birthday: "1993-06-18",
    apartment: "B-0708",
    tower: "B",
    status: "Đang ở",
    idCard: { number: "079093001111", date: "2021-12-25", place: "CA TP.HCM" },
    household: "432 Phan Xích Long, Phú Nhuận, TP.HCM",
    address: "Căn B-0708, Đức Vũ Tower",
    isOwner: true
  },
  {
    id: "R014",
    name: "Phạm Quốc Huy",
    phone: "0901 888 777",
    email: "quochuy@example.com",
    birthday: "1989-10-05",
    apartment: "A-1502",
    tower: "A",
    status: "Đang ở",
    idCard: { number: "079089002222", date: "2022-03-15", place: "Cục CS QLHC về TTXH" },
    household: "12 Nguyễn Trãi, Quận 5, TP.HCM",
    address: "Căn A-1502, Đức Vũ Tower",
    isOwner: true // Đồng sở hữu với Phan Anh Tuấn
  }
];

const apartmentsSeed = [
  // ... (giữ lại các căn hộ cũ)
  { 
    id: "B-0501", tower: "B", floor: 5, area: 75, type: "2PN, 2WC", 
    owners: ["Lê Văn Tám", "Hoàng Thị Thanh"], // Đồng sở hữu
    status: "Đã thuê", view: "Nội khu yên tĩnh", balcony: "Đông Nam", 
    furniture: "Cơ bản", purpose: "Để ở", handoverDate: "10/05/2023" 
  },
  { 
    id: "A-1502", tower: "A", floor: 15, area: 90, type: "2PN, 2WC", 
    owners: ["Phan Anh Tuấn", "Phạm Quốc Huy"], // Đồng sở hữu
    status: "Đã thuê", view: "Landmark 81", balcony: "Chính Nam", 
    furniture: "Full nội thất cao cấp", purpose: "Để ở", handoverDate: "20/05/2023" 
  },
  { 
    id: "C-1012", tower: "C", floor: 10, area: 68, type: "2PN, 1WC", 
    owners: ["Đặng Thu Thảo"], status: "Đã thuê", view: "Thành phố đêm", 
    balcony: "Tây Bắc", furniture: "Hiện đại", purpose: "Để ở", handoverDate: "05/06/2023" 
  },
  { 
    id: "B-1210", tower: "B", floor: 12, area: 55, type: "Studio", 
    owners: ["Trịnh Gia Bảo"], status: "Đã thuê", view: "Công viên", 
    balcony: "Chính Đông", furniture: "Minimalism", purpose: "Studio làm việc", handoverDate: "15/06/2023" 
  },
  { 
    id: "C-1801", tower: "C", floor: 18, area: 120, type: "3PN, 2WC", 
    owners: ["Lý Hải Nam"], status: "Đã thuê", view: "Sông Sài Gòn", 
    balcony: "Đông Bắc", furniture: "Cổ điển", purpose: "Để ở", handoverDate: "01/07/2023" 
  },
  { 
    id: "A-2005", tower: "A", floor: 20, area: 250, type: "Penthouse", 
    owners: ["Vũ Phương Ly"], status: "Đã thuê", view: "Toàn cảnh thành phố", 
    balcony: "Đa hướng", furniture: "Luxury", purpose: "Để ở", handoverDate: "10/08/2023" 
  },
  { 
    id: "C-0101", tower: "C", floor: 1, area: 150, type: "Shophouse", 
    owners: ["Bùi Tiến Dũng"], status: "Đã thuê", view: "Mặt tiền đường lớn", 
    balcony: "Không có", furniture: "Thô (Tự decor)", purpose: "Kinh doanh cafe", handoverDate: "15/08/2023" 
  },
  { 
    id: "B-0708", tower: "B", floor: 7, area: 85, type: "2PN, 2WC", 
    owners: ["Ngô Mỹ Linh"], status: "Đã thuê", view: "Hồ bơi", 
    balcony: "Tây Nam", furniture: "Full nội thất", purpose: "Để ở", handoverDate: "20/08/2023" 
  },
  { 
    id: "A-0505", tower: "A", floor: 5, area: 64, type: "2PN, 1WC", 
    owners: [], status: "Trống", view: "Nội khu", 
    balcony: "Đông Bắc", furniture: "Trống", purpose: "Để ở", handoverDate: "Chưa bàn giao" 
  },
  { 
    id: "C-1205", tower: "C", floor: 12, area: 76, type: "2PN, 2WC", 
    owners: [], status: "Bảo trì", view: "Thành phố", 
    balcony: "Chính Tây", furniture: "Cơ bản", purpose: "Để ở", handoverDate: "Đang sửa chữa" 
  }
];

const historySeed = [
  {
    id: "H001",
    title: "Thông báo phí dịch vụ tháng 04",
    type: "Tự động",
    target: "Tất cả cư dân",
    sentAt: "25/04/2026 08:30",
    state: "Đã gửi",
    count: 4,
  },
  {
    id: "H002",
    title: "Bảo trì thang máy Block B",
    type: "Lịch hẹn",
    target: "Block B",
    sentAt: "26/04/2026 18:00",
    state: "Đã gửi",
    count: 1,
  },
  {
    id: "H003",
    title: "Chúc mừng sinh nhật cư dân hôm nay",
    type: "Sinh nhật",
    target: "Sinh nhật 04-27",
    sentAt: "27/04/2026 09:00",
    state: "Đã gửi",
    count: 1,
  },
];

const queueSeed = [
  {
    id: "Q001",
    title: "Nhắc lịch vệ sinh hành lang",
    start: "2026-04-27T19:00",
    end: "2026-04-27T19:15",
    timezone: "Asia/Ho_Chi_Minh",
    target: "Tất cả cư dân",
    status: "Sẵn sàng",
  },
  {
    id: "Q002",
    title: "Bảo trì nước Block C",
    start: "2026-04-28T08:00",
    end: "2026-04-28T12:00",
    timezone: "Asia/Ho_Chi_Minh",
    target: "Block C",
    status: "Chờ gửi",
  },
];

const feesSeed = [
  { id: "F001", apartment: "A-1201", owner: "Nguyễn Minh Anh", month: "04/2026", service: 580000, parking: 250000, water: 180000, status: "Đã thanh toán" },
  { id: "F002", apartment: "B-0805", owner: "Trần Quốc Bảo", month: "04/2026", service: 760000, parking: 500000, water: 220000, status: "Chưa thanh toán" },
  { id: "F003", apartment: "A-0903", owner: "Lê Hoàng Yến", month: "04/2026", service: 510000, parking: 250000, water: 165000, status: "Quá hạn" },
  { id: "F004", apartment: "C-0301", owner: "Phạm Gia Huy", month: "04/2026", service: 640000, parking: 0, water: 190000, status: "Đã thanh toán" },
];

const ticketsSeed = [
  { id: "T001", title: "Đèn hành lang tầng 12 bị hỏng", resident: "Nguyễn Minh Anh", apartment: "A-1201", category: "Điện", priority: "Cao", status: "Đang xử lý", createdAt: "27/04/2026 09:15" },
  { id: "T002", title: "Rò nước khu vực để xe B2", resident: "Trần Quốc Bảo", apartment: "B-0805", category: "Nước", priority: "Trung bình", status: "Mới", createdAt: "27/04/2026 11:20" },
  { id: "T003", title: "Đăng ký sửa khóa cửa chính", resident: "Lê Hoàng Yến", apartment: "A-0903", category: "Bảo trì", priority: "Thấp", status: "Hoàn tất", createdAt: "26/04/2026 16:40" },
];

const vehiclesSeed = [
  { id: "V001", plate: "30H-123.45", owner: "Nguyễn Minh Anh", apartment: "A-1201", type: "Ô tô", slot: "B1-021", status: "Hoạt động" },
  { id: "V002", plate: "29X1-456.78", owner: "Lê Hoàng Yến", apartment: "A-0903", type: "Xe máy", slot: "M-118", status: "Hoạt động" },
  { id: "V003", plate: "30K-888.99", owner: "Trần Quốc Bảo", apartment: "B-0805", type: "Ô tô", slot: "B2-015", status: "Tạm khóa" },
];

const revenueData = [
  { month: "T1", amount: 56 },
  { month: "T2", amount: 68 },
  { month: "T3", amount: 61 },
  { month: "T4", amount: 83 },
  { month: "T5", amount: 79 },
  { month: "T6", amount: 92 },
];

function cls(...items) {
  return items.filter(Boolean).join(" ");
}

function formatBirthday(date) {
  const d = new Date(date);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function money(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Card({ children, className = "" }) {
  return <div className={cls("rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]", className)}>{children}</div>;
}

function Button({ children, variant = "primary", className = "", ...props }) {
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
      className={cls(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Input({ icon: Icon, right, className = "", ...props }) {
  return (
    <div className={cls("flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-[#1f4f46]", className)}>
      {Icon && <Icon size={16} className="text-slate-400" />}
      <input className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" {...props} />
      {right}
    </div>
  );
}

function Select({ className = "", ...props }) {
  return (
    <select
      className={cls("rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#1f4f46]", className)}
      {...props}
    />
  );
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-rose-200 bg-rose-50 text-rose-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    purple: "border-violet-200 bg-violet-50 text-violet-700",
  };

  return <span className={cls("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}

function PageTitle({ eyebrow, title, description, actions }) {
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
}

function StatCard({ icon: Icon, label, value, hint, trend }) {
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
}

function Modal({ open, title, description, children, onClose }) {
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
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("admin@anbinh.vn");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin({
        name: email === "user@anbinh.vn" ? "Nguyễn Minh Anh" : "Ban quản lý",
        email,
        role: email === "user@anbinh.vn" ? "Cư dân" : "Quản trị viên",
        remember,
      });
    }, 550);
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

export default function ApartmentManagementWeb() {
  const [selectedResident, setSelectedResident] = useState(null);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [residents, setResidents] = useState(residentsSeed);
  const [apartments] = useState(apartmentsSeed);
  const [history, setHistory] = useState(historySeed);
  const [queue, setQueue] = useState(queueSeed);
  const [fees, setFees] = useState(feesSeed);
  const [tickets, setTickets] = useState(ticketsSeed);
  const [vehicles, setVehicles] = useState(vehiclesSeed);
  const [search, setSearch] = useState("");
  const [apartmentStatus, setApartmentStatus] = useState("Tất cả");
  const [toast, setToast] = useState("");
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [birthdayMonthDay, setBirthdayMonthDay] = useState("04-27");
  const [notice, setNotice] = useState({
    title: "Bảo trì thang máy Block A",
    body: "Ban quản lý thông báo thang máy Block A bảo trì từ 09:00 đến 11:00. Mong cư dân thông cảm.",
    target: "Tất cả cư dân",
    start: "2026-04-27T09:00",
    end: "2026-04-27T11:00",
    timezone: "Asia/Ho_Chi_Minh",
  });
  const [newTicket, setNewTicket] = useState({ title: "", resident: "", apartment: "", category: "Bảo trì", priority: "Trung bình" });
  const [newVehicle, setNewVehicle] = useState({ plate: "", owner: "", apartment: "", type: "Ô tô", slot: "" });

  const filteredResidents = useMemo(() => {
    return residents.filter((r) => {
      const q = search.toLowerCase();
      return [r.name, r.phone, r.email, r.apartment, r.tower].some((field) => String(field).toLowerCase().includes(q));
    });
  }, [residents, search]);

  const filteredApartments = useMemo(() => {
    return apartments.filter((a) => {
      const matchStatus = apartmentStatus === "Tất cả" || a.status === apartmentStatus;
      const q = search.toLowerCase();
      const matchSearch = [a.id, a.tower, a.type, a.owner, a.status].some((field) => String(field).toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [apartments, apartmentStatus, search]);

  const filteredFees = useMemo(() => {
    const q = search.toLowerCase();
    return fees.filter((f) => [f.apartment, f.owner, f.month, f.status].some((field) => String(field).toLowerCase().includes(q)));
  }, [fees, search]);

  const filteredTickets = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter((t) => [t.title, t.resident, t.apartment, t.category, t.status].some((field) => String(field).toLowerCase().includes(q)));
  }, [tickets, search]);

  const filteredVehicles = useMemo(() => {
    const q = search.toLowerCase();
    return vehicles.filter((v) => [v.plate, v.owner, v.apartment, v.type, v.slot, v.status].some((field) => String(field).toLowerCase().includes(q)));
  }, [vehicles, search]);

  const birthdayResidents = useMemo(() => residents.filter((r) => formatBirthday(r.birthday) === birthdayMonthDay), [residents, birthdayMonthDay]);

  const occupancyData = useMemo(() => {
    const groups = apartments.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [apartments]);

  const towerData = useMemo(() => {
    return ["A", "B", "C"].map((tower) => ({
      tower: `Block ${tower}`,
      residents: residents.filter((item) => item.tower === tower).length,
      apartments: apartments.filter((item) => item.tower === tower).length,
    }));
  }, [apartments, residents]);

  const historyChart = useMemo(() => {
    const groups = history.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + item.count;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, count]) => ({ name, count }));
  }, [history]);

  const totalFees = fees.reduce((sum, item) => sum + item.service + item.parking + item.water, 0);
  const unpaidFees = fees.filter((item) => item.status !== "Đã thanh toán").reduce((sum, item) => sum + item.service + item.parking + item.water, 0);

  const nav = [
  ...(user?.role === "Quản trị viên" ? [
    { id: "dashboard", label: "Tổng quan", icon: Home },
  ] : []),
  { id: "notifications", label: "Thông báo", icon: Bell },
  // Chỉ hiện Cư dân & Căn hộ cho Quản trị viên
  ...(user?.role === "Quản trị viên" ? [
    { id: "residents", label: "Cư dân", icon: Users },
    { id: "apartments", label: "Căn hộ", icon: Building2 },
  ] : []),
  { id: "fees", label: "Tiền phí", icon: CreditCard },
  { id: "tickets", label: "Hỗ trợ", icon: Wrench },
  { id: "vehicles", label: "Gửi xe", icon: Car },
];

  function flash(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2800);
  }

  function validateNotice() {
    if (!notice.title.trim()) return "Vui lòng nhập tiêu đề thông báo.";
    if (!notice.body.trim()) return "Vui lòng nhập nội dung thông báo.";
    if (!notice.start || !notice.end) return "Vui lòng chọn thời gian bắt đầu và kết thúc.";
    if (new Date(notice.start) >= new Date(notice.end)) return "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc.";
    if (!notice.timezone.includes("/")) return "Timezone chưa hợp lệ, ví dụ: Asia/Ho_Chi_Minh.";
    return "";
  }

  function scheduleNotice() {
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
  }

  function sendNow(item) {
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
  }

  function exportSheet(fileName, sheetName, rows) {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  }

  function downloadResidentTemplate() {
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
  }

  function normalizeResidentRow(row, index) {
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
  }

  function isValidEmail(value) {
    return value.includes("@") && value.includes(".");
  }

  function isValidDateText(value) {
    const parts = String(value).split("-");
    return parts.length === 3 && parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2;
  }

  function handleResidentExcelUpload(event) {
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

        const imported = rows.map(normalizeResidentRow);
        const existingIds = new Set(residents.map((r) => r.id));
        const errors = [];
        const validRows = [];

        imported.forEach((row, index) => {
          const line = index + 2;
          if (!row.name) errors.push(`Dòng ${line}: thiếu họ tên`);
          if (!row.apartment) errors.push(`Dòng ${line}: thiếu căn hộ`);
          if (!row.phone) errors.push(`Dòng ${line}: thiếu số điện thoại`);
          if (!isValidEmail(row.email)) errors.push(`Dòng ${line}: email không hợp lệ`);
          if (!isValidDateText(row.birthday)) errors.push(`Dòng ${line}: ngày sinh phải dạng YYYY-MM-DD`);
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
  }

  function exportResidents() {
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
  }

  function exportFees() {
    exportSheet("bang-phi-dich-vu.xlsx", "PhiDichVu", fees.map((f) => ({
      MaPhi: f.id,
      CanHo: f.apartment,
      ChuHo: f.owner,
      Thang: f.month,
      PhiDichVu: f.service,
      PhiGuiXe: f.parking,
      TienNuoc: f.water,
      TongCong: f.service + f.parking + f.water,
      TrangThai: f.status,
    })));
  }

  function exportTickets() {
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
  }

  function exportVehicles() {
    exportSheet("danh-sach-xe.xlsx", "BaiXe", vehicles.map((v) => ({
      MaXe: v.id,
      BienSo: v.plate,
      ChuXe: v.owner,
      CanHo: v.apartment,
      LoaiXe: v.type,
      ViTriDo: v.slot,
      TrangThai: v.status,
    })));
  }

  function exportNotificationHistory() {
    exportSheet("lich-su-thong-bao.xlsx", "ThongBao", history.map((h) => ({
      MaLog: h.id,
      TieuDe: h.title,
      Loai: h.type,
      DoiTuongNhan: h.target,
      ThoiGianGui: h.sentAt,
      TrangThai: h.state,
      SoNguoiNhan: h.count,
    })));
  }

  function markFeePaid(id) {
    setFees(fees.map((fee) => (fee.id === id ? { ...fee, status: "Đã thanh toán" } : fee)));
    flash("Đã cập nhật trạng thái thanh toán.");
  }

  function createTicket() {
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
  }

  function updateTicketStatus(id, status) {
    setTickets(tickets.map((ticket) => (ticket.id === id ? { ...ticket, status } : ticket)));
    flash("Đã cập nhật trạng thái yêu cầu.");
  }

  function createVehicle() {
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
  }

  const contentTitle = {
    dashboard: ["Bảng điều khiển", "Theo dõi vận hành chung cư, thông báo và tình trạng căn hộ trong ngày."],
    notifications: ["Trung tâm thông báo", "Tạo lịch gửi, gửi hàng loạt và lọc cư dân sinh nhật theo MM-DD."],
    residents: ["Danh sách cư dân", "Quản lý hồ sơ cư dân, liên hệ, ngày sinh và căn hộ đang ở."],
    apartments: ["Danh mục căn hộ", "Theo dõi diện tích, loại căn, chủ hộ và trạng thái sử dụng."],
    fees: ["Thu phí dịch vụ", "Theo dõi phí quản lý, gửi nhắc nợ và cập nhật trạng thái thanh toán."],
    tickets: ["Yêu cầu cư dân", "Tiếp nhận và xử lý phản ánh, sửa chữa, bảo trì từ cư dân."],
    vehicles: ["Quản lý bãi xe", "Quản lý xe ra vào, vị trí đỗ và trạng thái thẻ xe."],
  };

  const Sidebar = () => (
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

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setSidebarOpen(false);
                setSelectedResident(null);
                setSelectedApartment(null);
              }}
              className={cls(
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                active ? "bg-[#eef5f2] text-[#1f4f46]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon size={18} />
                {item.label}
              </span>
              {active && <ChevronRight size={16} />}
            </button>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck size={16} className="text-[#1f4f46]" />
          Đã đăng nhập
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">{user?.email}</p>
        <Button variant="secondary" className="mt-3 w-full" onClick={() => setUser(null)}>Đăng xuất</Button>
      </div>
    </aside>
  );

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-slate-900">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-72">
        <Sidebar />
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-slate-950/40" onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="relative h-full w-72">
              <Sidebar />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <Input icon={Search} placeholder="Tìm cư dân, căn hộ, thông báo..." className="hidden w-[360px] md:flex" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
              <Bell size={18} />
            </button>
            <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
              <Settings size={18} />
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

        <PageTitle
          eyebrow="Chung cư ChiLo"
          title={contentTitle[tab][0]}
          description={contentTitle[tab][1]}
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

        <main className="p-4 lg:p-8">
          {tab === "dashboard" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Users} label="Cư dân" value={residents.length} trend="+12%" hint="Hồ sơ đang quản lý trong hệ thống" />
                <StatCard icon={Building2} label="Căn hộ" value={apartments.length} hint="Bao gồm đang thuê, trống và bảo trì" />
                <StatCard icon={CreditCard} label="Công nợ" value={money(unpaidFees).replace("₫", "")} hint="Tổng phí chưa thanh toán" />
                <StatCard icon={Wrench} label="Yêu cầu mở" value={tickets.filter((t) => t.status !== "Hoàn tất").length} hint="Việc cần xử lý hôm nay" />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 p-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">Doanh thu phí dịch vụ</h3>
                      <p className="text-sm text-slate-500">Biểu đồ theo tháng, đơn vị: triệu VNĐ.</p>
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
                        <Pie data={occupancyData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={4}>
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
                  <div className="flex items-center justify-between border-b border-slate-200 p-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">Việc cần xử lý</h3>
                      <p className="text-sm text-slate-500">Yêu cầu mới nhất từ cư dân.</p>
                    </div>
                    <Button variant="secondary" onClick={() => setTab("tickets")}>Xem tất cả</Button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {tickets.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                        <div className="flex gap-3">
                          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef5f2] text-[#1f4f46]">
                            <Wrench size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-950">{item.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.apartment} · {item.category} · {item.createdAt}</p>
                          </div>
                        </div>
                        <Badge tone={item.status === "Hoàn tất" ? "green" : item.status === "Đang xử lý" ? "amber" : "blue"}>{item.status}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 p-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">Cư dân theo block</h3>
                      <p className="text-sm text-slate-500">So sánh số căn hộ và cư dân đang quản lý.</p>
                    </div>
                    <Button variant="ghost" className="px-2">
                      <MoreHorizontal size={18} />
                    </Button>
                  </div>
                  <div className="h-72 p-5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={towerData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="tower" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="apartments" name="Căn hộ" fill="#94a3b8" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="residents" name="Cư dân" fill="#1f4f46" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </motion.section>
          )}

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
                    <Button onClick={scheduleNotice}>
                      <CalendarClock size={16} /> Thêm vào lịch gửi
                    </Button>
                    <Button variant="secondary" onClick={() => sendNow({ ...notice, id: "manual" })}>
                      <Send size={16} /> Gửi ngay
                    </Button>
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



         {tab === "residents" && (
          <>
            {!selectedResident ? (
              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <Card className="p-5">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">Hồ sơ cư dân chuyên sâu</h3>
                      <p className="text-sm text-slate-500">Quản lý định danh, hộ khẩu và trạng thái cư trú.</p>
                    </div>
                    <div className="flex gap-2">
                      <Input icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, CMND..." />
                      <Button onClick={() => setImportOpen(true)}><Import size={16} /> Nhập liệu</Button>
                    </div>
                  </div>
                </Card>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredResidents.map((r) => (
                    <Card key={r.id} className="group p-5 hover:border-[#1f4f46]/30 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef5f2] text-[#1f4f46] font-bold">
                            {getInitials(r.name)}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">{r.name}</h3>
                            <p className="text-xs text-slate-500">CCCD: {r.idCard?.number}</p>
                          </div>
                        </div>
                        <Badge tone={r.isOwner ? "green" : "blue"}>{r.isOwner ? "Chủ hộ" : "Cư dân"}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1"><Building2 size={14}/> Căn {r.apartment}</div>
                        <div className="flex items-center gap-1"><Phone size={14}/> {r.phone}</div>
                      </div>
                      <Button variant="secondary" className="mt-4 w-full" onClick={() => setSelectedResident(r)}>
                        <UserRound size={16} /> Xem hồ sơ chi tiết
                      </Button>
                    </Card>
                  ))}
                </div>
              </motion.section>
            ) : (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <button onClick={() => setSelectedResident(null)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#1f4f46]">
                  <ArrowLeft size={16} /> Danh sách hồ sơ
                </button>

                <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
                  <div className="space-y-6">
                    <Card className="p-6 text-center bg-gradient-to-b from-[#eef5f2]/50 to-white">
                      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm text-3xl font-bold text-[#1f4f46] border-2 border-[#eef5f2]">
                        {getInitials(selectedResident.name)}
                      </div>
                      <h2 className="mt-4 text-2xl font-bold text-slate-950">{selectedResident.name}</h2>
                      <p className="text-sm text-[#1f4f46] font-medium">Mã hồ sơ: {selectedResident.id}</p>
                    </Card>

                    <Card className="p-5">
                      <h3 className="mb-4 text-sm font-bold text-slate-400 uppercase tracking-widest">Định danh pháp lý</h3>
                      <div className="space-y-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-slate-500">Số CMND / CCCD</p>
                          <p className="font-bold text-slate-900">{selectedResident.idCard?.number || "Chưa cập nhật"}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-slate-500">Ngày cấp</p>
                            <p className="font-bold text-slate-900">{selectedResident.idCard?.date}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-slate-500">Nơi cấp</p>
                            <p className="font-bold text-slate-900">{selectedResident.idCard?.place}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card className="p-6">
                      <h3 className="mb-5 text-base font-bold text-slate-950 flex items-center gap-2">
                        <AlertCircle size={18} className="text-[#1f4f46]" /> Thông tin cư trú & Liên hệ
                      </h3>
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 text-slate-400"><Phone size={18}/></div>
                            <div><p className="text-xs text-slate-500">Điện thoại</p><p className="font-bold">{selectedResident.phone}</p></div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="mt-1 text-slate-400"><Mail size={18}/></div>
                            <div><p className="text-xs text-slate-500">Email</p><p className="font-bold">{selectedResident.email}</p></div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 text-slate-400"><CalendarClock size={18}/></div>
                            <div><p className="text-xs text-slate-500">Ngày sinh</p><p className="font-bold">{formatBirthday(selectedResident.birthday)}</p></div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="mt-1 text-slate-400"><Building2 size={18}/></div>
                            <div><p className="text-xs text-slate-500">Căn hộ</p><p className="font-bold">{selectedResident.apartment}</p></div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                        <div><p className="text-xs text-slate-500 mb-1">Hộ khẩu thường trú</p><p className="text-sm font-medium">{selectedResident.household}</p></div>
                        <div><p className="text-xs text-slate-500 mb-1">Địa chỉ hiện tại</p><p className="text-sm font-medium">{selectedResident.address}</p></div>
                      </div>
                    </Card>
                    
                    {/* Giữ lại phần Phương tiện & Yêu cầu như cũ bên dưới */}
                  </div>
                </div>
              </motion.section>
            )}
          </>
        )}

        


      
      {tab === "apartments" && (
        <motion.div key="apt-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          
          {!selectedApartment ? (
            /* --- GIAO DIỆN DANH SÁCH --- */
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Quản lý Căn hộ</h1>
                  <p className="text-sm text-slate-500 font-medium italic">Hệ thống ghi nhận {apartments.length} căn hộ</p>
                </div>
                <div className="flex gap-3">
                  <Input icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã căn, chủ hộ..." className="w-64" />
                  <Select value={apartmentStatus} onChange={(e) => setApartmentStatus(e.target.value)}>
                    <option value="Tất cả">Tất cả trạng thái</option>
                    <option value="Đã thuê">Đã thuê</option>
                    <option value="Trống">Còn trống</option>
                    <option value="Bảo trì">Bảo trì</option>
                  </Select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredApartments.map((a) => (
                  <Card key={a.id} className="group hover:border-[#1f4f46]/40 transition-all shadow-sm">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h4 className="text-2xl font-black text-slate-900 group-hover:text-[#1f4f46]">{a.id}</h4>
                      <Badge tone={a.status === "Đã thuê" ? "green" : a.status === "Trống" ? "blue" : "amber"}>{a.status}</Badge>
                    </div>
                    <div className="p-6 space-y-4" onClick={() => setSelectedApartment(a)}>
                      <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Block {a.tower} · Tầng {a.floor}</span>
                        <span className="text-[#1f4f46]">{a.area} m²</span>
                      </div>
                      <div className="pt-2 border-t border-slate-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1 italic">Chủ sở hữu</p>
                        <p className="text-sm font-bold text-slate-700 truncate">
                          {/* Sửa Lỗi 2: Kiểm tra mảng an toàn */}
                          {Array.isArray(a.owners) ? a.owners.join(" & ") : (a.owner || "Chưa cập nhật")}
                        </p>
                      </div>
                    </div>
                    <div className="flex border-t border-slate-100">
                      <button onClick={() => setSelectedApartment(a)} className="flex-1 py-3 text-[10px] font-black uppercase text-[#1f4f46] hover:bg-[#eef5f2] transition-colors flex items-center justify-center gap-2">
                        <ClipboardList size={14}/> Xem hồ sơ chi tiết
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : (
            /* --- GIAO DIỆN CHI TIẾT CĂN HỘ --- */
            <section className="space-y-6">
              <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <button onClick={() => setSelectedApartment(null)} className="flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-500 hover:text-[#1f4f46]">
                  <ArrowLeft size={16}/> QUAY LẠI
                </button>
                <div className="flex items-center gap-3 pr-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Chuyển nhanh:</span>
                  <Select className="!py-1 !text-xs" value={selectedApartment.id} onChange={(e) => setSelectedApartment(apartments.find(ap => ap.id === e.target.value))}>
                    {apartments.map(ap => <option key={ap.id} value={ap.id}>{ap.id}</option>)}
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                {/* Cột trái: Thông số tài sản */}
                <div className="space-y-6">
                  <Card className="p-8 bg-gradient-to-br from-white to-slate-50 relative overflow-hidden shadow-md">
                    <div className="absolute -right-6 -top-6 opacity-5 pointer-events-none"><Home size={150}/></div>
                    <div className="relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge tone={selectedApartment.status === "Đã thuê" ? "green" : "blue"} className="mb-3">{selectedApartment.status}</Badge>
                          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Căn {selectedApartment.id}</h2>
                          <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Khối {selectedApartment.tower} · Tầng {selectedApartment.floor}</p>
                        </div>
                        <div className="h-14 w-14 bg-[#1f4f46] text-white flex items-center justify-center rounded-2xl shadow-xl shadow-[#1f4f46]/20"><Home size={28}/></div>
                      </div>
                      
                      <div className="mt-10 grid grid-cols-2 gap-3">
                        {[
                          { label: "Diện tích sử dụng", value: `${selectedApartment.area} m²` },
                          { label: "Loại căn hộ", value: selectedApartment.type },
                          { label: "Hướng Ban công", value: selectedApartment.balcony || "Đông Nam" },
                          { label: "Tầm nhìn (View)", value: selectedApartment.view || "Nội khu" },
                          { label: "Nội thất", value: selectedApartment.furniture || "Cơ bản" },
                          { label: "Mục đích", value: selectedApartment.purpose || "Để ở" },
                          { label: "Bàn giao", value: selectedApartment.handoverDate, full: true },
                        ].map((item, i) => (
                          <div key={i} className={`p-4 rounded-2xl bg-white border border-slate-100 shadow-sm ${item.full ? "col-span-2" : ""}`}>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-tighter">{item.label}</p>
                            <p className="text-base font-bold text-slate-800">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* CHỦ SỞ HỮU (Dùng ChevronRight thay cho ArrowRight) */}
                  <Card className="p-6 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                      <AlertCircle size={14} className="text-[#1f4f46]" /> Pháp lý sở hữu
                    </h3>
                    <div className="space-y-3">
                      {Array.isArray(selectedApartment.owners) && selectedApartment.owners.map((name, idx) => (
                        <button key={idx} onClick={() => { const res = residents.find(r => r.name === name); if(res){ setTab("residents"); setSelectedResident(res); }}} className="flex w-full items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:border-[#1f4f46] hover:bg-white transition-all group shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white font-black text-[#1f4f46] text-xs border border-slate-100 shadow-inner">{getInitials(name)}</div>
                            <div className="text-left">
                              <p className="font-bold text-slate-900 text-sm group-hover:text-[#1f4f46] transition-colors">{name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Xem hồ sơ CCCD</p>
                            </div>
                          </div>
                          {/* Dùng ChevronRight - Đã có trong import */}
                          <ChevronRight size={18} className="text-slate-300 group-hover:text-[#1f4f46] transition-transform group-hover:translate-x-1" />
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Cột phải: Cư dân & Vận hành */}
                <div className="space-y-6">
                  <Card className="shadow-md">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                      <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                        <Users size={22} className="text-[#1f4f46]"/> Thành viên lưu trú
                      </h3>
                      <span className="bg-[#1f4f46] text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-[#1f4f46]/20">
                        {residents.filter(r => r.apartment === selectedApartment.id).length} NGƯỜI
                      </span>
                    </div>
                    <div className="divide-y divide-slate-50 bg-white">
                      {residents.filter(r => r.apartment === selectedApartment.id).map(r => (
                        <div key={r.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-[#eef5f2] font-black text-[#1f4f46] text-sm border-2 border-white shadow-sm">{getInitials(r.name)}</div>
                            <div>
                              <p className="font-black text-slate-900 text-lg leading-none mb-2">{r.name}</p>
                              <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                                <span className="flex items-center gap-1.5"><Phone size={14} className="text-slate-300"/> {r.phone}</span>
                                <span className="flex items-center gap-1.5"><CalendarClock size={14} className="text-slate-300"/> {formatBirthday(r.birthday)}</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => {setTab("residents"); setSelectedResident(r);}} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-[#1f4f46] hover:bg-white hover:shadow-lg transition-all">
                            <ChevronRight size={20}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Tài chính & Yêu cầu */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Thêm dấu ! trước bg-[#1f4f46] để ghi đè cái bg-white mặc định */}
                    <Card className="p-6 !bg-[#1f4f46] text-white shadow-xl shadow-[#1f4f46]/20">
                      <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em]">Phí tháng hiện tại</p>
                      <h4 className="text-3xl font-black tracking-tighter">{money(1250000)}</h4>
                      <div className="mt-6 flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase">Tháng 04/2026</span>
                        <span className="bg-white/20 text-[10px] font-black px-2 py-1 rounded-lg backdrop-blur-md">ĐÃ THANH TOÁN</span>
                      </div>
                    </Card>
                    <Card className="p-6 flex flex-col justify-between bg-white border border-slate-100">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yêu cầu hỗ trợ</p>
                        {tickets.filter(t => t.apartment === selectedApartment.id).slice(0, 2).map(t => (
                          <div key={t.id} className="flex justify-between items-center border-b border-slate-50 pb-2">
                            <span className="text-xs font-bold truncate pr-2 text-slate-700">{t.title}</span>
                            <Badge tone={t.status === "Hoàn tất" ? "green" : "amber"}>{t.status}</Badge>
                          </div>
                        ))}
                        {tickets.filter(t => t.apartment === selectedApartment.id).length === 0 && (
                          <p className="text-xs text-slate-400 italic">Không có yêu cầu</p>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </section>
          )}
        </motion.div>
      )}

          

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
                    <Button variant="secondary" onClick={exportFees}><Download size={16} /> Xuất Excel</Button>
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
                        const total = fee.service + fee.parking + fee.water;
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

          {tab === "tickets" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Card className="p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Danh sách yêu cầu</h3>
                    <p className="text-sm text-slate-500">Tạo mới, phân loại mức độ ưu tiên và cập nhật trạng thái xử lý.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={exportTickets}><Download size={16} /> Xuất Excel</Button>
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

          {tab === "vehicles" && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Card className="p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Danh sách xe</h3>
                    <p className="text-sm text-slate-500">Quản lý biển số, loại xe, vị trí đỗ và trạng thái thẻ xe.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={exportVehicles}><Download size={16} /> Xuất Excel</Button>
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
        </main>
      </div>

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
            <Button onClick={scheduleNotice}>
              <CheckCircle2 size={16} /> Lưu lịch gửi
            </Button>
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
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleResidentExcelUpload} />
          </label>

          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={downloadResidentTemplate}>
              <Download size={16} /> Tải file mẫu
            </Button>
            <Button variant="secondary" onClick={exportResidents}>
              <Download size={16} /> Xuất danh sách hiện tại
            </Button>
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
