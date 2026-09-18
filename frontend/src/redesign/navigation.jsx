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
        permission: 'DASHBOARD_VIEW',
      },
      {
        id: 'quick-report',
        label: 'Báo cáo nhanh',
        description: 'Chỉ số tổng hợp từ hệ thống',
        icon: Activity,
        permission: 'REPORT_VIEW',
      },
    ],
  },
  {
    id: 'condo',
    label: 'Quản lý chung cư',
    items: [
      { id: 'residents', label: 'Cư dân', icon: Users, permission: 'RESIDENT_VIEW' },
      { id: 'buildings', label: 'Căn hộ & tòa nhà', icon: Building2, permission: 'APARTMENT_VIEW' },
      { id: 'contract-list', label: 'Hợp đồng thuê', icon: FileText, permission: 'CONTRACT_VIEW' },
      { id: 'fees', label: 'Hóa đơn & thu phí', icon: ReceiptText, permission: 'INVOICE_VIEW' },
    ],
  },
  {
    id: 'parking',
    label: 'Bãi xe',
    items: [
      { id: 'vehicles', label: 'Xe cư dân', icon: Car, permission: 'PARKING_VIEW' },
      { id: 'parking-cards', label: 'Thẻ xe', icon: CreditCard, permission: 'PARKING_VIEW' },
      { id: 'parking-slots', label: 'Vị trí đỗ xe', icon: ParkingSquare, permission: 'PARKING_VIEW' },
      { id: 'parking-history', label: 'Lịch sử ra vào', icon: History, permission: 'PARKING_HISTORY' },
    ],
  },
  {
    id: 'amenities',
    label: 'Tiện ích & dịch vụ',
    items: [
      { id: 'gym', label: 'Phòng Gym', icon: Dumbbell, permission: 'SERVICE_VIEW' },
      { id: 'pool', label: 'Hồ bơi', icon: Waves, permission: 'SERVICE_VIEW' },
      { id: 'wifi', label: 'Dịch vụ Wi-Fi', icon: Wifi, permission: 'SERVICE_VIEW' },
    ],
  },
  {
    id: 'operations',
    label: 'Vận hành',
    items: [
      { id: 'tickets', label: 'Yêu cầu hỗ trợ', icon: Wrench, permission: 'TICKET_VIEW' },
      { id: 'maintenance', label: 'Xử lý bảo trì', icon: ListChecks, permission: 'MAINTENANCE_UPDATE' },
      { id: 'feedbacks', label: 'Phản ánh cư dân', icon: MessageSquareText, permission: 'TICKET_VIEW' },
      { id: 'maintenance-schedule', label: 'Lịch bảo trì', icon: CalendarClock, permission: 'MAINTENANCE_UPDATE' },
      { id: 'equipment', label: 'Thiết bị', icon: ClipboardList, permission: 'DEVICE_MANAGE' },
    ],
  },
  {
    id: 'communications',
    label: 'Thông báo',
    items: [
      { id: 'notifications', label: 'Danh sách thông báo', icon: Bell, permission: 'NOTIFICATION_VIEW' },
      { id: 'send-notification', label: 'Gửi thông báo', icon: Send, permission: 'NOTIFICATION_SEND' },
      { id: 'schedule-notification', label: 'Lịch gửi', icon: FileClock, permission: 'NOTIFICATION_SEND' },
    ],
  },
  {
    id: 'reports',
    label: 'Báo cáo',
    items: [
      { id: 'revenue-report', label: 'Doanh thu', icon: ChartNoAxesCombined, permission: 'REPORT_VIEW' },
      { id: 'debt-report', label: 'Công nợ', icon: CircleDollarSign, permission: 'DEBT_VIEW' },
      { id: 'apartment-report', label: 'Căn hộ', icon: House, permission: 'REPORT_VIEW' },
      { id: 'service-report', label: 'Dịch vụ', icon: BarChart3, permission: 'REPORT_VIEW' },
    ],
  },
  {
    id: 'administration',
    label: 'Quản trị hệ thống',
    items: [
      { id: 'employees', label: 'Nhân viên', icon: UserRound, permission: 'EMPLOYEE_VIEW' },
      { id: 'permissions', label: 'Phân quyền', icon: ShieldCheck, permission: 'PERMISSION_MANAGE' },
      { id: 'roles', label: 'Vai trò', icon: KeyRound, permission: 'ROLE_MANAGE' },
      { id: 'system-logs', label: 'Nhật ký hệ thống', icon: ClipboardList, permission: 'SYSTEM_SETTING' },
    ],
  },
  {
    id: 'ai',
    label: 'AI Assistant',
    items: [
      { id: 'ai-chat', label: 'Chat AI', icon: Bot, permission: 'AI_CHAT' },
      { id: 'ai-stats', label: 'Thống kê AI', icon: Sparkles, permission: 'AI_STATISTIC' },
      { id: 'ai-predict', label: 'Dự đoán hợp đồng', icon: ChartNoAxesCombined, permission: 'AI_PREDICT' },
      { id: 'ai-search', label: 'Tìm kiếm AI', icon: Search, permission: 'AI_SEARCH' },
    ],
  },
  {
    id: 'account',
    label: 'Tài khoản',
    items: [
      { id: 'profile', label: 'Hồ sơ cá nhân', icon: UserRound, permission: 'PROFILE_UPDATE' },
      { id: 'change-password', label: 'Đổi mật khẩu', icon: KeyRound, permission: 'PASSWORD_CHANGE' },
      { id: 'system-info', label: 'Thông tin hệ thống', icon: Settings, permission: 'SYSTEM_SETTING' },
    ],
  },
];

export const pageMeta = {
  dashboard: ['Bảng tổng quan', 'Theo dõi tình hình vận hành chung cư trong ngày.'],
  'quick-report': ['Báo cáo nhanh', 'Số liệu tổng hợp lấy trực tiếp từ hệ thống.'],
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
  employees: ['Nhân viên', 'Tài khoản và hồ sơ nhân sự vận hành.'],
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

export function firstAccessiblePage(canAccess) {
  for (const group of navigationGroups) {
    const page = group.items.find((item) => canAccess(item.permission));
    if (page) return page.id;
  }
  return null;
}

export function findNavigationItem(pageId) {
  for (const group of navigationGroups) {
    const item = group.items.find((candidate) => candidate.id === pageId);
    if (item) return item;
  }
  return null;
}
