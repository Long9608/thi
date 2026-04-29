const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...options
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

  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : data?.title || data?.message || 'API request failed');
  }

  return data;
}

export const api = {
  dashboard: () => request('/dashboard'),
  residents: (search = '', page = 1, pageSize = 10) => request(`/residents?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`),
  birthdayResidents: (monthDay) => request(`/residents/birthdays?monthDay=${encodeURIComponent(monthDay)}`),
  apartments: (search = '', status = '') => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return request(`/apartments?${params.toString()}`);
  },
  history: () => request('/notifications/history'),
  schedules: () => request('/notifications/schedules'),
  sendNotification: (body) => request('/notifications/send', { method: 'POST', body: JSON.stringify(body) }),
  scheduleNotification: (body) => request('/notifications/schedule', { method: 'POST', body: JSON.stringify(body) }),
  importResidents: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/residents/import-excel', { method: 'POST', body: form });
  }
};
