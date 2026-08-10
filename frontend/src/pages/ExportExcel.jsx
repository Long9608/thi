// src/pages/ExportExcel.jsx
import React, { useState, useCallback } from 'react';
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
import { apartmentAPI, residentAPI, invoiceAPI, serviceAPI } from '../api';

export default function ExportExcel({ flash }) {
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const exportOptions = [
    { id: 'all', label: 'Tất cả dữ liệu', icon: FileText },
    { id: 'apartments', label: 'Căn hộ', icon: Building2 },
    { id: 'residents', label: 'Cư dân', icon: Users },
    { id: 'invoices', label: 'Hóa đơn', icon: CreditCard },
    { id: 'services', label: 'Dịch vụ', icon: Wrench }
  ];

  // Hàm lấy dữ liệu thật từ API
  const fetchDataForExport = useCallback(async (type) => {
    try {
      let data = [];
      
      switch (type) {
        case 'apartments':
          const aptRes = await apartmentAPI.getAll('', '', 1, 999);
          data = aptRes?.data || [];
          return data.map(a => ({
            'Mã căn hộ': a.ApartmentCode,
            'Tòa nhà': a.BuildingName,
            'Tầng': a.FloorNumber,
            'Diện tích (m²)': a.Area,
            'Trạng thái': a.Status,
            'Cư dân': a.CurrentResidents || 'Trống',
            'Giá thuê': a.CurrentRent ? money(a.CurrentRent) : '0'
          }));
          
        case 'residents':
          const resRes = await residentAPI.getAll('', 1, 999);
          data = resRes?.data || [];
          return data.map(r => ({
            'Mã cư dân': r.ResidentID,
            'Họ tên': r.FullName,
            'Số điện thoại': r.Phone,
            'Email': r.Email,
            'Căn hộ': r.ApartmentCode || 'Chưa có',
            'CCCD': r.IdentityNumber || 'Chưa có',
            'Trạng thái': r.Status === 1 ? 'Đang ở' : 'Đã rời'
          }));
          
        case 'invoices':
          const invRes = await invoiceAPI.getAll('', '', '', 1, 999);
          data = invRes?.data || [];
          return data.map(i => ({
            'Căn hộ': i.ApartmentCode,
            'Chủ hộ': i.OwnerName,
            'Tháng': `${i.InvoiceMonth}/${i.InvoiceYear}`,
            'Tổng tiền': money(i.TotalAmount || 0),
            'Trạng thái': i.InvoiceStatus || 'Chưa xác định'
          }));
          
        case 'services':
          const svcRes = await serviceAPI.getAll('', '');
          data = svcRes?.data || [];
          return data.map(s => ({
            'Dịch vụ': s.ServiceName,
            'Danh mục': s.CategoryName,
            'Đơn giá': money(s.Price || 0),
            'Đơn vị': s.Unit || 'Tháng',
            'Trạng thái': s.Status === 1 ? 'Hoạt động' : 'Tạm dừng',
            'Lượt đăng ký': s.ActiveRegistrations || 0
          }));
          
        case 'all':
        default:
          // Lấy tất cả dữ liệu
          const [apts, ress, invs] = await Promise.all([
            apartmentAPI.getAll('', '', 1, 999),
            residentAPI.getAll('', 1, 999),
            invoiceAPI.getAll('', '', '', 1, 999)
          ]);
          
          return {
            apartments: (apts?.data || []).map(a => ({
              'Mã căn hộ': a.ApartmentCode,
              'Tòa nhà': a.BuildingName,
              'Trạng thái': a.Status,
              'Cư dân': a.CurrentResidents || 'Trống'
            })),
            residents: (ress?.data || []).map(r => ({
              'Họ tên': r.FullName,
              'Số điện thoại': r.Phone,
              'Căn hộ': r.ApartmentCode || 'Chưa có'
            })),
            invoices: (invs?.data || []).map(i => ({
              'Căn hộ': i.ApartmentCode,
              'Tổng tiền': money(i.TotalAmount || 0),
              'Trạng thái': i.InvoiceStatus || 'Chưa xác định'
            }))
          };
      }
    } catch (error) {
      console.error('Error fetching data for export:', error);
      throw error;
    }
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);
    
    try {
      // Lấy dữ liệu
      const data = await fetchDataForExport(exportType);
      
      // Tạo workbook
      const workbook = XLSX.utils.book_new();
      
      if (exportType === 'all' && typeof data === 'object' && !Array.isArray(data)) {
        // Xuất nhiều sheet
        Object.entries(data).forEach(([sheetName, sheetData]) => {
          if (sheetData.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.charAt(0).toUpperCase() + sheetName.slice(1));
          }
        });
      } else if (Array.isArray(data) && data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dữ liệu');
      } else {
        flash('⚠️ Không có dữ liệu để xuất');
        setExporting(false);
        return;
      }
      
      // Tạo file name
      const fileName = `bao-cao-${exportType}-${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      // Download
      XLSX.writeFile(workbook, fileName);
      
      setProgress(100);
      if (flash) flash(`✅ Đã xuất file Excel: ${fileName}`);
      
    } catch (error) {
      console.error('Export error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Có lỗi khi xuất báo cáo'));
    } finally {
      setExporting(false);
    }
  };

  const handlePreview = async () => {
    try {
      setLoading(true);
      const data = await fetchDataForExport(exportType);
      
      if (exportType === 'all' && typeof data === 'object' && !Array.isArray(data)) {
        // Lấy sheet đầu tiên để preview
        const firstKey = Object.keys(data)[0];
        setPreviewData(data[firstKey] || []);
      } else if (Array.isArray(data)) {
        setPreviewData(data);
      } else {
        setPreviewData([]);
      }
      
      setPreviewOpen(true);
    } catch (error) {
      console.error('Preview error:', error);
      if (flash) flash('❌ Không thể xem trước dữ liệu');
    } finally {
      setLoading(false);
    }
  };

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
                <span className="font-bold text-slate-950">Đang tải...</span>
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

            <div className="flex gap-2">
              <Button 
                className="flex-1" 
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
                    <Download size={16} />
                    Xuất Excel
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={handlePreview} disabled={loading}>
                <Eye size={16} /> Xem trước
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        title="Xem trước dữ liệu"
        description={`Dữ liệu ${exportOptions.find(o => o.id === exportType)?.label || ''}`}
        onClose={() => setPreviewOpen(false)}
        size="lg"
      >
        <div className="overflow-x-auto max-h-96">
          {previewData.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText size={48} className="mx-auto mb-3 text-slate-300" />
              <p>Không có dữ liệu để hiển thị</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 sticky top-0">
                <tr>
                  {Object.keys(previewData[0] || {}).map((key) => (
                    <th key={key} className="px-3 py-2 font-semibold">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.slice(0, 20).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {Object.values(row).map((value, colIdx) => (
                      <td key={colIdx} className="px-3 py-2 text-slate-600">
                        {typeof value === 'string' && value.length > 50 
                          ? value.substring(0, 50) + '...' 
                          : value || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {previewData.length > 20 && (
            <p className="text-sm text-slate-500 mt-3">
              Hiển thị 20/{previewData.length} bản ghi
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => setPreviewOpen(false)}>Đóng</Button>
        </div>
      </Modal>

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