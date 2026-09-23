import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { itemIsAccessible, navigationGroups, pageMeta } from './navigation';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function getInitials(value = '') {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'DV';
  return words.slice(-2).map((word) => word[0]).join('').toUpperCase();
}

function Sidebar({
  activePage,
  canAccess,
  onNavigate,
  onLogout,
  user,
  onClose,
  audience = 'staff',
}) {
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const groups = useMemo(
    () => navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => itemIsAccessible(item, canAccess, audience)).map(item => audience === 'resident' ? { ...item, label: ({ buildings: 'Căn hộ của tôi', vehicles: 'Phương tiện của tôi', residents: 'Hồ sơ cư dân', 'contract-list': 'Hợp đồng của tôi', feedbacks: 'Phản ánh của tôi' })[item.id] || item.label } : item),
      }))
      .filter((group) => group.items.length > 0),
    [audience, canAccess],
  );

  const displayName = user?.name || user?.employee?.fullName || user?.username || 'Người dùng';
  const roleName = user?.roles?.[0] || user?.role || 'Nhân sự vận hành';

  const goTo = (pageId) => {
    onNavigate(pageId);
    onClose?.();
  };

  return (
    <aside className="flex h-full w-[276px] flex-col border-r border-slate-800 bg-[#0d1b33] text-white shadow-2xl shadow-slate-950/20">
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-950/30">
          <Building2 size={23} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold tracking-tight">ĐỨC VŨ TOWER</p>
          <p className="truncate text-[11px] text-slate-400">Căn hộ • Cư dân • Vận hành</p>
        </div>
        <button
          type="button"
          aria-label="Đóng menu"
          className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold">
            {getInitials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{displayName}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {roleName}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
        {groups.map((group) => {
          const hasActiveItem = group.items.some((item) => item.id === activePage);
          const collapsed = collapsedGroups[group.id] && !hasActiveItem;

          return (
            <div key={group.id} className="mb-4">
              <button
                type="button"
                className="mb-1.5 flex w-full items-center justify-between px-2 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"
                onClick={() => setCollapsedGroups((current) => ({
                  ...current,
                  [group.id]: !current[group.id],
                }))}
              >
                <span>{group.label}</span>
                {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </button>

              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = item.id === activePage;

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => goTo(item.id)}
                          className={cn(
                            'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition',
                            active
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                              : 'text-slate-300 hover:bg-white/[0.07] hover:text-white',
                          )}
                        >
                          <Icon
                            size={17}
                            className={active ? 'text-white' : 'text-slate-500 transition group-hover:text-cyan-300'}
                          />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-slate-400">
          <ShieldCheck size={15} className="text-emerald-400" />
          Phiên đăng nhập được bảo vệ
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
        >
          <LogOut size={16} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

export default function CondoShell({
  activePage,
  canAccess,
  children,
  loading = false,
  notificationCount = 0,
  onLogout,
  onNavigate,
  onRefresh,
  user,
  audience = 'staff',
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  const accessibleItems = useMemo(
    () => navigationGroups
      .flatMap((group) => group.items)
      .filter((item) => itemIsAccessible(item, canAccess, audience)),
    [audience, canAccess],
  );

  const searchResults = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi-VN');
    if (!keyword) return [];
    return accessibleItems
      .filter((item) => (
        item.label.toLocaleLowerCase('vi-VN').includes(keyword)
        || item.description?.toLocaleLowerCase('vi-VN').includes(keyword)
      ))
      .slice(0, 6);
  }, [accessibleItems, query]);

  const displayName = user?.name || user?.employee?.fullName || user?.username || 'Người dùng';
  const roleName = user?.roles?.[0] || user?.role || 'Nhân sự vận hành';
  const [title, description] = pageMeta[activePage] || ['Đức Vũ Tower', 'Hệ thống quản lý vận hành chung cư.'];
  const dateText = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());

  const chooseSearchResult = (pageId) => {
    onNavigate(pageId);
    setQuery('');
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-900">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar
          activePage={activePage}
          canAccess={canAccess}
          onLogout={onLogout}
          onNavigate={onNavigate}
          audience={audience}
          user={user}
        />
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Đóng menu"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -286 }}
              animate={{ x: 0 }}
              exit={{ x: -286 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative h-full w-[276px]"
            >
              <Sidebar
                activePage={activePage}
                canAccess={canAccess}
                onClose={() => setMobileMenuOpen(false)}
                onLogout={onLogout}
                onNavigate={onNavigate}
                audience={audience}
                user={user}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen lg:pl-[276px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Mở menu"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm nhanh chức năng..."
                className="h-10 w-[280px] rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 xl:w-[360px]"
              />

              {query.trim() && (
                <div className="absolute left-0 top-12 z-50 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
                  {searchResults.length ? searchResults.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
                        onClick={() => chooseSearchResult(item.id)}
                      >
                        <span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Icon size={16} /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                          <span className="block truncate text-xs text-slate-500">{item.description || 'Mở chức năng'}</span>
                        </span>
                      </button>
                    );
                  }) : (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">Không tìm thấy chức năng phù hợp.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <p className="hidden text-xs font-medium capitalize text-slate-500 xl:block">{dateText}</p>

            <button
              type="button"
              aria-label="Tải lại dữ liệu"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>

            {itemIsAccessible({ permissions: ['NOTIFICATION_VIEW_ALL', 'NOTIFICATION_VIEW_OWN'], audience: ['staff', 'resident'] }, canAccess, audience) && (
              <button
                type="button"
                aria-label="Thông báo"
                onClick={() => onNavigate('notifications')}
                className="relative rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50"
              >
                <Bell size={18} />
                {notificationCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full border-2 border-white bg-rose-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>
            )}

            <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-extrabold text-white">
                {getInitials(displayName)}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-40 truncate text-sm font-bold text-slate-800">{displayName}</p>
                <p className="max-w-40 truncate text-[11px] text-slate-500">{roleName}</p>
              </div>
            </div>
          </div>
        </header>

        {activePage !== 'dashboard' && (
          <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-[1600px]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Đức Vũ Tower</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
          </div>
        )}

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
