// src/pages/ExportPDF.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Download, RefreshCw,
  CheckCircle2, AlertCircle, Printer,
  Building2, Users, CreditCard, Wrench,
  Calendar, Filter, Eye
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, money } from '../utils/formatters';

export default function ExportPDF({ flash }) {
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState('all');
  const [reportFormat, setReportFormat] = useState('standard');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleExport = () => {
    setExporting(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setExporting(false);
          setPreviewOpen(true);
          if (flash) flash('✅ Đã tạo báo cáo PDF thành công!');
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const reportOptions = [
    { id: 'all', label: 'Tất cả', icon: FileText },
    { id: 'apartments', label: 'Căn hộ', icon: Building2 },
    { id: 'residents', label: 'Cư dân', icon: Users },
    { id: 'invoices', label: 'Hóa đơn', icon: CreditCard },
    { id: 'services', label: 'Dịch vụ', icon: Wrench }
  ];

  const formatOptions = [
    { id: 'standard', label: 'Tiêu chuẩn', description: 'Định dạng A4' },
    { id: 'compact', label: 'Gọn nhẹ', description: 'Tiết kiệm giấy' },
    { id: 'detailed', label: 'Chi tiết', description: 'Đầy đủ thông tin' }
  ];

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Xuất báo cáo PDF</h3>
            <p className="text-sm text-slate-500">Xuất dữ liệu ra file PDF</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h4 className="font-bold text-slate-950 mb-4">1. Chọn loại báo cáo</h4>
          <div className="space-y-2">
            {reportOptions.map((option) => {
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
              <label className="mb-1 block text-sm font-semibold text-slate-700">Định dạng báo cáo</label>
              <div className="grid gap-2">
                {formatOptions.map((option) => {
                  const isSelected = reportFormat === option.id;
                  return (
                    <button
                      key={option.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                        isSelected ? 'border-[#1f4f46] bg-[#eef5f2]' : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setReportFormat(option.id)}
                    >
                      <div className="flex-1 text-left">
                        <p className={`font-semibold ${isSelected ? 'text-[#1f4f46]' : 'text-slate-700'}`}>
                          {option.label}
                        </p>
                        <p className="text-xs text-slate-500">{option.description}</p>
                      </div>
                      {isSelected && <CheckCircle2 size={16} className="text-[#1f4f46]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Số trang dự kiến</span>
                <span className="font-bold text-slate-950">~2-3 trang</span>
              </div>
            </div>

            {exporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Đang tạo báo cáo...</span>
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
                  Đang tạo...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Xuất PDF
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        title="Xem trước báo cáo PDF"
        description={`Báo cáo ${exportType} - ${formatDate(new Date(), 'dd/MM/yyyy')}`}
        onClose={() => setPreviewOpen(false)}
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-6 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Đức Vũ Tower</h3>
                <p className="text-sm text-slate-500">Báo cáo {exportType === 'all' ? 'tổng hợp' : exportType}</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>Ngày: {formatDate(new Date(), 'dd/MM/yyyy')}</p>
                <p>Mã báo cáo: BC-{Date.now().toString().slice(-8)}</p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-slate-600">Tổng số bản ghi</span>
                <span className="font-bold text-slate-950">150</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-slate-600">Khoảng thời gian</span>
                <span className="font-bold text-slate-950">
                  {dateRange.from || '01/01/2026'} - {dateRange.to || formatDate(new Date(), 'dd/MM/yyyy')}
                </span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-slate-600">Định dạng</span>
                <span className="font-bold text-slate-950">
                  {formatOptions.find(f => f.id === reportFormat)?.label || 'Tiêu chuẩn'}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
              <p>© 2026 Đức Vũ Tower - Báo cáo được tạo tự động</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>Đóng</Button>
            <Button>
              <Printer size={16} /> In báo cáo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}