import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';

const METRICS = [
  { key: 'firstContentfulPaint', label: 'FCP', unit: 'ms', desc: 'First Contentful Paint' },
  { key: 'largestContentfulPaint', label: 'LCP', unit: 'ms', desc: 'Largest Contentful Paint' },
  { key: 'firstInputDelay', label: 'FID', unit: 'ms', desc: 'First Input Delay' },
  { key: 'cumulativeLayoutShift', label: 'CLS', unit: '', desc: 'Cumulative Layout Shift' },
  { key: 'ttfb', label: 'TTFB', unit: 'ms', desc: 'Time to First Byte' },
  { key: 'dnsTime', label: 'DNS', unit: 'ms', desc: 'DNS Lookup' },
  { key: 'tcpTime', label: 'TCP', unit: 'ms', desc: 'TCP Connect' },
  { key: 'domParseTime', label: 'DOM Parse', unit: 'ms', desc: 'DOM Parsing' },
  { key: 'loadComplete', label: 'Page Load', unit: 'ms', desc: 'Full Page Load' },
];

// ---- 柱状图组件 ----
function BarChart({ buckets, maxBarHeight = 120 }: { buckets: any[]; maxBarHeight?: number }) {
  const maxVal = Math.max(...buckets.map((b) => b.avg), 1);

  return (
    <div className="flex items-end gap-1 h-[140px] px-2">
      {buckets.length === 0 ? (
        <div className="flex items-center justify-center w-full h-full text-text-muted text-[12px]">
          No data
        </div>
      ) : (
        buckets.map((b, i) => {
          const h = Math.max((b.avg / maxVal) * maxBarHeight, 4);
          return (
            <div key={i} className="flex-1 flex flex-col items-center group" title={`${b.key}: ${b.avg}ms`}>
              <span className="text-[9px] text-text-muted mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {b.avg}ms
              </span>
              <div
                className="w-full bg-primary/80 hover:bg-primary rounded-t transition-colors"
                style={{ height: `${h}px` }}
              />
              <span className="text-[9px] text-text-muted mt-1 truncate w-full text-center">
                {b.key?.slice(-5) || '-'}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function PerformanceTrend() {
  const [metric, setMetric] = useState('ttfb');
  const [groupBy, setGroupBy] = useState<'day' | 'hour'>('day');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getPerformance({ metric, groupBy })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [metric, groupBy]);

  const buckets = data?.buckets || [];

  // 摘要统计
  const summary = useMemo(() => {
    if (buckets.length === 0) return { mean: 0, p95: 0, total: 0 };
    let totalSamples = 0;
    let totalWeighted = 0;
    const allP95: number[] = [];
    for (const b of buckets) {
      totalSamples += b.count;
      totalWeighted += b.avg * b.count;
      allP95.push(b.p95);
    }
    allP95.sort((a, b) => a - b);
    const p95Idx = Math.ceil(allP95.length * 0.95) - 1;
    return {
      mean: totalSamples > 0 ? Math.round(totalWeighted / totalSamples * 100) / 100 : 0,
      p95: allP95[p95Idx] || 0,
      total: totalSamples,
    };
  }, [buckets]);

  const currentLabel = METRICS.find((m) => m.key === metric)?.label || metric;
  const currentUnit = METRICS.find((m) => m.key === metric)?.unit || '';

  return (
    <div className="fade-in max-w-[1400px] mx-auto space-y-6">
      {/* ---- Header + Metric Selector ---- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h2 className="text-[32px] font-headline font-bold text-text-primary tracking-[-0.02em] leading-tight">
            Performance Trends
          </h2>
          <p className="text-[14px] text-text-secondary mt-1">
            Real-time performance monitoring and historical analysis
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border shadow-sm">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-4 py-2 text-[12px] font-semibold transition-all rounded-lg ${
                metric === m.key
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-text-muted hover:text-primary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bento-card p-6 flex flex-col justify-center items-center text-center">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">
            {currentLabel} Mean
          </span>
          <div className="stat-display text-primary">
            {summary.mean}{currentUnit}
          </div>
          <div className="mt-4 flex items-center gap-1 text-success text-[13px]">
            <span className="material-symbols-outlined text-[18px]">monitoring</span>
            <span>Real-time aggregate</span>
          </div>
        </div>
        <div className="bento-card p-6 flex flex-col justify-center items-center text-center">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">
            P95 Latency
          </span>
          <div className="stat-display text-text-primary">
            {summary.p95}{currentUnit}
          </div>
          <div className="mt-4 px-3 py-1 bg-surface-container-low rounded-full text-[11px] text-text-muted">
            Across {buckets.length} periods
          </div>
        </div>
        <div className="bento-card p-6 flex flex-col justify-center items-center text-center">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">
            Total Samples
          </span>
          <div className="stat-display text-text-primary">
            {summary.total.toLocaleString()}
          </div>
          <div className="mt-4 flex items-center gap-1 text-text-secondary text-[12px]">
            Grouped by {groupBy}
            <button
              onClick={() => setGroupBy(groupBy === 'day' ? 'hour' : 'day')}
              className="ml-1 text-primary font-semibold hover:underline"
            >
              switch
            </button>
          </div>
        </div>
      </div>

      {/* ---- Chart ---- */}
      <div className="bento-card p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-[16px] font-headline font-semibold text-text-primary">
              {currentLabel} Distribution
            </h3>
            <p className="text-[11px] text-text-muted mt-1">
              {groupBy === 'day' ? 'Daily' : 'Hourly'} average {currentLabel.toLowerCase()} over time
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-text-muted">
            {groupBy === 'day' ? 'Daily' : 'Hourly'} buckets
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-[160px] text-text-muted animate-pulse">Loading...</div>
        ) : (
          <BarChart buckets={buckets} />
        )}
      </div>

      {/* ---- Data Table ---- */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-surface-container-lowest">
          <h3 className="text-[16px] font-headline font-semibold text-text-primary">
            {currentLabel} Data
          </h3>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-surface-container rounded-md text-text-secondary">
              <span className="material-symbols-outlined text-[18px]">download</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-text-secondary">
                <th className="px-5 py-3 text-[11px] font-bold uppercase">Period</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase text-right">Samples</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase text-right">Mean</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase text-right">P50</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase text-right">P95</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase text-right">P99</th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {buckets.map((b: any, i: number) => (
                <tr key={i} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                  <td className="px-5 py-3 text-[13px] font-mono text-primary group-hover:font-bold">{b.key}</td>
                  <td className="px-5 py-3 text-[13px] text-text-secondary text-right">{b.count.toLocaleString()}</td>
                  <td className="px-5 py-3 text-[13px] font-bold text-right">{b.avg}{currentUnit}</td>
                  <td className="px-5 py-3 text-[13px] text-right">{b.p50}{currentUnit}</td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-right">{b.p95}{currentUnit}</td>
                  <td className="px-5 py-3 text-[13px] text-right">{b.p99}{currentUnit}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      b.p95 > 500 ? 'bg-error/10 text-error' : b.p95 > 200 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                    }`}>
                      {b.p95 > 500 ? 'Slow' : b.p95 > 200 ? 'Normal' : 'Fast'}
                    </span>
                  </td>
                </tr>
              ))}
              {buckets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-muted text-[13px]">
                    No performance data yet
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
