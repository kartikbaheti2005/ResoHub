import {
  User,
  Resource,
  ResourceCategory,
  TimetableEntry,
  BookingRequest,
  MaintenanceSchedule,
  NotificationItem,
  TimeSlotStatus,
  DashboardMetrics,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('resohub_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => ({ error: 'An unexpected error occurred' }));
      let errorMessage = 'An unexpected error occurred';
      if (typeof data.error === 'string') {
        errorMessage = data.error;
      } else if (data.error && typeof data.error.message === 'string') {
        errorMessage = data.error.message;
      } else if (typeof data.message === 'string') {
        errorMessage = data.message;
      } else if (typeof data.reason === 'string') {
        errorMessage = data.reason;
      } else if (typeof data.error === 'object' && data.error !== null) {
        errorMessage = data.error.code || JSON.stringify(data.error);
      }
      throw new Error(errorMessage);
    } else {
      const text = await res.text().catch(() => '');
      throw new Error(`Server returned HTTP ${res.status}: ${text.substring(0, 100)}`);
    }
  }

  if (contentType.includes('application/json')) {
    return res.json();
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Server response was not valid JSON.');
  }
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  register: async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    department?: string;
  }): Promise<{ token: string; user: User }> => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getMe: async (): Promise<{ user: User }> => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Categories
  getCategories: async (): Promise<ResourceCategory[]> => {
    const res = await fetch(`${API_BASE}/resources/categories`);
    return handleResponse(res);
  },

  // Resources
  getResources: async (params?: {
    category?: string;
    search?: string;
    minCapacity?: number;
    status?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    requiredEquipment?: string[];
  }): Promise<Resource[]> => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.minCapacity) query.append('minCapacity', String(params.minCapacity));
    if (params?.status) query.append('status', params.status);
    if (params?.date) query.append('date', params.date);
    if (params?.startTime) query.append('startTime', params.startTime);
    if (params?.endTime) query.append('endTime', params.endTime);
    if (params?.requiredEquipment && params.requiredEquipment.length > 0) {
      query.append('requiredEquipment', params.requiredEquipment.join(','));
    }

    const res = await fetch(`${API_BASE}/resources?${query.toString()}`);
    return handleResponse(res);
  },

  getResourceById: async (id: string): Promise<Resource> => {
    const res = await fetch(`${API_BASE}/resources/${id}`);
    return handleResponse(res);
  },

  createResource: async (data: Partial<Resource>): Promise<Resource> => {
    const res = await fetch(`${API_BASE}/resources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateResource: async (id: string, data: Partial<Resource>): Promise<Resource> => {
    const res = await fetch(`${API_BASE}/resources/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteResource: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/resources/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Availability & Conflicts
  getResourceAvailability: async (
    resourceId: string,
    date: string
  ): Promise<{ resourceId: string; resourceName: string; date: string; timeline: TimeSlotStatus[] }> => {
    const res = await fetch(`${API_BASE}/resources/${resourceId}/availability?date=${date}`);
    return handleResponse(res);
  },

  checkConflict: async (data: {
    resourceId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeBookingId?: string;
  }): Promise<{ hasConflict: boolean; reason?: string; details?: string }> => {
    const res = await fetch(`${API_BASE}/resources/check-conflict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Timetable
  getTimetable: async (resourceId?: string): Promise<TimetableEntry[]> => {
    const url = resourceId ? `${API_BASE}/timetable?resourceId=${resourceId}` : `${API_BASE}/timetable`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  addTimetableEntry: async (data: Partial<TimetableEntry>): Promise<TimetableEntry> => {
    const res = await fetch(`${API_BASE}/timetable`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteTimetableEntry: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/timetable/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Bookings
  getBookings: async (params?: { status?: string; resourceId?: string }): Promise<BookingRequest[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.resourceId) query.append('resourceId', params.resourceId);

    const res = await fetch(`${API_BASE}/bookings?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  createBookingRequest: async (data: {
    resourceId: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
    description?: string;
    expectedCount?: number;
    requiredEquipment?: string[];
  }): Promise<BookingRequest> => {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateBookingStatus: async (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string
  ): Promise<BookingRequest> => {
    const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    return handleResponse(res);
  },

  cancelBooking: async (id: string): Promise<BookingRequest> => {
    const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Maintenance & Dashboard
  getMaintenanceSchedules: async (): Promise<MaintenanceSchedule[]> => {
    const res = await fetch(`${API_BASE}/maintenance`);
    return handleResponse(res);
  },

  createMaintenanceSchedule: async (data: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule> => {
    const res = await fetch(`${API_BASE}/maintenance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const res = await fetch(`${API_BASE}/metrics/dashboard`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Notifications
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  markNotificationAsRead: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  markAllNotificationsAsRead: async (): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
