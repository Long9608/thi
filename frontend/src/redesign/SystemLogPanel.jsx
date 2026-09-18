import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { userAPI } from '../api';

function statusStyle(action = '') {
  const value = action.toUpperCase();
  if (value === 'INSERT' || value === 'CREATE') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value === 'UPDATE') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (value === 'DELETE') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function normalizeRows(response) {
  const value = response?.data?.items
    || response?.data?.data
    || response?.data
    || response?.recordset
    || [];
  return Array.isArray(value) ? value : [];
}

export default function SystemLogPanel({ flash }) {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await userAPI.getAuditLogs({ page: 1, limit: 200 });
      setRows(normalizeRows(response));
    } catch (requestError) {
      setError(requestError?.message || 'Không thể tải nhật ký hệ thống.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi-VN');
    if (!keyword) return rows;
    return rows.filter((row) => Object.values(row).some((value) => (
      String(value ?? '').toLocaleLowerCase('vi-VN').includes(keyword)
    )));
  }, [query, rows]);

  const exportExcel = () => {
    if (!visibleRows.length) {
      flash?.('Không có dữ liệu nhật ký để xuất.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(visibleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'NhatKy');
    XLSX.writeFile(workbook, `nhat-ky-he-thong-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Lịch sử thao tác</h2>
          <p className="mt-1 text-sm text-slate-500">Dữ liệu lấy trực tiếp từ bảng AuditLog.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm trong nhật ký..."
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:w-64"
            />
          </label>
          <button type="button" onClick={load} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
          <button type="button" onClick={exportExcel} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700">
            <Download size={16} /> Xuất Excel
          </button>
        </div>
      </div>

      {error && <p className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Thời gian</th>
              <th className="px-5 py-3">Người dùng</th>
              <th className="px-5 py-3">Hành động</th>
              <th className="px-5 py-3">Bảng</th>
              <th className="px-5 py-3">Bản ghi</th>
              <th className="px-5 py-3">Địa chỉ IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  {Array.from({ length: 6 }).map((__, cellIndex) => (
                    <td key={cellIndex} className="px-5 py-4"><div className="h-4 rounded bg-slate-100" /></td>
                  ))}
                </tr>
              ))
            ) : visibleRows.length ? visibleRows.map((row, index) => {
              const timestamp = row.Timestamp || row.CreatedAt || row.CreatedDate;
              return (
                <tr key={row.AuditID || `${timestamp}-${index}`} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {timestamp ? new Date(timestamp).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{row.Username || row.UserName || 'System'}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle(row.Action)}`}>
                      {row.Action || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{row.TableName || '—'}</td>
                  <td className="px-5 py-4 text-slate-600">{row.RecordID || '—'}</td>
                  <td className="px-5 py-4 text-slate-500">{row.IPAddress || '—'}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="6" className="px-5 py-14 text-center text-sm text-slate-500">
                  Chưa có nhật ký phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
