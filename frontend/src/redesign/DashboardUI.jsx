import React from 'react';
import { ArrowRight, Inbox, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const tones = {
  blue: { icon: 'bg-blue-50 text-blue-600', line: 'from-blue-500 to-cyan-400' },
  cyan: { icon: 'bg-cyan-50 text-cyan-600', line: 'from-cyan-500 to-teal-400' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', line: 'from-emerald-500 to-teal-400' },
  amber: { icon: 'bg-amber-50 text-amber-600', line: 'from-amber-500 to-orange-400' },
  rose: { icon: 'bg-rose-50 text-rose-600', line: 'from-rose-500 to-pink-400' },
  violet: { icon: 'bg-violet-50 text-violet-600', line: 'from-violet-500 to-indigo-400' },
};

export function DashboardHero({ eyebrow = 'Đức Vũ Tower', title, description, actions = [], date }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1746a2] via-[#0878c9] to-[#02a8ba] p-6 text-white shadow-xl shadow-blue-900/15 sm:p-7">
      <div className="absolute -right-14 -top-24 h-72 w-72 rounded-full border border-white/15" />
      <div className="absolute right-28 top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10 grid gap-7 xl:grid-cols-[1fr_510px] xl:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold tracking-wide backdrop-blur">{eyebrow}</div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">{description}</p>
          {date && <p className="mt-4 text-xs capitalize text-white/65">{date}</p>}
        </div>
        {actions.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {actions.map((action) => <DashboardQuickAction key={action.label} {...action} />)}
          </div>
        )}
      </div>
    </section>
  );
}

export function DashboardStatCard({ icon: Icon, label, value, detail, tone = 'blue', loading = false }) {
  const style = tones[tone] || tones.blue;
  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${style.line}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold tracking-tight text-slate-950">{loading ? '...' : value}</p>
          {detail && <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>}
        </div>
        <span className={`rounded-xl p-3 ${style.icon}`}><Icon size={21} /></span>
      </div>
    </motion.article>
  );
}

export function DashboardQuickAction({ icon: Icon, label, description, onClick, tone = 'bg-white/10 text-white' }) {
  return (
    <button type="button" onClick={onClick} className="group flex min-w-0 items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-left text-white backdrop-blur transition hover:border-white/40 hover:bg-white/20">
      <span className={`rounded-lg p-2 ${tone}`}><Icon size={17} /></span>
      <span className="min-w-0"><span className="block truncate text-xs font-bold">{label}</span><span className="block truncate text-[10px] text-white/65">{description}</span></span>
      <ArrowRight size={14} className="ml-auto shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </button>
  );
}

export function DashboardSection({ title, description, action, children, className = '' }) {
  return <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}><header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4"><div className="min-w-0"><h2 className="truncate text-sm font-extrabold text-slate-900">{title}</h2>{description && <p className="mt-0.5 truncate text-xs text-slate-500">{description}</p>}</div>{action}</header>{children}</section>;
}

export function DashboardChartCard({ title, description, action, children, className }) {
  return <DashboardSection title={title} description={description} action={action} className={className}>{children}</DashboardSection>;
}

export function DashboardEmptyState({ title = 'Chưa có dữ liệu', text = 'Dữ liệu sẽ hiển thị khi hệ thống ghi nhận phát sinh.' }) {
  return <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center text-slate-400"><Inbox size={32} /><p className="mt-3 text-sm font-bold text-slate-600">{title}</p><p className="mt-1 max-w-xs text-xs leading-5">{text}</p></div>;
}

export function DashboardRefreshButton({ onClick, loading }) {
  return <button type="button" onClick={onClick} aria-label="Tải lại dashboard" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>;
}
