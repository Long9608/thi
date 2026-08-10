// src/pages/FeedbackManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, Plus, Search, Download, Edit, Trash2, Eye,
  RefreshCw, CheckCircle2, X, AlertCircle,
  Star, StarHalf, User, Home, Calendar, Clock,
  Send, Reply, Mail, Phone, FileText
} from 'lucide-react';
import { feedbackAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, formatDateTime, getInitials, timeAgo } from '../utils/formatters';

export default function FeedbackManagement({ flash }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [replyForm, setReplyForm] = useState({ reply: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await feedbackAPI.getAll('', '', '', page, 999);
      const data = res?.data || res || [];
      const normalized = Array.isArray(data) ? data.map(item => ({
        id: item.FeedbackID,
        residentName: item.ResidentName,
        apartmentCode: item.ApartmentCode,
        title: item.Title,
        content: item.Content,
        rating: item.Rating,
        reply: item.Reply,
        createdAt: item.CreatedDate,
        status: item.Reply ? 'replied' : 'pending'
      })) : [];
      setFeedbacks(normalized);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải dữ liệu phản ánh'));
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  }, [page, flash]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyForm.reply.trim()) {
      flash('⚠️ Vui lòng nhập nội dung phản hồi');
      return;
    }

    setLoading(true);
    try {
      await feedbackAPI.reply(selectedFeedback.id, replyForm.reply);
      const updated = feedbacks.map(f => 
        f.id === selectedFeedback.id 
          ? { ...f, reply: replyForm.reply, status: 'replied' }
          : f
      );
      setFeedbacks(updated);
      setModalOpen(false);
      setReplyForm({ reply: '' });
      if (flash) flash('✅ Đã gửi phản hồi thành công!');
    } catch (error) {
      console.error('Reply error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể gửi phản hồi'));
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    let filtered = feedbacks;
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(f =>
        f.residentName.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.content.toLowerCase().includes(q)
      );
    }

    if (ratingFilter) {
      filtered = filtered.filter(f => f.rating === parseInt(ratingFilter));
    }

    return filtered;
  }, [feedbacks, search, ratingFilter]);

  const stats = useMemo(() => {
    const total = feedbacks.length;
    const pending = feedbacks.filter(f => f.status === 'pending').length;
    const replied = feedbacks.filter(f => f.status === 'replied').length;
    const avgRating = total > 0 
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1)
      : 0;
    return { total, pending, replied, avgRating };
  }, [feedbacks]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
      />
    ));
  };

  const getStatusBadge = (status) => {
    return status === 'replied' 
      ? <Badge tone="green">Đã phản hồi</Badge>
      : <Badge tone="amber">Chờ phản hồi</Badge>;
  };

  const openViewModal = (feedback) => {
    setSelectedFeedback(feedback);
    setReplyForm({ reply: feedback.reply || '' });
    setModalMode('view');
    setModalOpen(true);
  };

  const openReplyModal = (feedback) => {
    setSelectedFeedback(feedback);
    setReplyForm({ reply: feedback.reply || '' });
    setModalMode('reply');
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Quản lý phản ánh</h3>
            <p className="text-sm text-slate-500">
              Quản lý phản ánh và góp ý từ cư dân.
              <span className="ml-2 text-amber-600 font-semibold">
                {stats.pending} phản ánh chưa phản hồi
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-48"
            />
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả đánh giá</option>
              <option value="5">5 sao</option>
              <option value="4">4 sao</option>
              <option value="3">3 sao</option>
              <option value="2">2 sao</option>
              <option value="1">1 sao</option>
            </select>
            <Button variant="secondary">
              <Download size={16} /> Xuất Excel
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={MessageSquare} label="Tổng phản ánh" value={stats.total} hint="Đã nhận" />
        <StatCard icon={Clock} label="Chờ phản hồi" value={stats.pending} hint="Chưa xử lý" />
        <StatCard icon={CheckCircle2} label="Đã phản hồi" value={stats.replied} hint="Đã xử lý" />
        <StatCard icon={Star} label="Đánh giá TB" value={stats.avgRating} hint="Trên 5 sao" />
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải dữ liệu...</p>
        </Card>
      ) : filteredData.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có phản ánh</h3>
          <p className="text-sm text-slate-500">Chưa có phản ánh nào từ cư dân</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredData.map((feedback) => (
            <Card key={feedback.id} className="group hover:border-[#1f4f46]/30 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {renderStars(feedback.rating)}
                      {getStatusBadge(feedback.status)}
                    </div>
                    <h3 className="font-bold text-slate-950 group-hover:text-[#1f4f46]">
                      {feedback.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {feedback.residentName} · {feedback.apartmentCode}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-600 line-clamp-3">
                  {feedback.content}
                </p>

                {feedback.reply && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    <span className="font-semibold text-[#1f4f46]">Phản hồi:</span> {feedback.reply}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>{formatDateTime(feedback.createdAt)}</span>
                  <span>{timeAgo(feedback.createdAt)}</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openViewModal(feedback)}>
                    <Eye size={14} /> Xem
                  </Button>
                  {feedback.status === 'pending' && (
                    <Button className="flex-1" onClick={() => openReplyModal(feedback)}>
                      <Reply size={14} /> Phản hồi
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={modalMode === 'reply' ? 'Phản hồi ý kiến' : 'Chi tiết phản ánh'}
        description={modalMode === 'reply' ? `Phản hồi ý kiến của ${selectedFeedback?.residentName}` : 'Xem chi tiết phản ánh'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {selectedFeedback && modalMode === 'view' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedFeedback.rating)}
                  {getStatusBadge(selectedFeedback.status)}
                </div>
                <h3 className="text-2xl font-black text-slate-950">{selectedFeedback.title}</h3>
                <p className="text-sm text-slate-500">
                  {selectedFeedback.residentName} · {selectedFeedback.apartmentCode}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-500">Nội dung</p>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                {selectedFeedback.content}
              </p>
            </div>

            {selectedFeedback.reply && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-700">Phản hồi</p>
                <p className="mt-2 text-sm text-emerald-800">
                  {selectedFeedback.reply}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {selectedFeedback.status === 'pending' && (
                <Button onClick={() => {
                  setModalMode('reply');
                  setReplyForm({ reply: selectedFeedback.reply || '' });
                }}>
                  <Reply size={16} /> Phản hồi
                </Button>
              )}
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        )}

        {modalMode === 'reply' && selectedFeedback && (
          <form onSubmit={handleReply} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-700">Phản ánh của {selectedFeedback.residentName}</p>
              <p className="text-sm text-slate-600">{selectedFeedback.content}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Nội dung phản hồi *</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#1f4f46] min-h-[120px]"
                value={replyForm.reply}
                onChange={(e) => setReplyForm({ reply: e.target.value })}
                placeholder="Nhập phản hồi của bạn..."
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                Gửi phản hồi
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}