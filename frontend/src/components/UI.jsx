// src/components/UI.jsx
import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';

function cls(...items) {
  return items.filter(Boolean).join(" ");
}

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </div>
  );
}

export function Button({ 
  children, 
  variant = "primary", 
  size = "md", 
  className = "", 
  ...props 
}) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

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
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size] || sizeClasses.md} ${styles[variant] || styles.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export const Input = memo(({ 
  icon: Icon, 
  right, 
  className = "", 
  error,
  errorMessage,
  ...props 
}) => {
  return (
    <div className="w-full">
      <div className={`flex items-center gap-2 rounded-xl border ${
        error ? 'border-rose-300 focus-within:border-rose-500' : 'border-slate-200'
      } bg-white px-3 py-2.5 shadow-sm focus-within:border-[#1f4f46] ${className}`}>
        {Icon && <Icon size={16} className={error ? 'text-rose-400' : 'text-slate-400'} />}
        <input className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" {...props} />
        {right}
      </div>
      {error && errorMessage && (
        <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle size={12} />
          {errorMessage}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export const SelectInput = memo(({ className = "", error, errorMessage, ...props }) => {
  return (
    <div className="w-full">
      <select
        className={`w-full rounded-xl border ${
          error ? 'border-rose-300 focus-within:border-rose-500' : 'border-slate-200'
        } bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#1f4f46] ${className}`}
        {...props}
      />
      {error && errorMessage && (
        <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle size={12} />
          {errorMessage}
        </p>
      )}
    </div>
  );
});

SelectInput.displayName = 'SelectInput';

export function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-rose-200 bg-rose-50 text-rose-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    purple: "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

export function Modal({ open, title, description, children, onClose, size = "default", backdropClassName, backdropBlur = true }) {
  const sizeClasses = {
    default: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    sm: "max-w-md"
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center ${backdropClassName || 'bg-slate-950/45'} p-4 ${backdropBlur ? 'backdrop-blur-sm' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 12 }}
            className={`w-full ${sizeClasses[size] || sizeClasses.default} flex max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl`}
          >
            <div className="flex flex-shrink-0 items-start justify-between border-b border-slate-200 p-6">
              <div>
                <h3 className="text-xl font-bold text-slate-950">{title}</h3>
                {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function StatCard({ icon: Icon, label, value, hint, trend }) {
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
            {Icon && <Icon size={20} />}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}