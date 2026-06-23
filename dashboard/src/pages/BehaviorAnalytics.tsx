import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';

// ---- 摘要卡片 ----
function SummaryCard({ icon, color, label, value, subtitle }: {
  icon: string; color: string; label: string; value: string; subtitle?: string;
}) {
  return (
    <div className="bento-card p-6 flex flex-col justify-center items-center text-center" style={{ borderTop: `3px solid ${color}` }}>
      <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: `${color}15` }}>
        <span className="material-symbols-outlined text-[28px]" style={{ color }}>{icon}</span>
      </div>
      <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">{label}</span>
      <div className="stat-display" style={{ color }}>{value}</div>
      {subtitle && <div className="mt-3 px-3 py-1 bg-surface-container-low rounded-full text-[11px] text-text-muted">{subtitle}</div>}
    </div>
  );
}

// ---- 点击热力柱状图 ----
function ClickRanking({ items }: { items: [string, number][] }) {
  const maxVal = items[0]?.[1] || 1;

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-text-muted text-[13px] py-8 text-center">No click data yet</p>
      ) : (
        items.map(([sel, count], i) => (
          <div key={i} className="flex items-center gap-3 group">
            <span className="text-[11px] font-bold text-text-muted w-5 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <span className="text-[12px] font-mono text-text-secondary truncate max-w-[350px]" title={sel}>
                  {sel}
                </span>
                <span className="text-[12px] font-semibold text-primary ml-2 shrink-0">{count}</span>
              </div>
              <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/80 group-hover:bg-primary rounded-full transition-all"
                  style={{ width: `${Math.max((count / maxVal) * 100, 2)}%` }}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ---- 行为类型分布条 ----
function BehaviorDistribution({ stats }: { stats: { label: string; count: number; color: string }[] }) {
  const total = stats.reduce((s, st) => s + st.count, 0) || 1;

  return (
    <div className="space-y-4">
      {stats.map((st, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-text-secondary w-20 shrink-0">{st.label}</span>
          <div className="flex-1 h-3 bg-surface-container rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${st.color}`}
              style={{ width: `${(st.count / total) * 100}%` }}
            />
          </div>
          <span className="text-[12px] font-semibold text-text-primary w-10 text-right">{st.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function BehaviorAnalytics() {
  const [behaviors, setBehaviors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getBehaviors({ page: 1, pageSize: 200 })
      .then((b) => setBehaviors(b?.list || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 各类行为统计
  const stats = useMemo(() => {
    let clicks = 0, navigates = 0, inputs = 0, scrolls = 0, dwells = 0;
    let dwellTotal = 0, dwellCount = 0;
    const clickMap: Record<string, number> = {};

    for (const e of behaviors) {
      const bt = e.data?.behaviorType;
      if (bt === 'click') { clicks++; const sel = e.data?.selector; if (sel) clickMap[sel] = (clickMap[sel] || 0) + 1; }
      else if (bt === 'navigate') navigates++;
      else if (bt === 'input') inputs++;
      else if (bt === 'scroll') scrolls++;
      else if (bt === 'dwell') { dwells++; if (e.data?.duration) { dwellTotal += e.data.duration; dwellCount++; } }
    }

    const uv = new Set(behaviors.map((e: any) => e.data?.userInfo?.userId).filter(Boolean)).size;
    const avgDwell = dwellCount > 0 ? Math.round(dwellTotal / dwellCount / 1000) : 0;
    const topClicks = Object.entries(clickMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { clicks, navigates, inputs, scrolls, dwells, uv, avgDwell, topClicks, total: behaviors.length };
  }, [behaviors]);

  // 最近事件
  const recentBehaviors = behaviors.slice(0, 20);

  const distribution = [
    { label: 'Navigate', count: stats.navigates, color: 'bg-primary' },
    { label: 'Click', count: stats.clicks, color: 'bg-[#4f46e5]' },
    { label: 'Scroll', count: stats.scrolls, color: 'bg-warning' },
    { label: 'Input', count: stats.inputs, color: 'bg-success' },
    { label: 'Dwell', count: stats.dwells, color: 'bg-[#9333ea]' },
  ];

  return (
    <div className="fade-in max-w-[1400px] mx-auto space-y-6">
      {/* ---- Header ---- */}
      <div>
        <h2 className="text-[32px] font-headline font-bold text-text-primary tracking-[-0.02em] leading-tight">
          User Behavior Analytics
        </h2>
        <p className="text-[14px] text-text-secondary mt-1">
          Page views, clicks, dwell time, and interaction patterns
        </p>
      </div>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SummaryCard
          icon="people"
          color="#7c3aed"
          label="Unique Visitors"
          value={stats.uv.toLocaleString()}
          subtitle="Last 200 events"
        />
        <SummaryCard
          icon="visibility"
          color="#0f62fe"
          label="Page Views"
          value={stats.navigates.toLocaleString()}
        />
        <SummaryCard
          icon="touch_app"
          color="#16A34A"
          label="Total Clicks"
          value={stats.clicks.toLocaleString()}
          subtitle={`${stats.topClicks.length} unique elements`}
        />
        <SummaryCard
          icon="hourglass_bottom"
          color="#EA580C"
          label="Avg Dwell Time"
          value={`${stats.avgDwell}s`}
          subtitle={`${stats.dwells} dwell events`}
        />
      </div>

      {/* ---- Charts Row ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Behavior Distribution */}
        <div className="bento-card p-6">
          <div className="mb-4">
            <h3 className="text-[16px] font-headline font-semibold text-text-primary">
              Behavior Distribution
            </h3>
            <p className="text-[11px] text-text-muted mt-1">
              Event type breakdown ({stats.total} total)
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-[180px] text-text-muted animate-pulse">Loading...</div>
          ) : (
            <BehaviorDistribution stats={distribution} />
          )}
        </div>

        {/* Top Clicked Elements */}
        <div className="bento-card p-6">
          <div className="mb-4">
            <h3 className="text-[16px] font-headline font-semibold text-text-primary">
              Top Clicked Elements
            </h3>
            <p className="text-[11px] text-text-muted mt-1">
              Most interacted UI components
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-[180px] text-text-muted animate-pulse">Loading...</div>
          ) : (
            <ClickRanking items={stats.topClicks} />
          )}
        </div>
      </div>

      {/* ---- Recent Events Table ---- */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-surface-container-lowest">
          <div>
            <h3 className="text-[16px] font-headline font-semibold text-text-primary">
              Recent Behavior Events
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Latest {recentBehaviors.length} captured events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted">Live</span>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-text-secondary">
                <th className="px-5 py-3 text-[11px] font-bold uppercase">Type</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase">Target</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase">Page</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentBehaviors.map((e: any, i: number) => (
                <tr key={i} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      e.data?.behaviorType === 'dwell' ? 'bg-warning/10 text-warning' :
                      e.data?.behaviorType === 'click' ? 'bg-primary/10 text-primary' :
                      e.data?.behaviorType === 'navigate' ? 'bg-success/10 text-success' :
                      'bg-surface-container-high text-text-secondary'
                    }`}>
                      {e.data?.behaviorType || e.eventType}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[13px] text-text-secondary max-w-[250px] truncate block">
                      {e.data?.behaviorType === 'dwell'
                        ? `${Math.round((e.data?.duration || 0) / 1000)}s`
                        : e.data?.behaviorType === 'navigate'
                        ? e.data?.url?.slice(-40) || '-'
                        : e.data?.selector?.slice(-40) || e.data?.text?.slice(0, 40) || '-'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-[12px] text-text-muted max-w-[200px] truncate block">
                      {e.data?.pageUrl?.split('/').pop()?.slice(0, 30) || '-'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[12px] text-text-muted">
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </span>
                  </td>
                </tr>
              ))}
              {recentBehaviors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-[48px] text-text-muted/20">inbox</span>
                      <span className="text-text-muted text-[13px]">Interact with the page to see behavior data</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
