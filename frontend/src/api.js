// src/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper để lấy token từ localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper để set token
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

// Helper để logout
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// Request wrapper hỗ trợ JWT, JSON & FormData
async function request(path, options = {}) {
  try {
    const token = getAuthToken();
    
    const headers = {
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (res.status === 401) {
      logout();
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    if (!res.ok) {
      const error = new Error(data?.message || data?.error || 'API request failed');
      error.response = {
        status: res.status,
        data: data
      };
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`❌ API Error [${path}]:`, error);
    throw error;
  }
}

// ============ AUTH API ============
export const authAPI = {
  login: async (credentials) => {
    try {
      console.log('🔐 Đang gọi API login với:', credentials);
      const response = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      console.log('✅ Login response:', response);
      return response;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },
  register: (data) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMe: () => request('/auth/me'),
  changePassword: (data) => request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// ============ APARTMENT API ============
export const apartmentAPI = {
  getAll: (search = '', statusId = '', page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusId) params.set('statusId', statusId);
    params.set('page', page);
    params.set('limit', limit);
    return request(`/apartments?${params.toString()}`);
  },
  getById: (id) => request(`/apartments/${id}`),
  create: (data) => request('/apartments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/apartments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/apartments/${id}`, {
    method: 'DELETE',
  }),
  getStatuses: () => request('/apartments/statuses'),
  getAreas: () => request('/apartments/areas'),
  getStats: () => request('/apartments/stats'),

  // 🏢 Buildings (Căn hộ / Tòa nhà)
  getBuildings: (areaId) => {
    const params = new URLSearchParams();
    if (areaId) params.set('areaId', areaId);
    return request(`/apartments/buildings?${params.toString()}`);
  },
  createBuilding: (data) => request('/apartments/buildings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateBuilding: (id, data) => request(`/apartments/buildings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteBuilding: (id) => request(`/apartments/buildings/${id}`, {
    method: 'DELETE',
  }),

  // 🪜 Floors (Tầng)
  getFloors: (buildingId) => {
    const params = new URLSearchParams();
    if (buildingId) params.set('buildingId', buildingId);
    return request(`/apartments/floors?${params.toString()}`);
  },
  createFloor: (data) => request('/apartments/floors', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteFloor: (id) => request(`/apartments/floors/${id}`, {
    method: 'DELETE',
  }),
};

// ============ CONTRACT API ============
export const contractAPI = {
  getAll: (statusId = '', page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (statusId) params.set('statusId', statusId);
    params.set('page', page);
    params.set('limit', limit);
    return request(`/contracts?${params.toString()}`);
  },
  getById: (id) => request(`/contracts/${id}`),
  create: (data) => request('/contracts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/contracts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/contracts/${id}`, {
    method: 'DELETE',
  }),
  getStatuses: () => request('/contracts/statuses'),
};

// ============ INVOICE API ============
export const invoiceAPI = {
  getAll: (statusId = '', month = '', year = '', page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (statusId) params.set('statusId', statusId);
    if (month) params.set('month', month);
    if (year) params.set('year', year);
    params.set('page', page);
    params.set('limit', limit);
    return request(`/invoices?${params.toString()}`);
  },
  getById: (id) => request(`/invoices/${id}`),
  generate: (data) => request('/invoices/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateStatus: (id, statusId) => request(`/invoices/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ statusId }),
  }),
  processPayment: (data) => request('/invoices/payment', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getStatuses: () => request('/invoices/statuses'),
  getPaymentMethods: () => request('/invoices/payment-methods'),
};

// ============ RESIDENT API ============
export const residentAPI = {
  getAll: (search = '', page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', page);
    params.set('limit', limit);
    return request(`/residents?${params.toString()}`);
  },
  getById: (id) => request(`/residents/${id}`),
  create: (data) => request('/residents', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/residents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/residents/${id}`, {
    method: 'DELETE',
  }),
  getBirthdays: (monthDay) => request(`/residents/birthdays?monthDay=${monthDay}`),
  getByBirthday: (monthDay) => request(`/residents/birthdays?monthDay=${monthDay}`),
  exportExcel: () => request('/residents/export'),
  getIdentity: (residentId) => request(`/residents/${residentId}/identity`),
  updateIdentity: (residentId, data) => request(`/residents/${residentId}/identity`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  uploadIdentityImage: (residentId, file, type) => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type); // 'front' hoặc 'back'
    return request(`/residents/${residentId}/identity/upload`, {
      method: 'POST',
      body: form,
    });
  },

  // 👨‍👩‍👧‍👦 Thành viên hộ gia đình
  getFamilyMembers: (residentId) => request(`/residents/${residentId}/family`),
  addFamilyMember: (residentId, data) => request(`/residents/${residentId}/family`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateFamilyMember: (residentId, memberId, data) => request(`/residents/${residentId}/family/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  removeFamilyMember: (residentId, memberId) => request(`/residents/${residentId}/family/${memberId}`, {
    method: 'DELETE',
  }),

  // 📜 Lịch sử cư trú
  getResidenceHistory: (residentId) => request(`/residents/${residentId}/residence-history`),
};

// ============ SERVICE API ============
export const serviceAPI = {
  getAll: (search = '', categoryId = '') => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId) params.set('categoryId', categoryId);
    return request(`/services?${params.toString()}`);
  },
  getById: (id) => request(`/services/${id}`),
  create: (data) => request('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/services/${id}`, {
    method: 'DELETE',
  }),
  getCategories: () => request('/services/categories'),
  register: (data) => request('/services/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  unregister: (id) => request(`/services/unregister/${id}`, {
    method: 'PUT',
  }),
};

// ============ TICKET API ============
export const ticketAPI = {
  getAll: (statusId = '', page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (statusId) params.set('statusId', statusId);
    params.set('page', page);
    params.set('limit', limit);
    return request(`/tickets?${params.toString()}`);
  },
  getById: (id) => request(`/tickets/${id}`),
  create: (data) => request('/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/tickets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/tickets/${id}`, {
    method: 'DELETE',
  }),
  getMyTickets: (statusId = '') => {
    const params = new URLSearchParams();
    if (statusId) params.set('statusId', statusId);
    return request(`/tickets/my-tickets?${params.toString()}`);
  },
  getStatuses: () => request('/tickets/statuses'),
};

// ============ VEHICLE API ============
export const vehicleAPI = {
  getAll: (residentId = '', vehicleTypeId = '', page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (residentId) params.set('residentId', residentId);
    if (vehicleTypeId) params.set('vehicleTypeId', vehicleTypeId);
    params.set('page', page);
    params.set('limit', limit);
    return request(`/vehicles?${params.toString()}`);
  },
  getById: (id) => request(`/vehicles/${id}`),
  create: (data) => request('/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/vehicles/${id}`, {
    method: 'DELETE',
  }),
  getTypes: () => request('/vehicles/types'),
  getParkingSlots: (areaId = '', vehicleTypeId = '', isOccupied = '') => {
    const params = new URLSearchParams();
    if (areaId) params.set('areaId', areaId);
    if (vehicleTypeId) params.set('vehicleTypeId', vehicleTypeId);
    if (isOccupied !== '') params.set('isOccupied', isOccupied);
    return request(`/vehicles/parking-slots?${params.toString()}`);
  },
};

// ============ NOTIFICATION API ============
export const notificationAPI = {
  getAll: (isRead = '', page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (isRead !== '') params.set('isRead', isRead);
    params.set('page', page);
    params.set('limit', limit);
    return request(`/notifications?${params.toString()}`);
  },
  getById: (id) => request(`/notifications/${id}`),
  create: (data) => request('/notifications', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  markAsRead: (id) => request(`/notifications/${id}/read`, {
    method: 'PUT',
  }),
  markAllAsRead: () => request('/notifications/read-all', {
    method: 'PUT',
  }),
  delete: (id) => request(`/notifications/${id}`, {
    method: 'DELETE',
  }),
  getUnreadCount: () => request('/notifications/unread-count'),
};

// ============ UTILITY API ============
export const utilityAPI = {
  getTypes: () => request('/utilities/types'),
  getPriceTiers: (utilityTypeId) => request(`/utilities/${utilityTypeId}/tiers`),
  getReadings: (apartmentId = '', utilityTypeId = '', month = '', year = '') => {
    const params = new URLSearchParams();
    if (apartmentId) params.set('apartmentId', apartmentId);
    if (utilityTypeId) params.set('utilityTypeId', utilityTypeId);
    if (month) params.set('month', month);
    if (year) params.set('year', year);
    return request(`/utilities/readings?${params.toString()}`);
  },
  createReading: (data) => request('/utilities/readings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// ============ DASHBOARD API ============
export const dashboardAPI = {
  getStats: () => request('/dashboard/stats'),
  getActivities: () => request('/dashboard/activities'),
  getFinancial: () => request('/dashboard/financial'),
};

// ============ USER & PERMISSION API ============
export const userAPI = {
  getEmployees: (search = '', status = '', roleId = '', page = 1, limit = 999) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (roleId) params.set('roleId', roleId);
    params.set('page', page);
    params.set('limit', limit);
    return request(`/users/employees?${params.toString()}`);
  },
  getCurrentUserPermissions: () => {
    return request('/auth/permissions');
  },
  getEmployee: (id) => request(`/users/employees/${id}`),
  createEmployee: (data) => request('/users/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateEmployee: (id, data) => request(`/users/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteEmployee: (id) => request(`/users/employees/${id}`, {
    method: 'DELETE',
  }),
  getRoles: () => request('/users/roles'),
  getRole: (id) => request(`/users/roles/${id}`),
  createRole: (data) => request('/users/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateRole: (id, data) => request(`/users/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteRole: (id) => request(`/users/roles/${id}`, {
    method: 'DELETE',
  }),
  getPermissions: (moduleId) => {
    const params = new URLSearchParams();
    if (moduleId) params.set('moduleId', moduleId);
    return request(`/users/permissions?${params.toString()}`);
  },
  getModules: () => request('/users/modules'),
  getRolePermissions: (roleId) => request(`/users/roles/${roleId}/permissions`),
  updateRolePermissions: (roleId, permissionIds) => request(`/users/roles/${roleId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissionIds }),
  }),
  getAuditLogs: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key]) queryParams.set(key, params[key]);
    });
    return request(`/users/audit-logs?${queryParams.toString()}`);
  },
};

// ============================================
// EXPORT DEFAULT
// ============================================
const api = {
  auth: authAPI,
  apartments: apartmentAPI,
  contracts: contractAPI,
  invoices: invoiceAPI,
  residents: residentAPI,
  services: serviceAPI,
  tickets: ticketAPI,
  vehicles: vehicleAPI,
  notifications: notificationAPI,
  utilities: utilityAPI,
  dashboard: dashboardAPI,
  user: userAPI,
  
  // Shorthands & Helper Functions
  importResidents: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/residents/import-excel', { 
      method: 'POST', 
      body: form 
    });
  },
  scheduleNotification: (data) => request('/notifications/schedule', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  sendNotification: (data) => request('/notifications/send', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  history: () => request('/notifications/history'),
  schedules: () => request('/notifications/schedules'),
  createTicket: (data) => ticketAPI.create(data),
  updateTicketStatus: (id, statusId) => request(`/tickets/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ statusId }),
  }),
  createVehicle: (data) => vehicleAPI.create(data),
  getAvailableSlots: (vehicleType) => {
    const params = new URLSearchParams();
    if (vehicleType) params.set('vehicleType', vehicleType);
    params.set('isOccupied', '0');
    return request(`/vehicles/parking-slots?${params.toString()}`);
  },
};

export default api;