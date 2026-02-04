import type {
  StatusResponse,
  Signal,
  Trade,
  Position,
  PaginatedResponse,
  SignalStats,
  TradeStats,
  ControlStatus,
} from '@/types';

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const apiKey = localStorage.getItem('apiKey') || '';
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  getStatus: () => fetchApi<StatusResponse>('/status'),

  getSignals: (params?: { status?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString();
    return fetchApi<PaginatedResponse<Signal>>(`/signals${query ? `?${query}` : ''}`);
  },

  getSignalStats: () => fetchApi<SignalStats>('/signals/stats'),

  getSignal: (id: string) => fetchApi<Signal>(`/signals/${id}`),

  getTrades: (params?: { status?: string; exchange?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.exchange) searchParams.set('exchange', params.exchange);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString();
    return fetchApi<PaginatedResponse<Trade>>(`/trades${query ? `?${query}` : ''}`);
  },

  getTradeStats: () => fetchApi<TradeStats>('/trades/stats'),

  getPositions: () => fetchApi<{ data: Position[]; count: number }>('/positions'),

  getPositionHistory: (params?: {
    limit?: number;
    offset?: number;
    status?: 'open' | 'closed';
    orderBy?: 'openedAt' | 'closedAt';
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.orderBy) searchParams.set('orderBy', params.orderBy);
    const query = searchParams.toString();
    return fetchApi<PaginatedResponse<Position>>(`/positions/history${query ? `?${query}` : ''}`);
  },

  closePosition: (symbol: string, side: 'LONG' | 'SHORT') =>
    fetchApi<{ success: boolean; message: string }>(`/positions/${symbol}/close`, {
      method: 'POST',
      body: JSON.stringify({ side }),
    }),

  pause: () => fetchApi<{ success: boolean; message: string }>('/control/pause', { method: 'POST' }),

  resume: () => fetchApi<{ success: boolean; message: string }>('/control/resume', { method: 'POST' }),

  getControlStatus: () => fetchApi<ControlStatus>('/control/status'),
};
