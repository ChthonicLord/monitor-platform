import { useEffect, useState } from 'react';
import { api } from '../services/api';

// ---- 趋势百分比计算 ----
function calcTrend(current: number, previous: number): { pct: string; up: boolean; neutral: boolean } {
  if (previous === 0 && current === 0) return { pct: '—', up: false, neutral: true };
  if (previous === 0) return { pct: '+∞', up: true, neutral: false };
  const diff = ((current - previous) / previous) * 100;
  const pct = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
  return { pct, up: diff > 0, neutral: diff === 0 };
}

// ---- 统计卡片组件 ----
function StatCard({
  icon, color, iconColor, label, value, prevValue,
}: {
  icon: string; color: string; iconColor: string; label: string; value: number; prevValue?: number;
}) {
  const trend = prevValue !== undefined ? calcTrend(value, prevValue) : null;

  return (
    <div className="bento-card p-5 flex flex-col justify-between group hover:border-outline transition-colors" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <span className="material-symbols-outlined" style={{ color: iconColor }}>{icon}</span>
        </div>
        {trend && (
          <span className={`text-[12px] font-semibold flex items-center gap-1 ${
            trend.neutral ? 'text-text-muted' : trend.up ? 'text-error' : 'text-success'
          }`}>
            <span className="material-symbols-outlined text-[16px]">
              {trend.neutral ? 'remove' : trend.up ? 'trending_up' : 'trending_down'}
            </span>
            {trend.pct}
          </span>
        )}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-text-secondary mb-2 uppercase tracking-wider">{label}</p>
        <h3 className="stat-display" style={{ color }}>{value.toLocaleString()}</h3>
      </div>
    </div>
  );
}

// ---- 数据表格组件 ----
function DataTable({
  title, linkTo, linkLabel, columns, rows, emptyText,
}: {
  title: string; linkTo?: string; linkLabel?: string;
  columns: string[]; rows: any[][]; emptyText?: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col fade-in">
      <div className="p-5 border-b border-border flex justify-between items-center">
        <h4 className="text-[16px] font-headline font-semibold">{title}</h4>
        {linkTo && (
          <a href={linkTo} className="text-primary text-[12px] font-semibold hover:underline">
            {linkLabel || 'View All'}
          </a>
        )}
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low">
              {columns.map((col, i) => (
                <th key={i} className="px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                {row.map((cell, j) => (
                  <td key={j} className="px-5 py-3 text-[13px]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-text-muted text-[13px]">
                  {emptyText || 'No data'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RealtimeDashboard() {
  const [data, setData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
    api.getAlerts.active().then((d: any) => setAlerts(d?.alerts || [])).catch(() => {});
    const timer = setInterval(() => {
      api.getDashboard().then(setData).catch(() => {});
      api.getAlerts.active().then((d: any) => setAlerts(d?.alerts || [])).catch(() => {});
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  // 数据为空时也渲染完整框架，数值兜底 0
  const counts = data?.eventCounts || {};
  const prevCounts = data?.prevEventCounts || {};
  const errorBreakdown = data?.errorBreakdown || {};
  const recentErrors = data?.recentErrors?.list || [];
  const perfSummary = data?.performanceSummary || [];

  // 错误率计算
  const totalEvents = (counts.error || 0) + (counts.performance || 0) + (counts.behavior || 0) + (counts.resource || 0) + (counts.custom || 0);
  const errorRate = totalEvents > 0 ? ((counts.error || 0) / totalEvents * 100).toFixed(1) : '0.0';
  const errorTotal = Object.values(errorBreakdown).reduce((s: number, v) => s + (v as number), 0) || 0;

  return (
    <div className="fade-in space-y-8">
      <div>
        <h2 className="text-[22px] font-headline font-semibold text-on-surface tracking-[-0.01em]">
          Dashboard Overview
        </h2>
        <p className="text-[13px] text-text-muted mt-1">
          Real-time monitoring across all applications
        </p>
      </div>

      {/* ---- Stat Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          icon="people"
          color="#7c3aed"
          iconColor="#7c3aed"
          label="Unique Visitors (1h)"
          value={data?.uniqueUsers || 0}
        />
        <StatCard
          icon="bug_report"
          color="#DC2626"
          iconColor="#DC2626"
          label="Errors (1h)"
          value={counts.error || 0}
          prevValue={prevCounts.error}
        />
        <StatCard
          icon="insights"
          color="#0f62fe"
          iconColor="#0f62fe"
          label="Performance"
          value={counts.performance || 0}
          prevValue={prevCounts.performance}
        />
        <StatCard
          icon="mouse"
          color="#16A34A"
          iconColor="#16A34A"
          label="Behaviors"
          value={counts.behavior || 0}
          prevValue={prevCounts.behavior}
        />
        <StatCard
          icon="cloud_queue"
          color="#0891b2"
          iconColor="#0891b2"
          label="Resources"
          value={counts.resource || 0}
          prevValue={prevCounts.resource}
        />
      </div>

      {/* ---- Error Breakdown ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bento-card p-6">
          <div className="mb-4">
            <h3 className="text-[16px] font-headline font-semibold text-text-primary">Error Type Distribution</h3>
            <p className="text-[11px] text-text-muted mt-1">
              {errorTotal} errors in the last hour
            </p>
          </div>
          <div className="space-y-4">
            {Object.entries(errorBreakdown).length === 0 ? (
              <p className="text-text-muted text-[13px] py-4 text-center">No errors</p>
            ) : (
              Object.entries(errorBreakdown)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([type, count], i) => {
                  const pct = errorTotal > 0 ? ((count as number) / errorTotal * 100).toFixed(0) : '0';
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-text-secondary w-24 shrink-0">{type}</span>
                      <div className="flex-1 h-3 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            type === 'ApiError' ? 'bg-warning' :
                            type === 'PromiseError' ? 'bg-error' :
                            type === 'SyntaxError' ? 'bg-secondary' :
                            type === 'TypeError' ? 'bg-tertiary' :
                            'bg-primary'
                          }`}
                          style={{ width: `${Math.max((count as number) / errorTotal * 100, 2)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-text-primary w-12 text-right">{count as number}</span>
                      <span className="text-[10px] text-text-muted w-8 text-right">{pct}%</span>
                    </div>
                  );
                })
            )}
          </div>
        </div>
        <div className="bento-card p-6 flex flex-col justify-center items-center text-center">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Error Rate</span>
          <div className="stat-display text-error">{errorRate}%</div>
          <div className="mt-4 px-4 py-2 bg-error-container/50 rounded-full text-[11px] text-error font-semibold">
            {counts.error || 0} errors / {totalEvents} events
          </div>
          <p className="text-[12px] text-text-muted mt-3">
            {Number(errorRate) < 1 ? 'Healthy — error rate below 1%' :
             Number(errorRate) < 5 ? 'Warning — error rate elevated' :
             'Critical — investigate immediately'}
          </p>
        </div>
      </div>

      {/* ---- Active Alerts ---- */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[16px] font-headline font-semibold text-text-primary">
            Active Alerts ({alerts.length})
          </h3>
          {alerts.map((a: any) => (
            <div key={a.id} className={`bento-card p-4 flex items-center gap-4 ${
              a.level === 'P0' ? 'border-l-4 border-l-error bg-error-container/20' :
              a.level === 'P1' ? 'border-l-4 border-l-warning bg-warning/5' :
              a.level === 'P2' ? 'border-l-4 border-l-warning/60 bg-warning/5' :
              'border-l-4 border-l-primary bg-primary-fixed/20'
            }`}>
              <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase ${
                a.level === 'P0' ? 'bg-error text-on-error' :
                a.level === 'P1' ? 'bg-warning text-white' :
                a.level === 'P2' ? 'bg-warning/70 text-white' :
                'bg-primary text-on-primary'
              }`}>{a.level}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-text-primary">{a.message}</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {new Date(a.triggeredAt).toLocaleTimeString()}
                </p>
              </div>
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                a.level === 'P0' ? 'bg-error' : 'bg-warning'
              }`} />
            </div>
          ))}
        </div>
      )}

      {/* ---- Tables ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <DataTable
          title="Recent 10 Errors"
          linkTo="/page-detail"
          columns={['Type', 'Message', 'Time']}
          rows={recentErrors.map((e: any) => [
            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
              e.eventType === 'error'
                ? 'bg-error-container text-error'
                : 'bg-surface-container-high text-text-secondary'
            }`}>
              {e.eventType}
            </span>,
            <span className="font-medium">{e.data?.message?.slice(0, 80) || '-'}</span>,
            <span className="text-text-muted">{new Date(e.timestamp).toLocaleTimeString()}</span>,
          ])}
          emptyText="No errors — great job!"
        />

        <DataTable
          title="Performance Overview"
          linkTo="/performance"
          linkLabel="Detailed Report"
          columns={['Date', 'Count', 'Avg (ms)', 'P50', 'P95', 'P99']}
          rows={perfSummary.map((b: any) => [
            <span className="font-medium">{b.key}</span>,
            b.count,
            b.avg,
            b.p50,
            <span className={b.p95 > 200 ? 'text-warning font-semibold' : 'text-success'}>{b.p95}</span>,
            b.p99,
          ])}
          emptyText="No performance data yet"
        />
      </div>
    </div>
  );
}
