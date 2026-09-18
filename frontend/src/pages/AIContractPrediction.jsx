import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  AlertTriangle,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Wallet
} from 'lucide-react';

import { aiAPI } from '../api';


export default function AIContractPrediction() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const response =
        await aiAPI.getPredictionDashboard();

      if (!response?.success) {
        throw new Error(
          response?.message ||
          'Không thể tải dữ liệu dự đoán hợp đồng'
        );
      }

      setDashboard(response);

    } catch (err) {
      console.error(
        'AIContractPrediction load error:',
        err
      );

      setError(
        err?.message ||
        'Không thể kết nối AI Prediction Service'
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadData();
  }, []);


  const readiness =
    dashboard?.readiness || {};

  const prediction =
    dashboard?.prediction || {};

  const summary =
    prediction?.summary || {};

  const contracts =
    Array.isArray(prediction?.data)
      ? prediction.data
      : [];


  const highRiskContracts = useMemo(
    () =>
      contracts.filter(
        (item) =>
          item.riskLevel === 'HIGH'
      ),
    [contracts]
  );


  const formatMoney = (value) => {
    return new Intl.NumberFormat(
      'vi-VN',
      {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
      }
    ).format(
      Number(value || 0)
    );
  };


  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">

        <div className="text-center">

          <Loader2
            size={34}
            className="mx-auto animate-spin text-[#635bff]"
          />

          <p className="mt-3 text-sm text-slate-500">
            AI đang phân tích hợp đồng...
          </p>

        </div>

      </div>
    );
  }


  if (error) {
    return (
      <div className="space-y-5 p-6 lg:p-8">

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">

          <div className="flex items-start gap-3">

            <AlertTriangle
              size={22}
              className="mt-0.5 text-rose-600"
            />

            <div>
              <h3 className="font-bold text-rose-900">
                Không thể tải dự đoán hợp đồng
              </h3>

              <p className="mt-1 text-sm text-rose-700">
                {error}
              </p>

              <button
                type="button"
                onClick={loadData}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                <RefreshCw size={16} />
                Thử lại
              </button>
            </div>

          </div>

        </div>

      </div>
    );
  }


  return (
    <div className="space-y-6 p-6 lg:p-8">

      {/* =====================================================
          HEADER
      ====================================================== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

        <div>

          <div className="flex items-center gap-2">

            <BrainCircuit
              size={24}
              className="text-[#635bff]"
            />

            <h3 className="text-xl font-bold text-slate-950">
              Dự đoán hợp đồng
            </h3>

          </div>

          <p className="mt-1 text-sm text-slate-500">
            Phân tích các hợp đồng sắp hết hạn và chấm điểm rủi ro cần xử lý.
          </p>

        </div>


        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Làm mới
        </button>

      </div>


      {/* =====================================================
          MODE WARNING
      ====================================================== */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

        <div className="flex items-start gap-3">

          <ShieldAlert
            size={22}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <h4 className="font-bold text-amber-950">
                Chế độ Risk Scoring
              </h4>

              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                {readiness?.readiness || 'INSUFFICIENT'}
              </span>

            </div>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              {readiness?.message}
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-700">
              Hiện cơ sở dữ liệu chỉ có{' '}
              <strong>
                {readiness?.endedContracts || 0}
              </strong>{' '}
              hợp đồng đã kết thúc nên chưa đủ dữ liệu để huấn luyện
              Machine Learning đáng tin cậy.
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          SUMMARY CARDS
      ====================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          icon={FileText}
          label="Hợp đồng đang hoạt động"
          value={readiness?.activeContracts || 0}
          description={`Tổng ${readiness?.totalContracts || 0} hợp đồng`}
        />

        <SummaryCard
          icon={CalendarDays}
          label="Sắp hết hạn 30 ngày"
          value={readiness?.expiring30Days || 0}
          description="Cần ưu tiên theo dõi"
        />

        <SummaryCard
          icon={ShieldAlert}
          label="Rủi ro cao"
          value={summary?.highRisk || 0}
          description="Cần xử lý sớm"
          tone="high"
        />

        <SummaryCard
          icon={TrendingUp}
          label="Đang được phân tích"
          value={summary?.total || 0}
          description="Hợp đồng hết hạn trong 90 ngày"
        />

      </div>


      {/* =====================================================
          RISK DISTRIBUTION
      ====================================================== */}
      <div className="grid gap-4 md:grid-cols-3">

        <RiskSummary
          title="Rủi ro cao"
          value={summary?.highRisk || 0}
          level="HIGH"
          description="Nên liên hệ và xử lý sớm"
        />

        <RiskSummary
          title="Rủi ro trung bình"
          value={summary?.mediumRisk || 0}
          level="MEDIUM"
          description="Cần chủ động theo dõi"
        />

        <RiskSummary
          title="Rủi ro thấp"
          value={summary?.lowRisk || 0}
          level="LOW"
          description="Tiếp tục theo dõi định kỳ"
        />

      </div>


      {/* =====================================================
          HIGH RISK WARNING
      ====================================================== */}
      {highRiskContracts.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">

          <div className="flex items-start gap-3">

            <AlertTriangle
              size={22}
              className="mt-0.5 shrink-0 text-rose-600"
            />

            <div>

              <h4 className="font-bold text-rose-900">
                Có {highRiskContracts.length} hợp đồng rủi ro cao
              </h4>

              <p className="mt-1 text-sm text-rose-700">
                Nên ưu tiên liên hệ cư dân và kiểm tra các khoản
                tồn đọng trước khi hợp đồng hết hạn.
              </p>

            </div>

          </div>

        </div>
      )}


      {/* =====================================================
          CONTRACT LIST
      ====================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 px-5 py-4">

          <div className="flex flex-col gap-1">

            <h4 className="font-bold text-slate-950">
              Hợp đồng sắp hết hạn
            </h4>

            <p className="text-sm text-slate-500">
              Hệ thống phân tích các hợp đồng còn tối đa 90 ngày.
            </p>

          </div>

        </div>


        {contracts.length === 0 ? (

          <div className="p-10 text-center">

            <CheckCircle2
              size={34}
              className="mx-auto text-emerald-500"
            />

            <h5 className="mt-3 font-bold text-slate-900">
              Không có hợp đồng cần phân tích
            </h5>

            <p className="mt-1 text-sm text-slate-500">
              Hiện không có hợp đồng nào hết hạn trong 90 ngày tới.
            </p>

          </div>

        ) : (

          <div className="divide-y divide-slate-100">

            {contracts.map((contract) => (
              <ContractCard
                key={contract.contractId}
                contract={contract}
                formatMoney={formatMoney}
              />
            ))}

          </div>

        )}

      </div>


      {/* =====================================================
          MODEL INFO
      ====================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

        <div className="flex items-start gap-3">

          <ShieldCheck
            size={21}
            className="mt-0.5 shrink-0 text-[#635bff]"
          />

          <div>

            <h4 className="font-bold text-slate-900">
              Cách hệ thống đánh giá
            </h4>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Điểm hiện tại được tính dựa trên thời gian còn lại
              của hợp đồng, hóa đơn quá hạn và lịch sử hợp đồng
              của cư dân. Điểm này là công cụ hỗ trợ quản lý,
              không phải xác suất gia hạn được tạo bởi Machine Learning.
            </p>

            {prediction?.disclaimer && (
              <p className="mt-2 text-xs text-slate-500">
                {prediction.disclaimer}
              </p>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
  tone = 'default'
}) {
  const iconClass =
    tone === 'high'
      ? 'bg-rose-50 text-rose-600'
      : 'bg-[#f0efff] text-[#635bff]';

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

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>

        </div>


        <div
          className={`rounded-xl p-3 ${iconClass}`}
        >
          <Icon size={20} />
        </div>

      </div>

    </div>
  );
}


/* =========================================================
   RISK SUMMARY
========================================================= */

function RiskSummary({
  title,
  value,
  level,
  description
}) {
  const style = getRiskStyle(level);

  return (
    <div
      className={`rounded-2xl border p-5 ${style.container}`}
    >

      <div className="flex items-center justify-between gap-3">

        <div>

          <p className={`text-sm font-semibold ${style.text}`}>
            {title}
          </p>

          <p className={`mt-1 text-3xl font-bold ${style.value}`}>
            {value}
          </p>

          <p className={`mt-1 text-xs ${style.description}`}>
            {description}
          </p>

        </div>


        <div className={`rounded-xl p-3 ${style.icon}`}>
          <ShieldAlert size={21} />
        </div>

      </div>

    </div>
  );
}


/* =========================================================
   CONTRACT CARD
========================================================= */

function ContractCard({
  contract,
  formatMoney
}) {
  const riskStyle =
    getRiskStyle(
      contract.riskLevel
    );

  return (
    <div className="p-5">

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

        {/* LEFT */}
        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <h5 className="font-bold text-slate-950">
              {contract.contractNumber ||
                `Hợp đồng #${contract.contractId}`}
            </h5>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${riskStyle.badge}`}
            >
              {getRiskLabel(
                contract.riskLevel
              )}
            </span>

          </div>


          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

            <DetailItem
              icon={UserRound}
              label="Cư dân"
              value={
                contract.ownerName || '-'
              }
            />

            <DetailItem
              icon={FileText}
              label="Căn hộ"
              value={
                contract.apartmentCode || '-'
              }
            />

            <DetailItem
              icon={Clock3}
              label="Còn lại"
              value={`${contract.daysRemaining} ngày`}
            />

            <DetailItem
              icon={Wallet}
              label="Tiền thuê"
              value={formatMoney(
                contract.rent
              )}
            />

          </div>


          <div className="mt-4 grid gap-3 sm:grid-cols-2">

            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Thời gian hợp đồng
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">

                <span>
                  {formatDate(
                    contract.startDate
                  )}
                </span>

                <span className="text-slate-300">
                  →
                </span>

                <span className="font-semibold">
                  {formatDate(
                    contract.endDate
                  )}
                </span>

              </div>

            </div>


            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Dữ liệu thanh toán
              </p>

              <p className="mt-2 text-sm text-slate-700">
                {contract.invoiceCount || 0} hóa đơn
                {' · '}
                <span
                  className={
                    contract.overdueInvoiceCount > 0
                      ? 'font-semibold text-rose-600'
                      : 'font-semibold text-emerald-600'
                  }
                >
                  {contract.overdueInvoiceCount || 0} quá hạn
                </span>
              </p>

            </div>

          </div>


          {/* Reasons */}
          <div className="mt-4">

            <p className="text-sm font-bold text-slate-900">
              Lý do chấm điểm
            </p>

            <div className="mt-2 space-y-2">

              {(contract.reasons || []).map(
                (reason, index) => (
                  <div
                    key={`${contract.contractId}-${index}`}
                    className="flex items-start gap-2 text-sm text-slate-600"
                  >

                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />

                    <span>
                      {reason}
                    </span>

                  </div>
                )
              )}

            </div>

          </div>


          {/* Recommendation */}
          <div className="mt-4 rounded-xl border border-[#d9e8e3] bg-[#f5faf8] p-4">

            <p className="text-xs font-bold uppercase tracking-wide text-[#635bff]">
              Khuyến nghị
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-700">
              {contract.recommendation}
            </p>

          </div>

        </div>


        {/* SCORE */}
        <div className="xl:w-[190px]">

          <div
            className={`rounded-2xl border p-5 text-center ${riskStyle.container}`}
          >

            <p className={`text-xs font-bold uppercase tracking-wide ${riskStyle.text}`}>
              Risk Score
            </p>

            <p className={`mt-2 text-4xl font-black ${riskStyle.value}`}>
              {contract.riskScore}
            </p>

            <p className={`mt-1 text-xs ${riskStyle.description}`}>
              / 100 điểm
            </p>


            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">

              <div
                className={`h-full rounded-full ${riskStyle.bar}`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      contract.riskScore || 0
                    )
                  )}%`
                }}
              />

            </div>


            <p className={`mt-3 text-sm font-bold ${riskStyle.value}`}>
              {getRiskLabel(
                contract.riskLevel
              )}
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({
  icon: Icon,
  label,
  value
}) {
  return (
    <div className="flex items-start gap-3">

      <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
        <Icon size={16} />
      </div>

      <div className="min-w-0">

        <p className="text-xs text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
          {value}
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   HELPERS
========================================================= */

function getRiskLabel(level) {
  switch (level) {
    case 'HIGH':
      return 'Rủi ro cao';

    case 'MEDIUM':
      return 'Rủi ro trung bình';

    case 'LOW':
      return 'Rủi ro thấp';

    default:
      return 'Chưa xác định';
  }
}


function getRiskStyle(level) {
  switch (level) {
    case 'HIGH':
      return {
        container:
          'border-rose-200 bg-rose-50',
        badge:
          'bg-rose-100 text-rose-700',
        text:
          'text-rose-700',
        value:
          'text-rose-700',
        description:
          'text-rose-500',
        icon:
          'bg-rose-100 text-rose-600',
        bar:
          'bg-rose-500'
      };

    case 'MEDIUM':
      return {
        container:
          'border-amber-200 bg-amber-50',
        badge:
          'bg-amber-100 text-amber-700',
        text:
          'text-amber-700',
        value:
          'text-amber-700',
        description:
          'text-amber-600',
        icon:
          'bg-amber-100 text-amber-600',
        bar:
          'bg-amber-500'
      };

    case 'LOW':
      return {
        container:
          'border-emerald-200 bg-emerald-50',
        badge:
          'bg-emerald-100 text-emerald-700',
        text:
          'text-emerald-700',
        value:
          'text-emerald-700',
        description:
          'text-emerald-600',
        icon:
          'bg-emerald-100 text-emerald-600',
        bar:
          'bg-emerald-500'
      };

    default:
      return {
        container:
          'border-slate-200 bg-slate-50',
        badge:
          'bg-slate-100 text-slate-700',
        text:
          'text-slate-700',
        value:
          'text-slate-700',
        description:
          'text-slate-500',
        icon:
          'bg-slate-100 text-slate-600',
        bar:
          'bg-slate-500'
      };
  }
}


function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(
    date.getTime()
  )) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'vi-VN'
  ).format(date);
}