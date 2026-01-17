const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  // Only set Content-Type for requests with a body
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Not authenticated');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Settings
export interface AppSettings {
  locale: 'en' | 'de';
}

export const settings = {
  get: () =>
    request<AppSettings>('/settings'),

  update: (data: Partial<AppSettings>) =>
    request<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Auth
export const auth = {
  login: (password: string) =>
    request<{ success: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  status: () =>
    request<{ authenticated: boolean }>('/auth/status'),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// Templates
export interface Template {
  id: string;
  title: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  carryPolicy: 'FAIL_ON_MISS' | 'CARRY_OVER_STACK';
  scheduleType: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'INTERVAL';
  startDate: string | null;
  anchorDate: string | null;
  intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null;
  intervalValue: number | null;
  weeklyDays: string | null;
  monthlyDay: number | null;
  monthlyMode: 'FIRST_DAY' | 'LAST_DAY' | 'SPECIFIC_DAY' | null;
  yearlyMonth: number | null;
  yearlyDay: number | null;
  dueTime: string | null;
  tags: string | null;
  color: string | null;
  sortOrder: number;
}

export interface CreateTemplateInput {
  title: string;
  notes?: string | null;
  carryPolicy?: 'FAIL_ON_MISS' | 'CARRY_OVER_STACK';
  scheduleType: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'INTERVAL';
  startDate?: string | null;
  anchorDate?: string | null;
  intervalUnit?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null;
  intervalValue?: number | null;
  weeklyDays?: string | null;
  monthlyDay?: number | null;
  monthlyMode?: 'FIRST_DAY' | 'LAST_DAY' | 'SPECIFIC_DAY' | null;
  yearlyMonth?: number | null;
  yearlyDay?: number | null;
  dueTime?: string | null;
  tags?: string | null;
  color?: string | null;
  sortOrder?: number;
}

export const templates = {
  list: (params?: { status?: string; type?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.search) query.set('search', params.search);
    const queryString = query.toString();
    return request<Template[]>(`/templates${queryString ? `?${queryString}` : ''}`);
  },

  get: (id: string) =>
    request<Template & { instances: Instance[] }>(`/templates/${id}`),

  create: (data: CreateTemplateInput) =>
    request<Template>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateTemplateInput> & { isActive?: boolean }) =>
    request<Template>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  duplicate: (id: string, options?: { includeSchedule?: boolean; newTitle?: string }) =>
    request<Template>(`/templates/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  delete: (id: string, hard = false) =>
    request<void>(`/templates/${id}${hard ? '?hard=true' : ''}`, {
      method: 'DELETE',
    }),
};

// Instances
export interface Instance {
  id: string;
  templateId: string;
  date: string;
  status: 'OPEN' | 'DONE' | 'FAILED' | 'DELETED';
  completedAt: string | null;
  createdAt: string;
  // Instance-level overrides (null = use template value)
  customTitle?: string | null;
  customNotes?: string | null;
  template: {
    id: string;
    title: string;
    notes?: string | null;
    carryPolicy: 'FAIL_ON_MISS' | 'CARRY_OVER_STACK';
    scheduleType: string;
    dueTime?: string | null;
    tags?: string | null;
    color?: string | null;
  };
}

export interface DashboardData {
  today: {
    overdue: Instance[];
    open: Instance[];
    done: Instance[];
    failed: Instance[];
  };
  tomorrow: {
    open: Instance[];
    done: Instance[];
  };
}

export interface UpdateInstanceInput {
  customTitle?: string | null;
  customNotes?: string | null;
  date?: string;
}

export const instances = {
  dashboard: () =>
    request<DashboardData>('/dashboard'),

  list: (from: string, to: string) =>
    request<Instance[]>(`/instances?from=${from}&to=${to}`),

  complete: (id: string) =>
    request<Instance>(`/instances/${id}/complete`, {
      method: 'POST',
    }),

  uncomplete: (id: string) =>
    request<Instance>(`/instances/${id}/uncomplete`, {
      method: 'POST',
    }),

  snooze: (id: string, toDate?: string) =>
    request<Instance>(`/instances/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ toDate }),
    }),

  update: (id: string, data: UpdateInstanceInput) =>
    request<Instance>(`/instances/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/instances/${id}`, {
      method: 'DELETE',
    }),

  rebuild: (from: string, to: string) =>
    request<{ message: string; generatedCount: number; failedCount: number }>(
      `/rebuild-instances?from=${from}&to=${to}`,
      { method: 'POST' }
    ),
};
