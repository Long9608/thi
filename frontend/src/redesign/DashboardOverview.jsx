import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  House,
  ReceiptText,
  RefreshCw,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardAPI } from '../api';

const EMPTY_STATS = {
  apartments: { Total: 0, Available: 0, Occupied: 0, Rented: 0, UnderMaintenance: 0 },
  contracts: { Total: 0, New: 0, Active: 0, Expired: 0, Terminated: 0 },
  invoices: { Total: 0, Paid: 0, Unpaid: 0, Overdue: 0, TotalRevenue: 0 },
  residents: { Total: 0, Active: 0 },
  tickets: { Total: 0, New: 0, Processing: 0, Completed: 0 },
  revenueByMonth: [],
};

const EMPTY_FINANCIAL = {
  currentMonth: { Paid: 0, Unpaid: 0, Overdue: 0, TotalInvoices: 0 },
  yearToDate: { Revenue: 0 },
  outstanding: { Outstanding: 0 },
  monthlyTrend: [],
};

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
const formatMoney = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

function formatCompactMoney(value) {
  const amount = Number(value) || 0;
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} tr`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} nghìn`;
  return formatNumber(amount);
}

function formatActivityTime(value) {
  if (!value) return 'Chưa có thời gian';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có thời gian';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

function StatCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
  const tones = {
    blue: ['bg-blue-50 text-blue-600', 'from-blue-500 to-blue-600'],
    emerald: ['bg-emerald-50 text-emerald-600', 'from-emerald-500 to-emerald-600'],
    amber: ['bg-amber-50 text-amber-600', 'from-amber-500 to-amber-600'],
    rose: ['bg-rose-50 text-rose-600', 'from-rose-500 to-rose-600'],
    violet: ['bg-violet-50 text-violet-600', 'from-violet-500 to-violet-600'],
    cyan: ['bg-cyan-50 text-cyan-600', 'from-cyan-500 to-cyan-600'],
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70"
    >
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${tones[tone][1]}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone][0]}`}>
          <Icon size={21} />
        </div>
      </div>
    </motion.article>
  );
}

function Panel({ title, description, action, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-extrabold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 truncate text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function QuickAction({ icon: Icon, label, description, onClick, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-left text-white backdrop-blur transition hover:border-white/35 hover:bg-white/20"
    >
      <span className={`rounded-lg p-2 ${tone}`}><Icon size={17} /></span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold">{label}</span>
        <span className="block truncate text-[10px] text-white/65">{description}</span>
      </span>
      <ArrowRight size={14} className="ml-auto shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </button>
  );
}

function flattenActivities(data = {}) {
  const rows = [];

  (data.recentContracts || []).forEach((item, index) => rows.push({
    id: `contract-${item.ContractNumber || index}`,
    type: 'contract',
    title: `Hợp đồng ${item.ContractNumber || 'mới'}`,
    detail: `${item.ApartmentCode || 'Chưa rõ căn'}${item.OwnerName ? ` • ${item.OwnerName}` : ''}`,
    date: item.StartDate,
    icon: FileText,
    tone: 'bg-blue-50 text-blue-600',
  }));

  (data.recentPayments || []).forEach((item, index) => rows.push({
    id: `payment-${item.TransactionCode || index}`,
    type: 'payment',
    title: `Thanh toán ${formatMoney(item.Amount)}`,
    detail: `${item.ApartmentCode || 'Chưa rõ căn'}${item.ResidentName ? ` • ${item.ResidentName}` : ''}`,
    date: item.PaymentDate,
    icon: WalletCards,
    tone: 'bg-emerald-50 text-emerald-600',
  }));

  (data.recentTickets || []).forEach((item, index) => rows.push({
    id: `ticket-${item.RequestDate || index}`,
    type: 'ticket',
    title: item.Title || 'Yêu cầu hỗ trợ',
    detail: `${item.ApartmentCode || 'Chưa rõ căn'}${item.Status ? ` • ${item.Status}` : ''}`,
    date: item.RequestDate,
    icon: Wrench,
    tone: 'bg-amber-50 text-amber-600',
  }));

  (data.recentNotifications || []).forEach((item, index) => rows.push({
    id: `notification-${item.CreatedDate || index}`,
    type: 'notification',
    title: item.Title || 'Thông báo mới',
    detail: item.SenderName || item.TargetScope || 'Ban quản lý',
    date: item.CreatedDate,
    icon: AlertCircle,
    tone: 'bg-violet-50 text-violet-600',
  }));

  return rows
    .sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0))
    .slice(0, 8);
}

export default function DashboardOverview({ canAccess, flash, onNavigate, user }) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [financial, setFinancial] = useState(EMPTY_FINANCIAL);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    const [statsResult, activitiesResult, financialResult] = await Promise.allSettled([
      dashboardAPI.getStats(),
      dashboardAPI.getActivities(),
      canAccess('INVOICE_VIEW') ? dashboardAPI.getFinancial() : Promise.resolve(null),
    ]);

    if (statsResult.status === 'fulfilled' && statsResult.value?.success) {
      setStats({ ...EMPTY_STATS, ...statsResult.value.data });
    }

    if (activitiesResult.status === 'fulfilled' && activitiesResult.value?.success) {
      setActivities(flattenActivities(activitiesResult.value.data));
    }

    if (financialResult.status === 'fulfilled' && financialResult.value?.success) {
      setFinancial({ ...EMPTY_FINANCIAL, ...financialResult.value.data });
    }

    const failed = [statsResult, activitiesResult, financialResult]
      .filter((result) => result.status === 'rejected');

    if (failed.length) {
      setError('Một số chỉ số chưa tải được. Hãy kiểm tra quyền truy cập hoặc kết nối máy chủ.');
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, [canAccess]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const apartmentTotal = Number(stats.apartments?.Total) || 0;
  const apartmentOccupied = (Number(stats.apartments?.Occupied) || 0) + (Number(stats.apartments?.Rented) || 0);
  const occupancyRate = apartmentTotal ? Math.round((apartmentOccupied / apartmentTotal) * 100) : 0;
  const openTickets = (Number(stats.tickets?.New) || 0) + (Number(stats.tickets?.Processing) || 0);

  const revenueTrend = useMemo(() => {
    const source = financial.monthlyTrend?.length
      ? financial.monthlyTrend.map((item) => ({
        key: Number(item.Year || 0) * 100 + Number(item.Month || 0),
        month: `T${item.Month}/${String(item.Year).slice(-2)}`,
        revenue: Number(item.Revenue) || 0,
      }))
      : (stats.revenueByMonth || []).map((item) => ({
        key: Number(item.Year || 0) * 100 + Number(item.Month || 0),
        month: `T${item.Month}/${String(item.Year).slice(-2)}`,
        revenue: Number(item.Total) || 0,
      }));
    return source.sort((a, b) => a.key - b.key);
  }, [financial.monthlyTrend, stats.revenueByMonth]);

  const apartmentChart = [
    { name: 'Đang sử dụng', value: apartmentOccupied, color: '#2563eb' },
    { name: 'Căn trống', value: Number(stats.apartments?.Available) || 0, color: '#10b981' },
    { name: 'Bảo trì', value: Number(stats.apartments?.UnderMaintenance) || 0, color: '#f59e0b' },
  ].filter((item) => item.value > 0);

  const invoiceChart = [
    { name: 'Đã thanh toán', value: Number(stats.invoices?.Paid) || 0, color: '#10b981' },
    { name: 'Chưa thanh toán', value: Number(stats.invoices?.Unpaid) || 0, color: '#ef4444' },
    { name: 'Quá hạn', value: Number(stats.invoices?.Overdue) || 0, color: '#f59e0b' },
  ].filter((item) => item.value > 0);

  const displayName = user?.name || user?.employee?.fullName || user?.username || 'Ban quản lý';
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1746a2] via-[#0878c9] to-[#02a8ba] p-6 text-white shadow-xl shadow-blue-900/15 sm:p-7">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/15" />
        <div className="absolute right-24 top-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <Building2 size={14} />
              Chung cư Đức Vũ Tower
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Xin chào, {displayName}!</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
              Hệ thống đang ghi nhận {formatNumber(apartmentTotal)} căn hộ, {formatNumber(openTickets)} yêu cầu cần xử lý
              {canAccess('INVOICE_VIEW') ? ` và ${formatNumber(stats.invoices?.Unpaid)} hóa đơn chưa thanh toán.` : '.'}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-white/65">
              <CalendarDays size={14} />
              <span className="capitalize">{today}</span>
              {lastUpdated && <span>• Cập nhật {lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:w-[510px]">
            {canAccess('APARTMENT_VIEW') && (
              <QuickAction
                icon={House}
                label="Quản lý căn hộ"
                description="Sơ đồ phòng và hợp đồng"
                onClick={() => onNavigate('buildings')}
                tone="bg-cyan-400/20 text-cyan-100"
              />
            )}
            {canAccess('INVOICE_VIEW') && (
              <QuickAction
                icon={ReceiptText}
                label="Thu phí & hóa đơn"
                description="Theo dõi công nợ"
                onClick={() => onNavigate('fees')}
                tone="bg-rose-400/20 text-rose-100"
              />
            )}
            {canAccess('TICKET_VIEW') && (
              <QuickAction
                icon={Wrench}
                label="Yêu cầu hỗ trợ"
                description="Việc cần xử lý"
                onClick={() => onNavigate('tickets')}
                tone="bg-amber-400/20 text-amber-100"
              />
            )}
            {canAccess('PARKING_VIEW') && (
              <QuickAction
                icon={WalletCards}
                label="Quản lý bãi xe"
                description="Xe, thẻ và vị trí đỗ"
                onClick={() => onNavigate('parking-slots')}
                tone="bg-emerald-400/20 text-emerald-100"
              />
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="flex items-center gap-2"><AlertCircle size={17} />{error}</span>
          <button type="button" onClick={loadDashboard} className="font-bold hover:underline">Thử lại</button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Tổng căn hộ" value={loading ? '—' : formatNumber(apartmentTotal)} detail={`${occupancyRate}% đang sử dụng`} tone="blue" />
        <StatCard icon={Users} label="Cư dân hoạt động" value={loading ? '—' : formatNumber(stats.residents?.Active)} detail={`${formatNumber(stats.residents?.Total)} hồ sơ cư dân`} tone="emerald" />
        <StatCard icon={FileText} label="Hợp đồng hiệu lực" value={loading ? '—' : formatNumber(stats.contracts?.Active)} detail={`${formatNumber(stats.contracts?.Total)} hợp đồng trong hệ thống`} tone="violet" />
        <StatCard icon={Wrench} label="Yêu cầu đang xử lý" value={loading ? '—' : formatNumber(openTickets)} detail={`${formatNumber(stats.tickets?.Completed)} yêu cầu đã hoàn tất`} tone="amber" />
        {canAccess('INVOICE_VIEW') && (
          <>
            <StatCard icon={WalletCards} label="Đã thu tháng này" value={loading ? '—' : formatCompactMoney(financial.currentMonth?.Paid)} detail={formatMoney(financial.currentMonth?.Paid)} tone="cyan" />
            <StatCard icon={AlertCircle} label="Công nợ hiện tại" value={loading ? '—' : formatCompactMoney(financial.outstanding?.Outstanding)} detail={`${formatNumber(stats.invoices?.Unpaid)} hóa đơn chưa thu`} tone="rose" />
          </>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
        <Panel
          title="Doanh thu đã thu"
          description="Chỉ tính hóa đơn có trạng thái đã thanh toán"
          action={(
            <button
              type="button"
              onClick={loadDashboard}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              aria-label="Tải lại dashboard"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        >
          <div className="h-[300px] px-3 pb-4 pt-5 sm:px-5">
            {revenueTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ left: 4, right: 12, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={58}
                    tickFormatter={formatCompactMoney}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip formatter={(value) => [formatMoney(value), 'Đã thu']} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fill="url(#dashboardRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                <WalletCards size={34} />
                <p className="mt-3 text-sm font-semibold">Chưa có doanh thu đã thanh toán</p>
                <p className="mt-1 text-xs">Biểu đồ sẽ xuất hiện khi hệ thống có dữ liệu.</p>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Tình trạng căn hộ" description={`${occupancyRate}% căn hộ đang được sử dụng`}>
          <div className="grid min-h-[300px] items-center gap-3 p-5 sm:grid-cols-[150px_1fr] xl:grid-cols-1 2xl:grid-cols-[150px_1fr]">
            <div className="relative mx-auto h-[150px] w-[150px]">
              {apartmentChart.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={apartmentChart} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={3}>
                      {apartmentChart.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full rounded-full border-[16px] border-slate-100" />
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-900">{occupancyRate}%</span>
                <span className="text-[10px] font-semibold uppercase text-slate-400">Lấp đầy</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                ['Đang sử dụng', apartmentOccupied, '#2563eb'],
                ['Căn trống', stats.apartments?.Available, '#10b981'],
                ['Bảo trì', stats.apartments?.UnderMaintenance, '#f59e0b'],
              ].map(([label, value, color]) => (
                <div key={label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                  <strong className="text-slate-900">{formatNumber(value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Hoạt động gần đây"
          description="Hợp đồng, thanh toán, yêu cầu và thông báo mới nhất"
          action={canAccess('REPORT_VIEW') ? (
            <button type="button" onClick={() => onNavigate('quick-report')} className="text-xs font-bold text-blue-600 hover:underline">
              Xem báo cáo
            </button>
          ) : null}
        >
          <div className="divide-y divide-slate-100">
            {activities.length ? activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/80">
                  <span className={`rounded-lg p-2.5 ${activity.tone}`}><Icon size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{activity.title}</p>
                    <p className="truncate text-xs text-slate-500">{activity.detail}</p>
                  </div>
                  <time className="hidden shrink-0 text-[11px] text-slate-400 sm:block">{formatActivityTime(activity.date)}</time>
                </div>
              );
            }) : (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center text-slate-400">
                <CheckCircle2 size={34} />
                <p className="mt-3 text-sm font-semibold">Chưa có hoạt động gần đây</p>
              </div>
            )}
          </div>
        </Panel>

        {canAccess('INVOICE_VIEW') && (
          <Panel title="Tình trạng hóa đơn" description={`${formatNumber(stats.invoices?.Total)} hóa đơn trong hệ thống`}>
            <div className="grid min-h-[300px] items-center gap-4 p-5 sm:grid-cols-[170px_1fr] xl:grid-cols-1 2xl:grid-cols-[170px_1fr]">
              <div className="mx-auto h-[170px] w-[170px]">
                {invoiceChart.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={invoiceChart} dataKey="value" innerRadius={52} outerRadius={76} paddingAngle={3}>
                        {invoiceChart.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatNumber(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full rounded-full border-[18px] border-slate-100" />
                )}
              </div>
              <div className="space-y-3">
                {invoiceChart.length ? invoiceChart.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <strong>{formatNumber(item.value)}</strong>
                  </div>
                )) : <p className="text-center text-sm text-slate-400">Chưa có dữ liệu hóa đơn.</p>}
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('fees');
                    flash?.('Đã mở trang hóa đơn.');
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Mở quản lý hóa đơn <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </Panel>
        )}
      </section>
    </div>
  );
}
