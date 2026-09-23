import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell, Building2, Car, CheckCircle2, CircleDollarSign, ClipboardList,
  FileText, Home, ReceiptText, ShieldCheck, Ticket, Users, WalletCards, Wrench,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { dashboardAPI, invoiceAPI, notificationAPI, residentAPI, ticketAPI, vehicleAPI } from '../api';
import {
  DashboardChartCard, DashboardEmptyState, DashboardHero, DashboardSection, DashboardStatCard,
} from './DashboardUI';

const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
const number = (value) => new Intl.NumberFormat('vi-VN').format(Number(value) || 0);

function ResidentDashboard({ user, onNavigate, canAny }) {
  const [data, setData] = useState(null);
  const [details,setDetails]=useState({});
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load=()=>dashboardAPI.getStats().then(response => { if (active) {setData(response.data?.residentSummary || {});setDetails(response.data?.residentDetails || {});} })
      .catch(err => { if (active) setError(err.message); });
    load();const timer=setInterval(load,20000);
    return () => { active = false;clearInterval(timer); };
  }, []);
  const cards = [
    ['APARTMENT', Home, 'Căn hộ của tôi', data?.apartmentCount, 'buildings'],
    ['VEHICLE', Car, 'Phương tiện của tôi', data?.vehicleCount, 'vehicles'],
    ['INVOICE', ReceiptText, 'Hóa đơn chưa thanh toán', data?.unpaidInvoiceCount, 'fees'],
    ['INVOICE', WalletCards, 'Tổng tiền cần thanh toán', data ? money(data.outstandingAmount) : '...', 'fees'],
    ['NOTIFICATION', Bell, 'Thông báo chưa đọc', data?.unreadCount, 'notifications'],
    ['FEEDBACK', ClipboardList, 'Phản ánh chờ phản hồi', data?.pendingFeedbackCount, 'feedbacks'],
    ['TICKET', Ticket, 'Yêu cầu đang xử lý', data?.openTicketCount, 'tickets'],
  ].filter(([module]) => canAny([`${module}_VIEW_OWN`]));
  return <div className="space-y-5">
    <DashboardHero eyebrow="Cổng cư dân" title={`Xin chào, ${user?.name || 'cư dân'}!`} description="Thông tin căn hộ, hóa đơn và yêu cầu của riêng bạn." />
    {error && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-800">{error}</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([module, icon, label, value, page]) => <button type="button" className="text-left" key={label} onClick={() => onNavigate(page)}><DashboardStatCard icon={icon} label={label} value={value ?? '...'} tone="blue" /></button>)}</section>
    {Number(data?.draftInvoiceCount)>0&&<p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">Có {data.draftInvoiceCount} hóa đơn đang lập, chưa chốt số tiền phải thanh toán.</p>}
    <section className="grid gap-5 lg:grid-cols-2">
      {canAny(['INVOICE_VIEW_OWN'])&&<DashboardSection title="Hóa đơn sắp đến hạn / quá hạn" description="Hạn thanh toán trong 7 ngày tới và các khoản đã quá hạn"><div className="space-y-3 p-5">{details.dueInvoices?.length?details.dueInvoices.map(i=><button key={i.InvoiceID} className="block w-full rounded-xl border p-3 text-left" onClick={()=>onNavigate('fees')}><strong>Hóa đơn #{i.InvoiceID} · {i.InvoiceMonth}/{i.InvoiceYear}</strong><p>Căn {i.ApartmentCode} · Còn nợ {money(i.RemainingAmount)}</p><p className={i.DueStatus==='OVERDUE'?'text-red-600':'text-amber-700'}>{i.DueStatus==='OVERDUE'?'Quá hạn':'Sắp đến hạn'} · {new Date(i.DueDate).toLocaleDateString('vi-VN')}</p></button>):<p>Không có hóa đơn sắp đến hạn hoặc quá hạn.</p>}</div></DashboardSection>}
      {canAny(['APARTMENT_VIEW_OWN'])&&<DashboardSection title="Căn hộ đang ở / đang thuê"><div className="space-y-3 p-5">{details.apartments?.length?details.apartments.map(a=><button key={a.ApartmentID} className="block w-full rounded-xl border p-3 text-left" onClick={()=>onNavigate('buildings')}><strong>{a.ApartmentCode}</strong><p>{a.BuildingName} · Tầng {a.FloorNumber}</p></button>):<p>Chưa có căn hộ đang liên kết.</p>}</div></DashboardSection>}
      {canAny(['TICKET_VIEW_OWN'])&&<DashboardSection title="Yêu cầu bảo trì đang xử lý"><div className="space-y-3 p-5">{details.tickets?.length?details.tickets.map(t=><button key={t.RequestID} className="block w-full rounded-xl border p-3 text-left" onClick={()=>onNavigate('tickets')}><strong>{t.Title}</strong><p>{t.AssignedEmployeeName || 'Chờ nhận xử lý'} · {t.Progress}%</p></button>):<p>Không có yêu cầu đang xử lý.</p>}</div></DashboardSection>}
      {canAny(['NOTIFICATION_VIEW_OWN'])&&<DashboardSection title="Thông báo gần đây"><div className="space-y-3 p-5">{details.notifications?.length?details.notifications.map(n=><button key={n.NotificationID} className="block w-full rounded-xl border p-3 text-left" onClick={()=>onNavigate('notifications')}><strong>{n.Title}</strong><p className="line-clamp-2 text-sm">{n.Content}</p><p className="text-xs text-slate-500">{new Date(n.CreatedDate).toLocaleString('vi-VN')}</p></button>):<p>Chưa có thông báo.</p>}</div></DashboardSection>}
    </section>
  </div>;
}

const roleContent = {
  ADMIN: { title: 'Không gian quản trị hệ thống', description: 'Theo dõi toàn bộ vận hành, tài chính và các điểm cần xử lý trong ngày.', actions: [['buildings', Building2, 'Quản lý căn hộ'], ['fees', ReceiptText, 'Thu phí & hóa đơn'], ['tickets', Wrench, 'Yêu cầu hỗ trợ'], ['parking-slots', Car, 'Quản lý bãi xe']] },
  MANAGER: { title: 'Tổng quan vận hành', description: 'Nắm nhanh tình trạng căn hộ, cư dân, hợp đồng và các yêu cầu đang mở.', actions: [['buildings', Building2, 'Quản lý căn hộ'], ['tickets', Wrench, 'Yêu cầu hỗ trợ'], ['fees', ReceiptText, 'Thu phí & hóa đơn'], ['parking-slots', Car, 'Quản lý bãi xe']] },
  ACCOUNTANT: { title: 'Trung tâm tài chính', description: 'Theo dõi phải thu, đã thu, công nợ và hiệu quả thu phí của tòa nhà.', actions: [['fees', ReceiptText, 'Tạo hóa đơn'], ['fees', WalletCards, 'Thu tiền'], ['debt-report', CircleDollarSign, 'Công nợ'], ['revenue-report', FileText, 'Báo cáo']] },
  RECEPTION: { title: 'Bảng điều hành lễ tân', description: 'Tra cứu nhanh cư dân, căn hộ và tiếp nhận yêu cầu trong ngày.', actions: [['residents', Users, 'Tìm cư dân'], ['buildings', Building2, 'Tìm căn hộ'], ['tickets', Ticket, 'Tiếp nhận yêu cầu'], ['send-notification', Bell, 'Gửi thông báo']] },
  TECHNICIAN: { title: 'Bảng công việc kỹ thuật', description: 'Tập trung vào ticket và tiến độ xử lý từ dữ liệu vận hành hiện có.', actions: [['tickets', Wrench, 'Công việc của tôi'], ['tickets', Ticket, 'Ticket'], ['maintenance-schedule', ClipboardList, 'Lịch bảo trì']] },
  SECURITY: { title: 'Trực cổng & bãi xe', description: 'Theo dõi phương tiện, thẻ xe và lịch sử ra vào theo quyền được cấp.', actions: [['parking-history', Car, 'Ghi nhận VÀO'], ['parking-history', Car, 'Ghi nhận RA'], ['vehicles', ShieldCheck, 'Tìm biển số'], ['parking-cards', ClipboardList, 'Tìm mã thẻ']] },
};

function StaffDashboard({ user, role, canAccess, canAny, onNavigate }) {
  const [data, setData] = useState({ stats: null, financial: null, activities: [] });
  const [loading, setLoading] = useState(true);
  const content = roleContent[role];

  useEffect(() => {
    let active = true;
    const requests = [dashboardAPI.getStats(), dashboardAPI.getActivities()];
    if (canAny(['INVOICE_VIEW', 'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN'])) requests.push(dashboardAPI.getFinancial());
    Promise.allSettled(requests).then((results) => {
      if (!active) return;
      const stats = results[0].status === 'fulfilled' ? results[0].value?.data : null;
      const activityData = results[1].status === 'fulfilled' ? results[1].value?.data : null;
      const financial = results[2]?.status === 'fulfilled' ? results[2].value?.data : null;
      setData({ stats, financial, activities: flattenStaffActivities(activityData) });
      setLoading(false);
    });
    return () => { active = false; };
  }, [canAccess]);

  const stats = data.stats || {};
  const financial = data.financial || {};
  const apartments = stats.apartments || {};
  const tickets = stats.tickets || {};
  const openTickets = (Number(tickets.New) || 0) + (Number(tickets.Processing) || 0);
  const apartmentOccupied = (Number(apartments.Occupied) || 0) + (Number(apartments.Rented) || 0);
  const occupancy = Number(apartments.Total) ? Math.round((apartmentOccupied / Number(apartments.Total)) * 100) : 0;
  const invoiceChart = [['Đã thanh toán', stats.invoices?.Paid, '#10b981'], ['Chưa thanh toán', stats.invoices?.Unpaid, '#ef4444'], ['Quá hạn', stats.invoices?.Overdue, '#f59e0b']].filter((item) => Number(item[1]) > 0).map(([name, value, color]) => ({ name, value: Number(value), color }));
  const apartmentChart = [['Đang sử dụng', apartmentOccupied, '#2563eb'], ['Căn trống', apartments.Available, '#10b981'], ['Bảo trì', apartments.UnderMaintenance, '#f59e0b']].filter((item) => Number(item[1]) > 0).map(([name, value, color]) => ({ name, value: Number(value), color }));
  const revenueTrend = (financial.monthlyTrend || stats.revenueByMonth || []).map((item) => ({ month: `T${item.Month}/${String(item.Year).slice(-2)}`, revenue: Number(item.Revenue ?? item.Total) || 0 }));
  const actions = content.actions.filter(([page]) => {
    const itemPermission = { buildings: 'APARTMENT_VIEW', fees: 'INVOICE_VIEW', tickets: 'TICKET_VIEW', 'parking-slots': 'PARKING_VIEW', residents: 'RESIDENT_VIEW', 'send-notification': 'NOTIFICATION_SEND', 'debt-report': 'DEBT_VIEW', 'revenue-report': 'REPORT_VIEW', 'maintenance-schedule': 'MAINTENANCE_UPDATE', 'parking-history': 'PARKING_VIEW', vehicles: 'VEHICLE_VIEW', 'parking-cards': 'PARKING_VIEW' }[page];
    return !itemPermission || canAny([itemPermission, `${itemPermission}_ALL`, `${itemPermission}_OWN`]);
  }).map(([page, icon, label]) => ({ icon, label, description: 'Mở module theo quyền được cấp', onClick: () => onNavigate(page) }));
  const displayName = user?.name || user?.username || 'Bạn';
  const date = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const statCards = role === 'ACCOUNTANT'
    ? [['Tổng phải thu', financial.currentMonth?.TotalInvoices, 'Hóa đơn kỳ hiện tại', ReceiptText, 'blue'], ['Đã thu', financial.currentMonth?.Paid, money(financial.currentMonth?.Paid), WalletCards, 'emerald'], ['Còn nợ', financial.outstanding?.Outstanding, 'Tổng số dư chưa thanh toán', CircleDollarSign, 'rose'], ['Hóa đơn quá hạn', financial.currentMonth?.Overdue, 'Theo kỳ hiện tại', FileText, 'amber'], ['Tỷ lệ thu', financial.currentMonth?.TotalInvoices ? `${Math.round((Number(financial.currentMonth.Paid) / Number(financial.currentMonth.TotalInvoices)) * 100)}%` : 'Chưa có dữ liệu', 'Theo số hóa đơn', CheckCircle2, 'cyan'], ['Doanh thu dịch vụ', financial.yearToDate?.Revenue, 'Doanh thu lũy kế năm', WalletCards, 'violet']]
    : [['Tổng căn hộ', apartments.Total, `${occupancy}% đang sử dụng`, Building2, 'blue'], ['Cư dân hoạt động', stats.residents?.Active, `${number(stats.residents?.Total)} hồ sơ cư dân`, Users, 'emerald'], ['Hợp đồng hiệu lực', stats.contracts?.Active, `${number(stats.contracts?.Total)} hợp đồng`, FileText, 'violet'], ['Ticket mở', openTickets, `${number(tickets.Completed)} đã hoàn tất`, Wrench, 'amber'], ['Đã thu tháng này', canAny(['INVOICE_VIEW', 'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN']) ? money(financial.currentMonth?.Paid) : 'Chưa có quyền', 'Theo hóa đơn đã thanh toán', WalletCards, 'cyan'], ['Công nợ hiện tại', canAny(['INVOICE_VIEW', 'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN']) ? money(financial.outstanding?.Outstanding) : 'Chưa có quyền', 'Hóa đơn chưa thanh toán', CircleDollarSign, 'rose']];
  const canViewInvoices = canAny(['INVOICE_VIEW', 'INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN']);
  return <div className="space-y-5"><DashboardHero eyebrow={`Đức Vũ Tower · ${role}`} title={`Xin chào, ${displayName}!`} description={content.description} actions={actions} date={date} /><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{statCards.map(([label, value, detail, icon, tone]) => <DashboardStatCard key={label} icon={icon} label={label} value={loading ? '...' : (typeof value === 'number' ? number(value) : value || 'Chưa có dữ liệu')} detail={detail} tone={tone} loading={loading} />)}</section><section className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]"><DashboardChartCard title="Doanh thu / thu phí" description="Các khoản đã thanh toán theo tháng"><div className="h-[300px] p-4">{revenueTrend.length && canViewInvoices ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueTrend}><defs><linearGradient id={`revenue-${role}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0b82c9" stopOpacity={0.35} /><stop offset="100%" stopColor="#0b82c9" stopOpacity={0.03} /></linearGradient></defs><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000000)}tr`} /><Tooltip formatter={(value) => [money(value), 'Đã thu']} /><Area type="monotone" dataKey="revenue" stroke="#0878c9" fill={`url(#revenue-${role})`} strokeWidth={2.5} /></AreaChart></ResponsiveContainer> : <DashboardEmptyState title={canViewInvoices ? 'Chưa có dữ liệu doanh thu' : 'Chưa được cấp quyền tài chính'} text="Biểu đồ chỉ hiển thị từ dữ liệu API thực tế." />}</div></DashboardChartCard><DashboardChartCard title="Tình trạng căn hộ" description={`${occupancy}% căn hộ đang được sử dụng`}><div className="grid min-h-[300px] items-center gap-4 p-5 sm:grid-cols-[170px_1fr]"><div className="h-[170px] w-[170px]">{apartmentChart.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={apartmentChart} dataKey="value" innerRadius={52} outerRadius={76} paddingAngle={3}>{apartmentChart.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <DashboardEmptyState title="Chưa có dữ liệu căn hộ" />}</div><div className="space-y-3">{apartmentChart.map((item) => <div key={item.name} className="flex justify-between gap-3 text-sm"><span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><strong>{number(item.value)}</strong></div>)}</div></div></DashboardChartCard></section><section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]"><DashboardSection title="Hoạt động gần đây" description="Hợp đồng, thanh toán, yêu cầu và thông báo mới nhất"><div className="divide-y divide-slate-100">{data.activities.length ? data.activities.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-3.5"><span className={`rounded-lg p-2.5 ${item.tone}`}><item.icon size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{item.title}</p><p className="truncate text-xs text-slate-500">{item.detail}</p></div></div>) : <DashboardEmptyState title="Chưa có hoạt động gần đây" />}</div></DashboardSection><DashboardSection title="Tình trạng hóa đơn" description={`${number(stats.invoices?.Total)} hóa đơn trong hệ thống`}><div className="grid min-h-[300px] items-center gap-4 p-5 sm:grid-cols-[170px_1fr]">{canViewInvoices && invoiceChart.length ? <><div className="h-[170px] w-[170px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={invoiceChart} dataKey="value" innerRadius={52} outerRadius={76} paddingAngle={3}>{invoiceChart.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="space-y-3">{invoiceChart.map((item) => <div key={item.name} className="flex justify-between text-sm"><span className="text-slate-600">{item.name}</span><strong>{number(item.value)}</strong></div>)}</div></> : <DashboardEmptyState title={canViewInvoices ? 'Chưa có dữ liệu hóa đơn' : 'Chưa được cấp quyền hóa đơn'} />}</div></DashboardSection></section></div>;
}

function flattenStaffActivities(data = {}) {
  return [...(data.recentContracts || []).map((item) => ({ id: `contract-${item.ContractNumber}`, title: `Hợp đồng ${item.ContractNumber || 'mới'}`, detail: item.ApartmentCode || 'Căn hộ', icon: FileText, tone: 'bg-blue-50 text-blue-600' })), ...(data.recentPayments || []).map((item) => ({ id: `payment-${item.TransactionCode}`, title: `Thanh toán ${money(item.Amount)}`, detail: item.ApartmentCode || 'Căn hộ', icon: WalletCards, tone: 'bg-emerald-50 text-emerald-600' })), ...(data.recentTickets || []).map((item, index) => ({ id: `ticket-${item.RequestDate}-${index}`, title: item.Title || 'Yêu cầu hỗ trợ', detail: `${item.ApartmentCode || 'Căn hộ'} · ${item.Status || 'Mới'}`, icon: Wrench, tone: 'bg-amber-50 text-amber-600' }))].slice(0, 8);
}

export default function RoleDashboard({ user, canAccess, canAny, onNavigate }) {
  const role = useMemo(() => ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'RECEPTION', 'TECHNICIAN', 'SECURITY', 'RESIDENT'].find((code) => (user?.roleCodes || []).includes(code)) || 'RESIDENT', [user]);
  return role === 'RESIDENT'
    ? <ResidentDashboard user={user} onNavigate={onNavigate} canAny={canAny} />
    : <StaffDashboard user={user} role={role} canAccess={canAccess} canAny={canAny} onNavigate={onNavigate} />;
}
