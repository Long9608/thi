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
    
    switch (format) {
      case 'dd/MM/yyyy':
        return `${day}/${month}/${year}`;
      case 'MM/dd/yyyy':
        return `${month}/${day}/${year}`;
      case 'yyyy-MM-dd':
        return `${year}-${month}-${day}`;
      case 'dd-MM-yyyy':
        return `${day}-${month}-${year}`;
      default:
        return `${day}/${month}/${year}`;
    }
  } catch {
    return 'Chưa cập nhật';
  }
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