// src/components/ResidenceHistory.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, Calendar, Home, Building2, Users, RefreshCw,
  CheckCircle2, X, ArrowRight, MapPin, FileText,
  ChevronRight, ChevronDown
} from 'lucide-react';
import { residentAPI } from '../api';
import { Card, Button, Input, Badge } from './UI';
import { formatDate } from '../utils/formatters';

export default function ResidenceHistory({ residentId, flash }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (residentId) {
      fetchHistory();
    }
  }, [residentId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await residentAPI.getResidenceHistory(residentId);
      const data = res?.data || res || [];
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching residence history:', error);
      if (flash) flash('❌ Không thể tải lịch sử cư trú');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Đang ở': { tone: 'green', label: 'Đang ở' },
      'Đã rời': { tone: 'red', label: 'Đã rời' },
      'Tạm vắng': { tone: 'amber', label: 'Tạm vắng' },
      'Chuyển đi': { tone: 'red', label: 'Chuyển đi' },
      'Hiệu lực': { tone: 'green', label: 'Hiệu lực' },
      'Hết hạn': { tone: 'red', label: 'Hết hạn' },
    };
    return statusMap[status] || { tone: 'slate', label: status || 'Chưa xác định' };
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
        <p className="mt-3 font-bold text-slate-900">Đang tải lịch sử cư trú...</p>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-[#eef5f2] p-3 text-[#1f4f46]">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-950">Lịch sử cư trú</h3>
            <p className="text-sm text-slate-500">
              Lịch sử các căn hộ đã từng ở ({history.length} lần)
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <Home size={48} className="text-slate-300 mx-auto" />
            <h4 className="mt-3 font-bold text-slate-900">Chưa có lịch sử cư trú</h4>
            <p className="text-sm text-slate-500">Cư dân chưa từng đăng ký căn hộ nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => {
              const status = getStatusBadge(item.Status);
              const isExpanded = expandedItems[item.HistoryID || item.id || index];
              
              return (
                <div
                  key={item.HistoryID || item.id || index}
                  className="rounded-xl border border-slate-200 overflow-hidden hover:border-[#1f4f46]/30 transition"
                >
                  <div
                    className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50 transition"
                    onClick={() => toggleExpand(item.HistoryID || item.id || index)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef5f2] text-[#1f4f46]">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-950">
                            {item.ApartmentCode || item.apartmentCode}
                          </h4>
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span>{item.BuildingName || item.buildingName}</span>
                          <span>•</span>
                          <span>Tầng {item.FloorNumber || item.floorNumber}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(item.StartDate || item.startDate)}
                            <ArrowRight size={12} />
                            {formatDate(item.EndDate || item.endDate) || 'Đang ở'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-200 p-4 bg-slate-50"
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Thông tin hợp đồng</p>
                          <div className="mt-2 space-y-1 text-sm text-slate-600">
                            <p>Số hợp đồng: <span className="font-medium text-slate-900">{item.ContractNumber || 'N/A'}</span></p>
                            <p>Chủ hộ: <span className="font-medium text-slate-900">{item.OwnerName || 'N/A'}</span></p>
                            <p>Giá thuê: <span className="font-medium text-slate-900">{item.Rent ? item.Rent.toLocaleString() + ' ₫' : 'N/A'}</span></p>
                            <p>Tiền cọc: <span className="font-medium text-slate-900">{item.Deposit ? item.Deposit.toLocaleString() + ' ₫' : 'N/A'}</span></p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Thông tin cư trú</p>
                          <div className="mt-2 space-y-1 text-sm text-slate-600">
                            <p>Ngày chuyển vào: <span className="font-medium text-slate-900">{formatDate(item.MoveInDate || item.startDate)}</span></p>
                            <p>Ngày chuyển đi: <span className="font-medium text-slate-900">{formatDate(item.MoveOutDate || item.endDate) || 'Đang ở'}</span></p>
                            <p>Loại hình: <span className="font-medium text-slate-900">{item.ResidenceType || 'Thuê'}</span></p>
                            <p>Quan hệ: <span className="font-medium text-slate-900">{item.Relationship || 'Chủ hộ'}</span></p>
                          </div>
                        </div>
                      </div>

                      {item.Notes && (
                        <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">
                          <p className="text-slate-500">Ghi chú:</p>
                          <p className="mt-1 text-slate-900">{item.Notes}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </motion.div>
  );
}