// src/utils/formatters.js

/**
 * Format date to Vietnamese format
 * @param {string|Date} date - Date to format
 * @param {string} format - Format string (default: 'dd/MM/yyyy')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'dd/MM/yyyy') {
  if (!date) return 'Chưa cập nhật';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Chưa cập nhật';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    switch (format) {
      case 'dd/MM/yyyy':
        return `${day}/${month}/${year}`;
      case 'MM/dd/yyyy':
        return `${month}/${day}/${year}`;
      case 'yyyy-MM-dd':
        return `${year}-${month}-${day}`;
      case 'dd-MM-yyyy':
        return `${day}-${month}-${year}`;
      case 'dd/MM/yyyy HH:mm':
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      case 'dd/MM/yyyy HH:mm:ss':
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      default:
        return `${day}/${month}/${year}`;
    }
  } catch {
    return 'Chưa cập nhật';
  }
}

/**
 * Format date and time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date time string
 */
export function formatDateTime(date) {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Format number to Vietnamese currency (VND)
 * @param {number} value - Number to format
 * @returns {string} Formatted currency string
 */
export function money(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0 ₫';
  }
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
export function getInitials(name) {
  if (!name) return '?';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  // Lấy 2 chữ cái đầu của từ cuối cùng và từ trước đó
  const last = parts[parts.length - 1];
  const first = parts[0];
  
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

/**
 * Format birthday to MM-DD format
 * @param {string|Date} date - Date to format
 * @returns {string} MM-DD format
 */
export function formatBirthday(date) {
  if (!date) return 'Chưa cập nhật';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Chưa cập nhật';
    
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  } catch {
    return 'Chưa cập nhật';
  }
}

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
  if (!phone) return 'Chưa có';
  
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{4})(\d{4})(\d{3})/, '$1 $2 $3');
  }
  return phone;
}

/**
 * Format number with thousand separators
 * @param {number} value - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Get status color for badges
 * @param {string} status - Status string
 * @returns {string} Color name
 */
export function getStatusColor(status) {
  const statusMap = {
    'Đang ở': 'green',
    'Đã thuê': 'green',
    'Đang hiệu lực': 'green',
    'Hoạt động': 'green',
    'Đã thanh toán': 'green',
    'Thành công': 'green',
    'Hoàn tất': 'green',
    'Đang xử lý': 'amber',
    'Sắp hết hạn': 'amber',
    'Chưa thanh toán': 'amber',
    'Quá hạn': 'red',
    'Đã hết hạn': 'red',
    'Đã hủy': 'red',
    'Thất bại': 'red',
    'Trống': 'blue',
    'Còn trống': 'blue',
    'Bảo trì': 'amber',
    'Đang bảo trì': 'amber',
  };
  
  return statusMap[status] || 'slate';
}

/**
 * Get status label in Vietnamese
 * @param {string} status - Status code or value
 * @returns {string} Vietnamese label
 */
export function getStatusLabel(status) {
  const labelMap = {
    'active': 'Đang hoạt động',
    'inactive': 'Không hoạt động',
    'pending': 'Đang chờ',
    'completed': 'Hoàn tất',
    'cancelled': 'Đã hủy',
    'paid': 'Đã thanh toán',
    'unpaid': 'Chưa thanh toán',
    'overdue': 'Quá hạn',
  };
  
  return labelMap[status] || status;
}

/**
 * Format relative time (e.g., "5 phút trước", "2 giờ trước")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function timeAgo(date) {
  if (!date) return 'Chưa xác định';
  
  try {
    const now = new Date();
    const past = new Date(date);
    if (isNaN(past.getTime())) return 'Chưa xác định';
    
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);
    
    if (diffYear > 0) return `${diffYear} năm trước`;
    if (diffMonth > 0) return `${diffMonth} tháng trước`;
    if (diffDay > 0) return `${diffDay} ngày trước`;
    if (diffHour > 0) return `${diffHour} giờ trước`;
    if (diffMin > 0) return `${diffMin} phút trước`;
    return 'Vừa xong';
  } catch {
    return 'Chưa xác định';
  }
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format VND currency without symbol
 * @param {number} value - Number to format
 * @returns {string} Formatted currency without symbol
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value).replace('₫', '').trim();
}

/**
 * Check if string is valid JSON
 * @param {string} str - String to check
 * @returns {boolean} True if valid JSON
 */
export function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get status style for parking actions
 * @param {string} action - Action type
 * @returns {string} CSS class
 */
export function getParkingActionStyle(action) {
  if (action === 'Vào') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (action === 'Ra') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

/**
 * Get vehicle type icon name
 * @param {string} type - Vehicle type
 * @returns {string} Icon name
 */
export function getVehicleTypeIcon(type) {
  if (!type) return 'Car';
  const name = type.toLowerCase();
  if (name.includes('ôtô') || name.includes('o to')) return 'Car';
  if (name.includes('xe máy') || name.includes('xe may')) return 'Bike';
  if (name.includes('xe đạp') || name.includes('xe dap')) return 'Bicycle';
  return 'Car';
}

export default {
  formatDate,
  formatDateTime,
  money,
  getInitials,
  formatBirthday,
  formatPhone,
  formatNumber,
  truncate,
  getStatusColor,
  getStatusLabel,
  timeAgo,
  formatFileSize,
  formatCurrency,
  isValidJSON,
  getParkingActionStyle,
  getVehicleTypeIcon
};