import { useEffect, useState } from 'react';
import { api } from '../services/api';

const TABS = ['errors', 'behaviors', 'resources'] as const;
const TAB_LABELS: Record<string, string> = {
  errors: 'Error Logs',
  behaviors: 'Behavior Logs',
  resources: 'Resource Logs',
};
const TAB_ICONS: Record<string, string> = {
  errors: 'bug_report',
  behaviors: 'mouse',
  resources: 'cloud_queue',
};

// ---- 小统计卡片 ----
function MiniStatCard({
  icon, color, label, value, active,
}: {
  icon: string; color: string; label: string; value: number; active?: boolean;
}) {
  return (
    <div className={`bento-card p-4 flex items-center gap-4 transition-colors`}
      style={{ borderTop: `3px solid ${color}`, ...(active ? { borderLeft: `3px solid ${color}`, boxShadow: `0 0 0 1px ${color}30` } : {}) }}>
      <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${color}15` }}>
        <span className="material-symbols-outlined text-[20px]" style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{label}</p>
        <h3 className="text-[24px] font-headline font-bold leading-tight" style={{ color }}>
          {value.toLocaleString()}
        </h3>
      </div>
    </div>
  );
}

export default function PageDetail() {
  const [tab, setTab] = useState<string>('errors');
  const [data, setData] = useState<any>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 获取各类型事件总量
  useEffect(() => {
    api.getDashboard().then((d: any) => {
      setCounts(d?.eventCounts || {});
    }).catch(() => {});
    const timer = setInterval(() => {
      api.getDashboard().then((d: any) => {
        setCounts(d?.eventCounts || {});
      }).catch(() => {});
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  // 切换 tab 时加载分页数据
  useEffect(() => {
    setLoading(true);
    setPage(1);
    const apiMap: Record<string, any> = {
      errors: api.getErrors,
      behaviors: api.getBehaviors,
      resources: api.getResources,
    };
    apiMap[tab]?.({ page: 1, pageSize: 20 })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab]);

  const loadPage = (p: number) => {
    setLoading(true);
    setPage(p);
    const apiMap: Record<string, any> = {
      errors: api.getErrors,
      behaviors: api.getBehaviors,
      resources: api.getResources,
    };
    apiMap[tab]?.({ page: p, pageSize: 20 })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const totalAll = (counts.error || 0) + (counts.behavior || 0) + (counts.resource || 0) + (counts.performance || 0);

  return (
    <div className="fade-in space-y-6">
      <div>
        <h2 className="text-[22px] font-headline font-semibold text-on-surface tracking-[-0.01em]">
          Event Logs
        </h2>
        <p className="text-[13px] text-text-muted mt-1">
          Browse and search all captured events
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStatCard
          icon="analytics"
          color="#7c3aed"
          label="Total Events"
          value={totalAll}
        />
        <MiniStatCard
          icon="bug_report"
          color="#DC2626"
          label="Errors"
          value={counts.error || 0}
          active={tab === 'errors'}
        />
        <MiniStatCard
          icon="mouse"
          color="#16A34A"
          label="Behaviors"
          value={counts.behavior || 0}
          active={tab === 'behaviors'}
        />
        <MiniStatCard
          icon="cloud_queue"
          color="#0891b2"
          label="Resources"
          value={counts.resource || 0}
          active={tab === 'resources'}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${
              tab === t
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface text-text-secondary border border-border hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{TAB_ICONS[t]}</span>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted animate-pulse">
            Loading...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border">
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      Event ID
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      Page
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider text-right">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.list || []).map((item: any, i: number) => (
                    <tr
                      key={i}
                      className="hover:bg-primary/5 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3">
                        <span className="font-mono text-[11px] text-text-muted">
                          {item.id?.slice(0, 18)}...
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          item.eventType === 'error'
                            ? 'bg-error-container text-error'
                            : item.eventType === 'behavior'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-surface-container-high text-text-secondary'
                        }`}>
                          {item.eventType}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">
                            {item.eventType === 'error' ? 'error' : item.eventType === 'behavior' ? 'mouse' : 'link'}
                          </span>
                          <span className="text-[13px] max-w-[300px] truncate">
                            {item.data?.message?.slice(0, 60) ||
                              item.data?.behaviorType ||
                              item.data?.resourceUrl?.slice(0, 50) ||
                              '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[12px] text-text-muted max-w-[200px] truncate block">
                          {item.data?.pageUrl?.slice(0, 40) || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-[12px] text-text-muted">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data?.list || data.list.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-[48px] text-text-muted/30">
                            {tab === 'errors' ? 'check_circle' : 'inbox'}
                          </span>
                          <span className="text-text-muted text-[13px]">
                            {tab === 'errors' ? 'No errors found — everything is running smoothly' : 'No data yet'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-border flex items-center justify-between">
                <span className="text-[12px] text-text-muted">
                  Page {page} of {totalPages} ({total} records)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => loadPage(page - 1)}
                    className="px-4 py-2 text-[12px] font-semibold border border-border rounded-lg bg-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => loadPage(page + 1)}
                    className="px-4 py-2 text-[12px] font-semibold border border-border rounded-lg bg-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
