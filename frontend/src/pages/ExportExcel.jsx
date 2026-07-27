// src/pages/ExportExcel.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet, Download, RefreshCw,
  CheckCircle2, AlertCircle, FileText,
  Building2, Users, CreditCard, Wrench,
  Calendar, Filter, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money } from '../utils/formatters';

export default function ExportExcel({ flash }) {
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Dữ liệu mẫu
  const sampleData = [
    { id: 1, apartment: 'A-1201', owner: 'Nguyễn Minh Anh', rent: 15000000, status: 'Đang ở' },
    { id: 2, apartment: 'B-0805', owner: 'Trần Quốc Bảo', rent: 18000000, status: 'Đang ở' },
    { id: 3, apartment: 'A-0903', owner: 'Lê Hoàng Yến', rent: 13500000, status: 'Đang thuê' }
  ];

  const handleExport = () => {
    setExporting(true);
    setProgress(0);

    // Simulate export progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setExporting(false);
          
          // Create Excel file
          const worksheet = XLSX.utils.json_to_sheet(sampleData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo');
          
          // Generate file name
          const fileName = `bao-cao-${exportType}-${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`;
          
          // Download
          XLSX.writeFile(workbook, fileName);
          
          if (flash) flash(`✅ Đã xuất file Excel: ${fileName}`);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const exportOptions = [
    { id: 'all', label: 'Tất cả dữ liệu', icon: FileText },
    { id: 'apartments', label: 'Căn hộ', icon: Building2 },
    { id: 'residents', label: 'Cư dân', icon: Users },
    { id: 'invoices', label: 'Hóa đơn', icon: CreditCard },
    { id: 'services', label: 'Dịch vụ', icon: Wrench }
  ];

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Xuất báo cáo Excel</h3>
            <p className="text-sm text-slate-500">Xuất dữ liệu ra file Excel (.xlsx)</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h4 className="font-bold text-slate-950 mb-4">1. Chọn loại báo cáo</h4>
          <div className="space-y-2">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = exportType === option.id;
              return (
                <button
                  key={option.id}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 transition ${
                    isSelected ? 'border-[#1f4f46] bg-[#eef5f2]' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setExportType(option.id)}
                >
                  <Icon size={20} className={isSelected ? 'text-[#1f4f46]' : 'text-slate-400'} />
                  <span className={`font-semibold ${isSelected ? 'text-[#1f4f46]' : 'text-slate-700'}`}>
                    {option.label}
                  </span>
                  {isSelected && <CheckCircle2 size={16} className="ml-auto text-[#1f4f46]" />}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-bold text-slate-950 mb-4">2. Tùy chọn xuất</h4>
          
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Khoảng thời gian</label>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  placeholder="Từ ngày"
                />
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  placeholder="Đến ngày"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Định dạng</label>
              <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]">
                <option>.xlsx (Excel 2007+)</option>
                <option>.xls (Excel 97-2003)</option>
                <option>.csv</option>
              </select>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Số bản ghi sẽ xuất</span>
                <span className="font-bold text-slate-950">{sampleData.length} bản ghi</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-500">Dung lượng ước tính</span>
                <span className="font-bold text-slate-950">~15 KB</span>
              </div>
            </div>

            {exporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Đang xuất...</span>
                  <span className="font-bold text-[#1f4f46]">{progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#1f4f46] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={handleExport} 
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Đang xuất...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} />
                  Xuất Excel
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h4 className="font-bold text-slate-950 mb-3">📋 Hướng dẫn</h4>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f4f46] text-white text-xs font-bold">1</span>
            <span>Chọn loại báo cáo cần xuất</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f4f46] text-white text-xs font-bold">2</span>
            <span>Chọn khoảng thời gian (tùy chọn)</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f4f46] text-white text-xs font-bold">3</span>
            <span>Nhấn "Xuất Excel" để tải file</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f4f46] text-white text-xs font-bold">4</span>
            <span>File sẽ được tải xuống tự động</span>
          </div>
        </div>
      </Card>
    </div>
  );
}