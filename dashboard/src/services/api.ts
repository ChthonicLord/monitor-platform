/* ================================================================
 *  API 服务层 —— 后端数据查询
 * ================================================================ */

const BASE = '/api/query';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  /** 实时大盘数据 */
  getDashboard(appId?: string) {
    const params = appId ? `?appId=${appId}` : '';
    return fetchJson<any>(`${BASE}/dashboard${params}`);
  },

  /** 错误列表 */
  getErrors(params: Record<string, string | number>) {
    const qs = new URLSearchParams(params as any).toString();
    return fetchJson<any>(`${BASE}/errors?${qs}`);
  },

  /** 性能数据 */
  getPerformance(params: Record<string, string | number>) {
    const qs = new URLSearchParams(params as any).toString();
    return fetchJson<any>(`${BASE}/performance?${qs}`);
  },

  /** 行为数据 */
  getBehaviors(params: Record<string, string | number>) {
    const qs = new URLSearchParams(params as any).toString();
    return fetchJson<any>(`${BASE}/behaviors?${qs}`);
  },

  /** 资源数据 */
  getResources(params: Record<string, string | number>) {
    const qs = new URLSearchParams(params as any).toString();
    return fetchJson<any>(`${BASE}/resources?${qs}`);
  },

  /** 告警 */
  getAlerts: {
    active: () => fetchJson<any>('/api/alerts/active'),
    history: (limit?: number) => fetchJson<any>(`/api/alerts/history${limit ? `?limit=${limit}` : ''}`),
    rules: () => fetchJson<any>('/api/alerts/rules'),
  },
};
