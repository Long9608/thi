import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  Car,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileClock,
  FileText,
  Gauge,
  History,
  House,
  KeyRound,
  ListChecks,
  MessageSquareText,
  ParkingSquare,
  ReceiptText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Waves,
  Wifi,
  Wrench,
} from 'lucide-react';

export const navigationGroups = [
  {
    id: 'overview',
    label: 'Tổng quan',
    items: [
      {
        id: 'dashboard',
        label: 'Bảng tổng quan',
        description: 'Tình hình vận hành hôm nay',
        icon: Gauge,
        permissions: ['DASHBOARD_VIEW', 'RESIDENT_VIEW_OWN'],
        audience: ['staff', 'resident'],
      },
    ],
  },
  {
    id: 'condo',
    label: 'Quản lý chung cư',
    items: [
      { id: 'residents', label: 'Cư dân', icon: Users, permissions: ['RESIDENT_VIEW_ALL', 'RESIDENT_VIEW_OWN'], audience: ['staff', 'resident'] },
      { id: 'buildings', label: 'Căn hộ & tòa nhà', icon: Building2, permissions: ['APARTMENT_VIEW_ALL', 'APARTMENT_VIEW_OWN'], audience: ['staff', 'resident'] },
      { id: 'contract-list', label: 'Hợp đồng thuê', icon: FileText, permissions: ['CONTRACT_VIEW_ALL', 'CONTRACT_VIEW_OWN'], audience: ['staff', 'resident'] },
      { id: 'fees', label: 'Hóa đơn & thu phí', icon: ReceiptText, permissions: ['INVOICE_VIEW_ALL', 'INVOICE_VIEW_OWN'], audience: ['staff', 'resident'] },
    ],
  },
  {
    id: 'parking',
    label: 'Bãi xe',
    items: [
      { id: 'vehicles', label: 'Xe cư dân', icon: Car, permissions: ['VEHICLE_VIEW_ALL', 'VEHICLE_VIEW_OWN'], audience: ['staff', 'resident'] },
      { id: 'parking-cards', label: 'Thẻ xe', icon: CreditCard, permissions: ['PARKING_VIEW_ALL', 'PARKING_VIEW_OWN'], audience: ['staff', 'resident'] },
      { id: 'parking-slots', label: 'Vị trí đỗ xe', icon: ParkingSquare, permissions: ['PARKING_VIEW_ALL'], audience: ['staff'] },
      { id: 'parking-history', label: 'Lịch sử ra vào', icon: History, permissions: ['PARKING_VIEW_ALL', 'PARKING_VIEW_OWN'], audience: ['staff', 'resident'] },
    ],
  },
  {
    id: 'amenities',
    label: 'Tiện ích & dịch vụ',
    items: [
      { id: 'gym', label: 'Phòng Gym', icon: Dumbbell, permissions: ['SERVICE_VIEW', 'SERVICE_VIEW_ALL', 'SERVICE_VIEW_OWN'], audience: ['staff', 'resident'] },
      { id: 'pool', label: 'Hồ bơi', icon: Waves, permissions: ['SERVICE_VIEW', 'SERVICE_VIEW_ALL', 'SERVICE_VIEW_OWN'], audience: ['staff', 'resident'] },
      { id: 'wifi', label: 'Dịch vụ Wi-Fi', icon: Wifi, permissions: ['SERVICE_VIEW', 'SERVICE_VIEW_ALL', 'SERVICE_VIEW_OWN'], audience: ['staff', 'resident'] },
    ],
  },
  {
    id: 'operations',
    label: 'Vận hành',
    items: [
      { id: 'tickets', label: 'Yêu cầu hỗ trợ', icon: Wrench, permissions: ['TICKET_VIEW_ALL', 'TICKET_VIEW_OWN'], audience: ['staff', 'resident'] },
      { id: 'maintenance', label: 'Xử lý bảo trì', icon: ListChecks, permissions: ['MAINTENANCE_UPDATE'], audience: ['staff'] },
      { id: 'feedbacks', label: 'Phản ánh cư dân', icon: MessageSquareText, permissions: ['FEEDBACK_VIEW_ALL', 'FEEDBACK_VIEW_OWN'], audience: ['staff', 'resident'] },
      { id: 'maintenance-schedule', label: 'Lịch bảo trì', icon: CalendarClock, permissions: ['MAINTENANCE_UPDATE'], audience: ['staff'] },
      { id: 'equipment', label: 'Thiết bị', icon: ClipboardList, permissions: ['DEVICE_MANAGE'], audience: ['staff'] },
    ],
  },
  {
    id: 'communications',
    label: 'Thông báo',
    items: [
      { id: 'notifications', label: 'Thông báo', icon: Bell, permissions: ['NOTIFICATION_VIEW_ALL', 'NOTIFICATION_VIEW_OWN'], audience: ['staff', 'resident'] },
      { id: 'send-notification', label: 'Gửi thông báo', icon: Send, permissions: ['NOTIFICATION_SEND'], audience: ['staff'] },
      { id: 'schedule-notification', label: 'Lịch gửi', icon: FileClock, permissions: ['NOTIFICATION_SEND'], audience: ['staff'] },
    ],
  },
  {
    id: 'reports',
    label: 'Báo cáo',
    items: [
      { id: 'revenue-report', label: 'Doanh thu', icon: ChartNoAxesCombined, permissions: ['REPORT_VIEW'], audience: ['staff'] },
      { id: 'debt-report', label: 'Công nợ', icon: CircleDollarSign, permissions: ['DEBT_VIEW'], audience: ['staff'] },
      { id: 'apartment-report', label: 'Căn hộ', icon: House, permissions: ['REPORT_VIEW'], audience: ['staff'] },
      { id: 'service-report', label: 'Dịch vụ', icon: BarChart3, permissions: ['REPORT_VIEW'], audience: ['staff'] },
    ],
  },
  {
    id: 'administration',
    label: 'Quản trị hệ thống',
    items: [
      { id: 'employees', label: 'Người dùng', icon: UserRound, permissions: ['EMPLOYEE_VIEW'], audience: ['staff'] },
      { id: 'permissions', label: 'Phân quyền', icon: ShieldCheck, permissions: ['PERMISSION_MANAGE'], audience: ['staff'] },
      { id: 'roles', label: 'Vai trò', icon: KeyRound, permissions: ['ROLE_MANAGE'], audience: ['staff'] },
      { id: 'system-logs', label: 'Nhật ký hệ thống', icon: ClipboardList, permissions: ['SYSTEM_SETTING'], audience: ['staff'] },
    ],
  },
  { 
    id: 'ai',
    label: 'AI Assistant',
    items: [
      { id: 'ai-chat', label: 'Chat AI', icon: Bot, permissions: ['AI_CHAT'], audience: ['staff', 'resident'] },
      { id: 'ai-stats', label: 'Thống kê AI', icon: Sparkles, permissions: ['AI_STATISTIC'], audience: ['staff'] },
      { id: 'ai-predict', label: 'Dự đoán hợp đồng', icon: ChartNoAxesCombined, permissions: ['AI_PREDICT'], audience: ['staff'] },
      { id: 'ai-search', label: 'Tìm kiếm AI', icon: Search, permissions: ['AI_SEARCH'], audience: ['staff', 'resident'] },
      { id: 'ai-record', label: 'Chi tiết tra cứu', icon: FileText, permissions: ['AI_SEARCH','AI_CHAT'], audience: ['staff', 'resident'] },
    ],
  },
  {
    id: 'account',
    label: 'Tài khoản',
    items: [
      { id: 'profile', label: 'Hồ sơ cá nhân', icon: UserRound, permissions: ['PROFILE_UPDATE'], audience: ['staff', 'resident'] },
      { id: 'change-password', label: 'Đổi mật khẩu', icon: KeyRound, permissions: ['PASSWORD_CHANGE'], audience: ['staff', 'resident'] },
      { id: 'system-info', label: 'Thông tin hệ thống', icon: Settings, permissions: ['SYSTEM_SETTING'], audience: ['staff'] },
    ],
  },
];

export const pageMeta = {
  dashboard: ['Bảng tổng quan', 'Theo dõi tình hình vận hành chung cư trong ngày.'],
  residents: ['Quản lý cư dân', 'Hồ sơ cư dân, liên hệ và trạng thái cư trú.'],
  buildings: ['Căn hộ & tòa nhà', 'Sơ đồ phòng, hợp đồng và trạng thái sử dụng.'],
  'contract-list': ['Hợp đồng thuê', 'Theo dõi hợp đồng và thời hạn thuê.'],
  fees: ['Hóa đơn & thu phí', 'Lập hóa đơn, theo dõi công nợ và thanh toán.'],
  vehicles: ['Xe cư dân', 'Thông tin phương tiện đăng ký trong chung cư.'],
  'parking-cards': ['Thẻ xe', 'Cấp thẻ và quản lý hiệu lực thẻ xe.'],
  'parking-slots': ['Vị trí đỗ xe', 'Sơ đồ và tình trạng sử dụng bãi xe.'],
  'parking-history': ['Lịch sử ra vào', 'Theo dõi lượt phương tiện vào và ra bãi.'],
  gym: ['Phòng Gym', 'Đăng ký và quản lý thành viên phòng Gym.'],
  pool: ['Hồ bơi', 'Đăng ký và quản lý thành viên hồ bơi.'],
  wifi: ['Dịch vụ Wi-Fi', 'Quản lý gói và đăng ký Wi-Fi của cư dân.'],
  tickets: ['Yêu cầu hỗ trợ', 'Tiếp nhận và theo dõi yêu cầu từ cư dân.'],
  maintenance: ['Xử lý bảo trì', 'Phân công và cập nhật tiến độ sửa chữa.'],
  feedbacks: ['Phản ánh cư dân', 'Theo dõi và phản hồi ý kiến cư dân.'],
  'maintenance-schedule': ['Lịch bảo trì', 'Lịch công việc vận hành và bảo trì.'],
  equipment: ['Thiết bị', 'Danh mục thiết bị phục vụ vận hành.'],
  notifications: ['Thông báo', 'Tin tức và thông báo đã phát hành.'],
  'send-notification': ['Gửi thông báo', 'Soạn nội dung và chọn đúng nhóm người nhận.'],
  'schedule-notification': ['Lịch gửi', 'Theo dõi thông báo được lên lịch.'],
  'revenue-report': ['Báo cáo doanh thu', 'Phân tích khoản thu đã ghi nhận.'],
  'debt-report': ['Báo cáo công nợ', 'Theo dõi các khoản chưa thanh toán.'],
  'apartment-report': ['Báo cáo căn hộ', 'Thống kê tình trạng khai thác căn hộ.'],
  'service-report': ['Báo cáo dịch vụ', 'Theo dõi đăng ký và mức sử dụng dịch vụ.'],
  employees: ['Người dùng', 'Tài khoản và hồ sơ người dùng hệ thống.'],
  permissions: ['Phân quyền', 'Gán quyền theo vai trò và chức năng.'],
  roles: ['Vai trò', 'Quản lý nhóm quyền trong hệ thống.'],
  'system-logs': ['Nhật ký hệ thống', 'Theo dõi thao tác và thay đổi dữ liệu.'],
  'ai-chat': ['Chat AI', 'Trợ lý hỏi đáp cho dữ liệu vận hành.'],
  'ai-stats': ['Thống kê AI', 'Tổng hợp dữ liệu và gợi ý theo quy tắc.'],
  'ai-predict': ['Dự đoán hợp đồng', 'Đánh giá khả năng gia hạn hợp đồng.'],
  'ai-search': ['Tìm kiếm AI', 'Tìm kiếm nhanh trong dữ liệu chung cư.'],
  profile: ['Hồ sơ cá nhân', 'Thông tin tài khoản đang đăng nhập.'],
  'change-password': ['Đổi mật khẩu', 'Cập nhật mật khẩu đăng nhập hệ thống.'],
  'system-info': ['Thông tin hệ thống', 'Phiên bản và trạng thái dịch vụ.'],
};

export function firstAccessiblePage(canAccess, audience = 'staff') {
  for (const group of navigationGroups) {
    const page = group.items.find((item) => itemIsAccessible(item, canAccess, audience));
    if (page) return page.id;
  }
  return null;
}

export function itemIsAccessible(item, canPermission, audience) {
  const allowedAudience = !item.audience || item.audience.includes(audience);
  const permissions = item.permissions || (item.permission ? [item.permission] : []);
  return allowedAudience && permissions.some(canPermission);
}

export function findNavigationItem(pageId) {
  for (const group of navigationGroups) {
    const item = group.items.find((candidate) => candidate.id === pageId);
    if (item) return item;
  }
  return null;
}
