import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Building2,
  FileText,
  Car,
  Receipt,
  Wallet,
  BrainCircuit,
  TrendingDown,
  TrendingUp,
  Minus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { aiAPI } from '../api';


const formatMoney = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
};


const formatCompactMoney = (value) => {
  const number = Number(value || 0);

  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toFixed(1)} tỷ`;
  }

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1)} tr`;
  }

  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(0)}k`;
  }

  return String(number);
};


function StatCard({
  icon: Icon,
  label,
  value,
  description
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="rounded-xl bg-[#eef5f2] p-3 text-[#1f4f46]">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}


export default function AIStatistics() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');


  const loadData = async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const response = await aiAPI.getStatisticsDashboard();

      if (!response?.success) {
        throw new Error(
          response?.message ||
          'AI Service không trả về dữ liệu hợp lệ'
        );
      }

      setDashboard(response.data);
    } catch (err) {
      console.error('AI Statistics load error:', err);

      setError(
        err?.message ||
        'Không thể tải dữ liệu Thống kê AI'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    loadData();
  }, []);


  const overview = dashboard?.overview || {};
  const period = dashboard?.period || {};
  const insight = dashboard?.billingInsight || {};


  const chartData = useMemo(() => {
    const trend = Array.isArray(dashboard?.billingTrend)
      ? dashboard.billingTrend
      : [];

    return trend.map((item) => ({
      ...item,
      period: `T${item.month}/${item.year}`,
      totalBilled: Number(item.totalBilled || 0),
      invoiceCount: Number(item.invoiceCount || 0)
    }));
  }, [dashboard]);


  const directionConfig = useMemo(() => {
    if (insight.direction === 'UP') {
      return {
        icon: TrendingUp,
        label: 'Tăng',
        className:
          'border-emerald-200 bg-emerald-50 text-emerald-700'
      };
    }

    if (insight.direction === 'DOWN') {
      return {
        icon: TrendingDown,
        label: 'Giảm',
        className:
          'border-rose-200 bg-rose-50 text-rose-700'
      };
    }

    return {
      icon: Minus,
      label: 'Ổn định',
      className:
        'border-slate-200 bg-slate-50 text-slate-700'
    };
  }, [insight.direction]);


  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <RefreshCw
              size={28}
              className="mx-auto animate-spin text-[#1f4f46]"
            />

            <p className="mt-3 text-sm font-medium text-slate-600">
              Đang phân tích dữ liệu...
            </p>
          </div>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={22}
              className="mt-0.5 text-rose-600"
            />

            <div>
              <p className="font-bold text-rose-900">
                Không thể tải Thống kê AI
              </p>

              <p className="mt-1 text-sm text-rose-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() => loadData(true)}
                className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  const DirectionIcon = directionConfig.icon;


  return (
    <div className="space-y-6 p-6 lg:p-8">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit
              size={22}
              className="text-[#1f4f46]"
            />

            <h3 className="text-xl font-bold text-slate-950">
              Phân tích vận hành
            </h3>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Dữ liệu tháng {period.month}/{period.year} được tổng hợp
            trực tiếp từ hệ thống.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'animate-spin' : ''}
          />

          {refreshing ? 'Đang cập nhật...' : 'Cập nhật dữ liệu'}
        </button>
      </div>


      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          icon={Users}
          label="Cư dân"
          value={overview.activeResidents || 0}
          description="Đang hoạt động"
        />

        <StatCard
          icon={Building2}
          label="Căn hộ"
          value={overview.totalApartments || 0}
          description="Tổng căn hộ"
        />

        <StatCard
          icon={FileText}
          label="Hợp đồng"
          value={overview.activeContracts || 0}
          description="Đang hiệu lực"
        />

        <StatCard
          icon={Car}
          label="Phương tiện"
          value={overview.activeVehicles || 0}
          description="Đang hoạt động"
        />

        <StatCard
          icon={Receipt}
          label="Hóa đơn tháng"
          value={overview.currentMonthInvoices || 0}
          description={`Tháng ${period.month}/${period.year}`}
        />

        <StatCard
          icon={Wallet}
          label="Giá trị hóa đơn"
          value={formatCompactMoney(
            overview.currentMonthBilled
          )}
          description={formatMoney(
            overview.currentMonthBilled
          )}
        />
      </div>


      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">

        {/* Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="font-bold text-slate-950">
              Xu hướng giá trị hóa đơn
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Tổng giá trị hóa đơn theo từng tháng có dữ liệu.
            </p>
          </div>

          {chartData.length === 0 ? (
            <div className="flex h-80 items-center justify-center text-sm text-slate-500">
              Chưa có dữ liệu hóa đơn để hiển thị.
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 5,
                    bottom: 5
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    tickFormatter={formatCompactMoney}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />

                  <Tooltip
                    formatter={(value) => [
                      formatMoney(value),
                      'Giá trị hóa đơn'
                    ]}
                    labelFormatter={(label) =>
                      `Kỳ ${label}`
                    }
                  />

                  <Bar
                    dataKey="totalBilled"
                    fill="#1f4f46"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>


        {/* AI Insight */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BrainCircuit
                  size={20}
                  className="text-[#1f4f46]"
                />

                <h3 className="font-bold text-slate-950">
                  Nhận xét AI
                </h3>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Phân tích tự động dựa trên dữ liệu hệ thống.
              </p>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${directionConfig.className}`}
            >
              <DirectionIcon size={14} />

              {directionConfig.label}

              {insight.changePercent !== null &&
                insight.changePercent !== undefined && (
                  <span>
                    {Math.abs(
                      Number(insight.changePercent)
                    ).toFixed(2)}
                    %
                  </span>
                )}
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-[#eef5f2] p-4">
            <p className="text-sm leading-6 text-slate-700">
              {insight.insight ||
                'Chưa có nhận xét từ hệ thống.'}
            </p>
          </div>


          {insight.isCurrentMonthIncomplete && (
            <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <p className="text-sm leading-6 text-amber-800">
                Tháng hiện tại chưa kết thúc. Tỷ lệ thay đổi chỉ
                dùng để tham khảo và không phải kết luận cuối tháng.
              </p>
            </div>
          )}


          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500">
                Kỳ trước
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {insight.previousPeriod
                  ? `T${insight.previousPeriod.month}/${insight.previousPeriod.year}`
                  : '-'}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatMoney(
                  insight.previousPeriod?.totalBilled
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500">
                Kỳ hiện tại
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {insight.currentPeriod
                  ? `T${insight.currentPeriod.month}/${insight.currentPeriod.year}`
                  : '-'}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatMoney(
                  insight.currentPeriod?.totalBilled
                )}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Invoice details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-950">
          Chi tiết dữ liệu theo kỳ
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Các kỳ hóa đơn đang được sử dụng cho phân tích.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">
                  Kỳ
                </th>

                <th className="px-4 py-3">
                  Số hóa đơn
                </th>

                <th className="px-4 py-3">
                  Tổng giá trị
                </th>

                <th className="px-4 py-3">
                  Trung bình / hóa đơn
                </th>
              </tr>
            </thead>

            <tbody>
              {chartData.map((item) => {
                const average =
                  item.invoiceCount > 0
                    ? item.totalBilled /
                      item.invoiceCount
                    : 0;

                return (
                  <tr
                    key={`${item.year}-${item.month}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      Tháng {item.month}/{item.year}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {item.invoiceCount}
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {formatMoney(item.totalBilled)}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {formatMoney(average)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}