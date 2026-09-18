import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

import { motion } from 'framer-motion';

import {
  Activity,
  Bell,
  Building2,
  Car,
  CheckCircle2,
  CircleAlert,
  Clock,
  CreditCard,
  Download,
  FileText,
  Percent,
  RefreshCw,
  ReceiptText,
  Users,
  Wrench
} from 'lucide-react';

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
  YAxis
} from 'recharts';

import { dashboardAPI } from '../api';
import { formatDate } from '../utils/formatters';

const COLORS = {
  purple: '#7258f5',
  purpleSoft: '#f2efff',
  blue: '#3b82f6',
  blueSoft: '#edf5ff',
  green: '#21b993',
  greenSoft: '#eafaf5',
  orange: '#f59e0b',
  orangeSoft: '#fff7e8',
  red: '#ef5b6c',
  redSoft: '#fff0f2',
  slate: '#64748b'
};

const EMPTY_STATS = {
  apartments: {
    Total: 0,
    Available: 0,
    Occupied: 0,
    Rented: 0,
    UnderMaintenance: 0
  },
  contracts: {
    Total: 0,
    Active: 0,
    Expired: 0,
    Terminated: 0
  },
  invoices: {
    Total: 0,
    Paid: 0,
    Unpaid: 0,
    Overdue: 0,
    TotalRevenue: 0
  },
  residents: {
    Total: 0,
    Active: 0
  },
  tickets: {
    Total: 0,
    New: 0,
    Processing: 0,
    Completed: 0
  }
};

const EMPTY_FINANCIAL = {
  currentMonth: {
    Paid: 0,
    Unpaid: 0,
    Overdue: 0,
    TotalInvoices: 0
  },
  yearToDate: {
    Revenue: 0
  },
  outstanding: {
    Outstanding: 0
  },
  monthlyTrend: []
};

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatCompactMoney(value) {
  const amount = Number(value || 0);

  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  }

  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} triệu`;
  }

  return formatMoney(amount);
}

function Panel({ title, description, badge, children, className = '' }) {
  return (
    <section
      className={`overflow-hidden rounded-[18px] border border-[#e7e9ef] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] ${className}`}
    >
      <div className="flex min-h-[68px] items-center justify-between gap-4 border-b border-[#eceef3] px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[#1d1d24]">
            {title}
          </h3>

          {description && (
            <p className="mt-1 text-xs text-[#8b8d98]">
              {description}
            </p>
          )}
        </div>

        {badge}
      </div>

      {children}
    </section>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  description,
  iconColor,
  iconBackground
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="group rounded-[18px] border border-[#e7e9ef] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-shadow hover:shadow-[0_14px_35px_rgba(15,23,42,0.07)]"
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-[13px]"
        style={{
          color: iconColor,
          backgroundColor: iconBackground
        }}
      >
        <Icon size={21} strokeWidth={1.9} />
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8c96]">
        {label}
      </p>

      <p className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-[#18181e]">
        {value}
      </p>

      <p className="mt-1 min-h-5 text-xs text-[#9698a2]">
        {description}
      </p>
    </motion.article>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex h-full min-h-[240px] items-center justify-center">
      <div className="text-center text-[#a0a2ac]">
        <Activity size={28} className="mx-auto mb-2" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function ActivityIcon({ type }) {
  const config = {
    contract: {
      icon: FileText,
      color: COLORS.purple,
      background: COLORS.purpleSoft
    },
    payment: {
      icon: CreditCard,
      color: COLORS.green,
      background: COLORS.greenSoft
    },
    ticket: {
      icon: Wrench,
      color: COLORS.orange,
      background: COLORS.orangeSoft
    },
    notification: {
      icon: Bell,
      color: COLORS.blue,
      background: COLORS.blueSoft
    }
  };

  const selected = config[type] || {
    icon: Activity,
    color: COLORS.slate,
    background: '#f3f4f6'
  };

  const Icon = selected.icon;

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      style={{
        color: selected.color,
        backgroundColor: selected.background
      }}
    >
      <Icon size={17} />
    </div>
  );
}

function normalizeActivities(data) {
  const rows = [];

  (data?.recentContracts || []).forEach((item) => {
    rows.push({
      id: `contract-${item.ContractID}`,
      type: 'contract',
      title: item.ApartmentCode || item.ContractNumber || 'Hợp đồng',
      description: 'Hợp đồng mới được tạo',
      date: item.CreatedDate || item.SignDate
    });
  });

  (data?.recentPayments || []).forEach((item) => {
    rows.push({
      id: `payment-${item.PaymentID}`,
      type: 'payment',
      title: item.ApartmentCode || item.ResidentName || 'Thanh toán',
      description: `Thanh toán ${formatCompactMoney(item.Amount)}`,
      date: item.PaymentDate
    });
  });

  (data?.recentTickets || []).forEach((item) => {
    rows.push({
      id: `ticket-${item.RequestID}`,
      type: 'ticket',
      title: item.Title || item.ApartmentCode || 'Ticket hỗ trợ',
      description: 'Yêu cầu hỗ trợ mới',
      date: item.RequestDate
    });
  });

  (data?.recentNotifications || []).forEach((item) => {
    rows.push({
      id: `notification-${item.NotificationID}`,
      type: 'notification',
      title: item.Title || 'Thông báo',
      description: 'Thông báo mới được gửi',
      date: item.CreatedDate
    });
  });

  return rows
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5);
}

export default function QuickReport({ flash }) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [financial, setFinancial] = useState(EMPTY_FINANCIAL);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');

  const fetchData = useCallback(async (showMessage = false) => {
    try {
      setError('');

      const [statsResponse, activitiesResponse, financialResponse] =
        await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getActivities(),
          dashboardAPI.getFinancial()
        ]);

      const statsData = statsResponse?.data || {};
      const financialData = financialResponse?.data || {};

      setStats({
        apartments: {
          ...EMPTY_STATS.apartments,
          ...(statsData.apartments || {})
        },
        contracts: {
          ...EMPTY_STATS.contracts,
          ...(statsData.contracts || {})
        },
        invoices: {
          ...EMPTY_STATS.invoices,
          ...(statsData.invoices || {})
        },
        residents: {
          ...EMPTY_STATS.residents,
          ...(statsData.residents || {})
        },
        tickets: {
          ...EMPTY_STATS.tickets,
          ...(statsData.tickets || {})
        }
      });

      setFinancial({
        currentMonth: {
          ...EMPTY_FINANCIAL.currentMonth,
          ...(financialData.currentMonth || {})
        },
        yearToDate: {
          ...EMPTY_FINANCIAL.yearToDate,
          ...(financialData.yearToDate || {})
        },
        outstanding: {
          ...EMPTY_FINANCIAL.outstanding,
          ...(financialData.outstanding || {})
        },
        monthlyTrend: financialData.monthlyTrend || []
      });

      setActivities(
        normalizeActivities(activitiesResponse?.data || {})
      );

      if (showMessage && flash) {
        flash('Đã cập nhật báo cáo');
      }
    } catch (fetchError) {
      setError(
        fetchError?.message || 'Không thể tải dữ liệu báo cáo'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [flash]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const occupiedApartments =
    Number(stats.apartments.Occupied || 0) +
    Number(stats.apartments.Rented || 0);

  const occupancyRate = stats.apartments.Total
    ? Math.round(
        (occupiedApartments / Number(stats.apartments.Total)) * 100
      )
    : 0;

  const revenueData = useMemo(() => {
    const data = [...(financial.monthlyTrend || [])]
      .sort((a, b) => {
        if (a.Year !== b.Year) {
          return Number(a.Year) - Number(b.Year);
        }

        return Number(a.Month) - Number(b.Month);
      })
      .slice(-6)
      .map((item) => ({
        name: `T${item.Month}`,
        revenue: Math.round(Number(item.Revenue || 0) / 1_000_000)
      }));

    return data;
  }, [financial.monthlyTrend]);

  const invoiceData = useMemo(() => {
    return [
      {
        name: 'Đã thanh toán',
        value: Number(stats.invoices.Paid || 0),
        color: COLORS.green
      },
      {
        name: 'Chưa thanh toán',
        value: Number(stats.invoices.Unpaid || 0),
        color: COLORS.orange
      },
      {
        name: 'Quá hạn',
        value: Number(stats.invoices.Overdue || 0),
        color: COLORS.red
      }
    ].filter((item) => item.value > 0);
  }, [stats.invoices]);

  const apartmentData = useMemo(() => {
    return [
      {
        name: 'Đã thuê',
        value: occupiedApartments,
        fill: COLORS.purple
      },
      {
        name: 'Còn trống',
        value: Number(stats.apartments.Available || 0),
        fill: COLORS.green
      },
      {
        name: 'Bảo trì',
        value: Number(stats.apartments.UnderMaintenance || 0),
        fill: COLORS.orange
      }
    ];
  }, [occupiedApartments, stats.apartments]);

  const contractData = useMemo(() => {
    return [
      {
        name: 'Hiệu lực',
        value: Number(stats.contracts.Active || 0),
        color: COLORS.purple
      },
      {
        name: 'Hết hạn',
        value: Number(stats.contracts.Expired || 0),
        color: COLORS.orange
      },
      {
        name: 'Thanh lý',
        value: Number(stats.contracts.Terminated || 0),
        color: COLORS.red
      }
    ].filter((item) => item.value > 0);
  }, [stats.contracts]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-[18px] bg-slate-200"
            />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[390px] animate-pulse rounded-[18px] bg-slate-200"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="max-w-md rounded-[20px] border border-red-100 bg-white p-8 text-center shadow-sm">
          <CircleAlert
            size={42}
            className="mx-auto text-red-500"
          />

          <h2 className="mt-4 text-xl font-semibold text-slate-950">
            Không thể tải báo cáo
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={handleRefresh}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7258f5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#624be9]"
          >
            <RefreshCw size={16} />
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      {/* Tiêu đề */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7258f5]">
            Đức Vũ Tower
          </p>

          <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-[#18181e]">
            Tổng quan vận hành
          </h2>

          <p className="mt-1 text-sm text-[#858793]">
            Cập nhật lúc {formatDate(new Date(), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="h-10 rounded-xl border border-[#e4e6ed] bg-white px-3 text-sm text-[#3f414b] outline-none focus:border-[#7258f5]"
          >
            <option value="month">Tháng này</option>
            <option value="quarter">Quý này</option>
            <option value="year">Năm nay</option>
          </select>

          <button
            type="button"
            onClick={handleRefresh}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4e6ed] bg-white text-[#666875] hover:bg-[#f7f6ff] hover:text-[#7258f5]"
          >
            <RefreshCw
              size={17}
              className={refreshing ? 'animate-spin' : ''}
            />
          </button>

          <button
            type="button"
            onClick={() => flash?.('Đang chuẩn bị báo cáo')}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#18181e] px-4 text-sm font-semibold text-white hover:bg-black"
          >
            <Download size={16} />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* 5 KPI giống bố cục ảnh mẫu */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          icon={Building2}
          label="Tổng căn hộ"
          value={formatNumber(stats.apartments.Total)}
          description={`${formatNumber(stats.apartments.Available)} căn còn trống`}
          iconColor={COLORS.purple}
          iconBackground={COLORS.purpleSoft}
        />

        <KpiCard
          icon={Users}
          label="Cư dân"
          value={formatNumber(stats.residents.Active)}
          description="Đang cư trú"
          iconColor={COLORS.blue}
          iconBackground={COLORS.blueSoft}
        />

        <KpiCard
          icon={Percent}
          label="Tỷ lệ lấp đầy"
          value={`${occupancyRate}%`}
          description={`${formatNumber(occupiedApartments)} căn đã sử dụng`}
          iconColor={COLORS.green}
          iconBackground={COLORS.greenSoft}
        />

        <KpiCard
          icon={Wrench}
          label="Cần xử lý"
          value={formatNumber(
            Number(stats.tickets.New || 0) +
            Number(stats.tickets.Processing || 0)
          )}
          description={`${formatNumber(stats.tickets.New)} ticket mới`}
          iconColor={COLORS.orange}
          iconBackground={COLORS.orangeSoft}
        />

        <KpiCard
          icon={ReceiptText}
          label="Công nợ"
          value={formatCompactMoney(
            financial.outstanding.Outstanding
          )}
          description={`${formatNumber(stats.invoices.Unpaid)} hóa đơn chưa thu`}
          iconColor={COLORS.red}
          iconBackground={COLORS.redSoft}
        />
      </div>

      {/* Hàng biểu đồ chính */}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)_minmax(310px,0.9fr)]">
        <Panel
          title="Doanh thu theo tháng"
          description="Đơn vị: triệu VNĐ"
          badge={
            <span className="rounded-lg bg-[#f2efff] px-3 py-1 text-xs font-semibold text-[#7258f5]">
              6 tháng
            </span>
          }
        >
          <div className="h-[320px] p-5">
            {revenueData.length === 0 ? (
              <EmptyChart message="Chưa có dữ liệu doanh thu" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="quick-report-revenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={COLORS.purple}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor={COLORS.purple}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    stroke="#eceef3"
                    strokeDasharray="4 4"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#90929c', fontSize: 11 }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#90929c', fontSize: 11 }}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${formatNumber(value)} triệu`,
                      'Doanh thu'
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e7e9ef',
                      boxShadow: '0 12px 30px rgba(15,23,42,.08)'
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.purple}
                    strokeWidth={3}
                    fill="url(#quick-report-revenue)"
                    activeDot={{
                      r: 5,
                      fill: '#ffffff',
                      stroke: COLORS.purple,
                      strokeWidth: 3
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel
          title="Trạng thái hóa đơn"
          description="Phân bố hóa đơn hiện tại"
        >
          <div className="h-[220px] px-4 pt-5">
            {invoiceData.length === 0 ? (
              <EmptyChart message="Chưa có hóa đơn" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoiceData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {invoiceData.map((item) => (
                      <Cell
                        key={item.name}
                        fill={item.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-3 px-5 pb-5">
            {invoiceData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 text-[#747680]">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />

                  {item.name}
                </div>

                <span className="font-semibold text-[#24252b]">
                  {formatNumber(item.value)}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Công việc gần đây"
          description={`${activities.length} hoạt động`}
        >
          <div className="max-h-[390px] divide-y divide-[#eff0f4] overflow-y-auto">
            {activities.length === 0 ? (
              <EmptyChart message="Chưa có hoạt động" />
            ) : (
              activities.map((item) => (
                <div
                  key={item.id}
                  className="group p-4 transition hover:bg-[#fafaff]"
                >
                  <div className="flex gap-3">
                    <ActivityIcon type={item.type} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#25262c]">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs text-[#858793]">
                        {item.description}
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] text-[#a0a2ab]">
                          <Clock size={12} />

                          {item.date
                            ? formatDate(
                                item.date,
                                'dd/MM/yyyy HH:mm'
                              )
                            : 'Vừa xong'}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            flash?.(`Đã chọn ${item.title}`)
                          }
                          className="rounded-lg border border-[#e6e7ed] px-2.5 py-1 text-[11px] font-semibold text-[#686a74] hover:border-[#7258f5] hover:text-[#7258f5]"
                        >
                          Xem
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {/* Hàng biểu đồ dưới */}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel
          title="Tình trạng căn hộ"
          description="Số lượng căn hộ theo trạng thái"
        >
          <div className="h-[300px] p-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={apartmentData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#eceef3"
                  strokeDasharray="4 4"
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#858793', fontSize: 11 }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#858793', fontSize: 11 }}
                />

                <Tooltip />

                <Bar
                  dataKey="value"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={72}
                >
                  {apartmentData.map((item) => (
                    <Cell
                      key={item.name}
                      fill={item.fill}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Tình trạng hợp đồng"
          description={`${formatNumber(stats.contracts.Total)} hợp đồng`}
        >
          <div className="h-[210px] p-4">
            {contractData.length === 0 ? (
              <EmptyChart message="Chưa có hợp đồng" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contractData}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={5}
                    strokeWidth={0}
                  >
                    {contractData.map((item) => (
                      <Cell
                        key={item.name}
                        fill={item.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-3 border-t border-[#eceef3]">
            {[
              {
                label: 'Hiệu lực',
                value: stats.contracts.Active,
                color: COLORS.purple
              },
              {
                label: 'Hết hạn',
                value: stats.contracts.Expired,
                color: COLORS.orange
              },
              {
                label: 'Thanh lý',
                value: stats.contracts.Terminated,
                color: COLORS.red
              }
            ].map((item) => (
              <div
                key={item.label}
                className="border-r border-[#eceef3] px-3 py-4 text-center last:border-r-0"
              >
                <p
                  className="text-lg font-semibold"
                  style={{ color: item.color }}
                >
                  {formatNumber(item.value)}
                </p>

                <p className="mt-1 text-[11px] text-[#90929c]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Thanh tài chính */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Đã thu tháng này',
            value: financial.currentMonth.Paid,
            icon: CheckCircle2,
            color: COLORS.green,
            background: COLORS.greenSoft
          },
          {
            label: 'Chưa thu',
            value: financial.currentMonth.Unpaid,
            icon: CreditCard,
            color: COLORS.orange,
            background: COLORS.orangeSoft
          },
          {
            label: 'Quá hạn',
            value: financial.currentMonth.Overdue,
            icon: CircleAlert,
            color: COLORS.red,
            background: COLORS.redSoft
          },
          {
            label: 'Doanh thu năm',
            value: financial.yearToDate.Revenue,
            icon: Car,
            color: COLORS.blue,
            background: COLORS.blueSoft
          }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="flex items-center gap-4 rounded-[18px] border border-[#e7e9ef] bg-white p-5"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  color: item.color,
                  backgroundColor: item.background
                }}
              >
                <Icon size={20} />
              </div>

              <div>
                <p className="text-xs text-[#858793]">
                  {item.label}
                </p>

                <p className="mt-1 text-lg font-semibold text-[#202127]">
                  {formatCompactMoney(item.value)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}