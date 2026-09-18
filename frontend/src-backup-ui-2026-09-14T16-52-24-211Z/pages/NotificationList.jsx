// src/pages/NotificationList.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Search, Download, Eye, Trash2,
  RefreshCw, CheckCircle2, X, AlertCircle,
  Calendar, Clock, User, Home, Mail,
  Send, Filter, MoreHorizontal, FileText,
  Users, Building2, Check, MessageSquare
} from 'lucide-react';
import { notificationAPI } from '../api';
import { Card, Button, Input, Badge, Modal, StatCard } from '../components/UI';
import { formatDate, formatDateTime, getInitials, timeAgo } from '../utils/formatters';

export default function NotificationList({ flash }) {
  // State
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch data
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getAll(statusFilter, page, 20);
      console.log('📊 Notifications:', res);
      
      const data = res?.data || res || [];
      setNotifications(Array.isArray(data) ? data : []);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể tải danh sách thông báo'));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, flash]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res?.data?.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Handlers
  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      if (flash) flash('✅ Đã đánh dấu đã đọc');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Mark as read error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể đánh dấu đã đọc'));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      if (flash) flash('✅ Đã đánh dấu tất cả đã đọc');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Mark all as read error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể đánh dấu tất cả đã đọc'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa thông báo này?')) return;
    try {
      await notificationAPI.delete(id);
      if (flash) flash('✅ Xóa thông báo thành công!');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Delete error:', error);
      if (flash) flash('❌ ' + (error.response?.data?.message || 'Không thể xóa thông báo'));
    }
  };

  const openViewModal = (notification) => {
    setSelectedNotification(notification);
    setModalOpen(true);
    // Mark as read when viewed
    if (!notification.IsRead) {
      handleMarkAsRead(notification.NotificationID);
    }
  };

  // Filtered data
  const filteredNotifications = useMemo(() => {
    if (!search) return notifications;
    const q = search.toLowerCase();
    return notifications.filter(n =>
      (n.Title || '').toLowerCase().includes(q) ||
      (n.Content || '').toLowerCase().includes(q) ||
      (n.SenderName || '').toLowerCase().includes(q)
    );
  }, [notifications, search]);

  // Stats
  const stats = useMemo(() => {
    const total = notifications.length;
    const read = notifications.filter(n => n.IsRead === 1 || n.IsRead === true).length;
    const unread = notifications.filter(n => n.IsRead === 0 || n.IsRead === false).length;
    return { total, read, unread };
  }, [notifications]);

  const getStatusBadge = (notification) => {
    const isRead = notification.IsRead === 1 || notification.IsRead === true;
    return isRead ? 
      <Badge tone="slate">Đã đọc</Badge> : 
      <Badge tone="blue">Chưa đọc</Badge>;
  };

  const getScopeBadge = (scope) => {
    const map = {
      'ALL': { tone: 'purple', label: 'Tất cả' },
      'BUILDING': { tone: 'blue', label: 'Tòa nhà' },
      'USER': { tone: 'green', label: 'Cá nhân' }
    };
    const info = map[scope] || { tone: 'slate', label: scope || 'Tất cả' };
    return <Badge tone={info.tone}>{info.label}</Badge>;
  };

  const getScopeIcon = (scope) => {
    switch(scope) {
      case 'ALL': return <Users size={14} />;
      case 'BUILDING': return <Building2 size={14} />;
      case 'USER': return <User size={14} />;
      default: return <Bell size={14} />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">Danh sách thông báo</h3>
            <p className="text-sm text-slate-500">
              Quản lý thông báo đã gửi.
              <span className="ml-2 text-blue-600 font-semibold">
                {stats.unread} thông báo chưa đọc
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm thông báo..."
              className="w-48"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1f4f46]"
            >
              <option value="">Tất cả</option>
              <option value="0">Chưa đọc</option>
              <option value="1">Đã đọc</option>
            </select>
            <Button variant="secondary" onClick={handleMarkAllAsRead}>
              <Check size={16} /> Đánh dấu đã đọc
            </Button>
            <Button variant="secondary" onClick={fetchNotifications} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Bell} label="Tổng thông báo" value={stats.total} hint="Đã gửi" />
        <StatCard icon={Mail} label="Đã đọc" value={stats.read} hint="Đã xem" />
        <StatCard icon={AlertCircle} label="Chưa đọc" value={stats.unread} hint="Cần xem" />
      </div>

      {/* Notification List */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw size={32} className="animate-spin text-[#1f4f46] mx-auto" />
          <p className="mt-3 font-bold text-slate-900">Đang tải danh sách thông báo...</p>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell size={48} className="text-slate-300 mx-auto" />
          <h3 className="mt-3 text-xl font-bold text-slate-900">Chưa có thông báo</h3>
          <p className="text-sm text-slate-500">Chưa có thông báo nào được gửi</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card 
              key={notification.NotificationID} 
              className={`group hover:border-[#1f4f46]/30 transition-all cursor-pointer ${
                !notification.IsRead ? 'border-blue-200 bg-blue-50/30' : ''
              }`}
              onClick={() => openViewModal(notification)}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      !notification.IsRead ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {getScopeIcon(notification.TargetScope)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {getStatusBadge(notification)}
                          {getScopeBadge(notification.TargetScope)}
                          <span className="text-xs text-slate-400">
                            {formatDateTime(notification.CreatedDate)}
                          </span>
                        </div>
                        <h3 className={`font-bold text-slate-950 group-hover:text-[#1f4f46] transition ${
                          !notification.IsRead ? 'text-[#1f4f46]' : ''
                        }`}>
                          {notification.Title}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {notification.Content}
                        </p>
                        {notification.SenderName && (
                          <p className="text-xs text-slate-400 mt-2">
                            Người gửi: {notification.SenderName}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!notification.IsRead && (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.NotificationID);
                            }}
                          >
                            <Check size={14} /> Đọc
                          </Button>
                        )}
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.NotificationID);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {[...Array(Math.min(totalPages, 10))].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                page === i + 1
                  ? 'bg-[#1f4f46] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modal - View Detail */}
      <Modal
        open={modalOpen}
        title="Chi tiết thông báo"
        description="Xem nội dung thông báo"
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        {selectedNotification && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(selectedNotification)}
                  {getScopeBadge(selectedNotification.TargetScope)}
                </div>
                <h3 className="text-2xl font-black text-slate-950">
                  {selectedNotification.Title}
                </h3>
                <p className="text-sm text-slate-500">
                  {formatDateTime(selectedNotification.CreatedDate)}
                  {selectedNotification.SenderName && ` · Người gửi: ${selectedNotification.SenderName}`}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-500">Nội dung</p>
              <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">
                {selectedNotification.Content}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thông tin gửi</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Đối tượng:</span> {
                    selectedNotification.TargetScope === 'ALL' ? 'Tất cả cư dân' :
                    selectedNotification.TargetScope === 'BUILDING' ? 'Cư dân theo tòa nhà' :
                    'Cá nhân'
                  }</div>
                  <div><span className="text-slate-500">Ngày gửi:</span> {formatDateTime(selectedNotification.CreatedDate)}</div>
                  <div><span className="text-slate-500">Trạng thái:</span> {
                    selectedNotification.IsRead ? 'Đã đọc' : 'Chưa đọc'
                  }</div>
                  {selectedNotification.ReadDate && (
                    <div><span className="text-slate-500">Đọc lúc:</span> {formatDateTime(selectedNotification.ReadDate)}</div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-500">Thống kê</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div><span className="text-slate-500">Tổng người nhận:</span> {selectedNotification.RecipientsCount || 0}</div>
                  <div><span className="text-slate-500">Đã đọc:</span> {selectedNotification.ReadCount || 0}</div>
                  <div><span className="text-slate-500">Chưa đọc:</span> {(selectedNotification.RecipientsCount || 0) - (selectedNotification.ReadCount || 0)}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}