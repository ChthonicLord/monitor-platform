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

// ---- 对比柱状图 ----
function ComparisonChart({ merged }: { merged: any[] }) {
  const maxVal = Math.max(...merged.map((r) => Math.max(r.avgA, r.avgB)), 1);

  return (
    <div className="space-y-3">
      {merged.length === 0 ? (
        <p className="text-text-muted text-[13px] py-8 text-center">No data</p>
      ) : (
        merged.map((row, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-text-secondary truncate max-w-[200px]">{row.key}</span>
              <span className={`text-[11px] font-bold ${Number(row.diff || 0) > 0 ? 'text-error' : Number(row.diff || 0) < 0 ? 'text-success' : 'text-text-muted'}`}>
                {row.diff ? `${row.diff}%` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 h-5">
              <span className="text-[10px] text-text-muted w-10 text-right shrink-0">This</span>
              <div className="flex-1 h-3 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.max((row.avgA / maxVal) * 100, 2)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 h-5">
              <span className="text-[10px] text-text-muted w-10 text-right shrink-0">Last</span>
              <div className="flex-1 h-3 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-surface-container-high rounded-full"
                  style={{ width: `${Math.max((row.avgB / maxVal) * 100, 2)}%` }}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function ComparisonAnalysis() {
  const [metric, setMetric] = useState('ttfb');
  const [dataA, setDataA] = useState<any>(null);
  const [dataB, setDataB] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const now = Date.now();
    Promise.all([
      api.getPerformance({ metric, groupBy: 'day', startTime: now - 7 * 86400000 }),
      api.getPerformance({ metric, groupBy: 'day', startTime: now - 14 * 86400000, endTime: now - 7 * 86400000 }),
    ])
      .then(([a, b]) => {
        setDataA(a);
        setDataB(b);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [metric]);

  const bucketsA = dataA?.buckets || [];
  const bucketsB = dataB?.buckets || [];

  const merged = useMemo(() => {
    const map = new Map<string, { a?: any; b?: any }>();
    for (const item of bucketsA) {
      if (!map.has(item.key)) map.set(item.key, {});
      map.get(item.key)!.a = item;
    }
    for (const item of bucketsB) {
      if (!map.has(item.key)) map.set(item.key, {});
      map.get(item.key)!.b = item;
    }
    return Array.from(map.entries()).map(([key, { a, b }]) => ({
      key,
      countA: a?.count || 0,
      countB: b?.count || 0,
      avgA: a?.avg || 0,
      avgB: b?.avg || 0,
      p50A: a?.p50 || 0,
      p50B: b?.p50 || 0,
      p95A: a?.p95 || 0,
      p95B: b?.p95 || 0,
      diff: a?.avg && b?.avg ? ((a.avg - b.avg) / b.avg * 100).toFixed(1) : null,
    }));
  }, [bucketsA, bucketsB]);

  // 总体摘要
  const summary = useMemo(() => {
    let totalA = 0, totalB = 0, countA = 0, countB = 0;
    let worsened = 0, improved = 0;
    for (const row of merged) {
      totalA += row.avgA * row.countA;
      totalB += row.avgB * row.countB;
      countA += row.countA;
      countB += row.countB;
      const d = Number(row.diff || 0);
      if (d > 5) worsened++;
      else if (d < -5) improved++;
    }
    const overallDiff = countA > 0 && countB > 0
      ? (((totalA / countA) - (totalB / countB)) / (totalB / countB) * 100).toFixed(1)
      : null;
    return { overallDiff, worsened, improved, days: merged.length };
  }, [merged]);

  const currentLabel = METRICS.find((m) => m.key === metric)?.label || metric;
  const currentUnit = METRICS.find((m) => m.key === metric)?.unit || '';

  return (
    <div className="fade-in max-w-[1400px] mx-auto space-y-6">
      {/* ---- Header + Metric Selector ---- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h2 className="text-[32px] font-headline font-bold text-text-primary tracking-[-0.02em] leading-tight">
            Comparison Analysis
          </h2>
          <p className="text-[14px] text-text-secondary mt-1">
            Week-over-week performance comparison
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
            Overall Change
          </span>
          <div className={`stat-display ${Number(summary.overallDiff || 0) > 0 ? 'text-error' : 'text-success'}`}>
            {summary.overallDiff ? `${Number(summary.overallDiff) > 0 ? '+' : ''}${summary.overallDiff}%` : '—'}
          </div>
          <div className="mt-4 flex items-center gap-1 text-text-secondary text-[13px]">
            <span className="material-symbols-outlined text-[18px]">
              {Number(summary.overallDiff || 0) > 0 ? 'trending_up' : 'trending_down'}
            </span>
            <span>{currentLabel} avg</span>
          </div>
        </div>
        <div className="bento-card p-6 flex flex-col justify-center items-center text-center">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">
            Worsened Days
          </span>
          <div className="stat-display text-error">{summary.worsened}</div>
          <div className="mt-4 px-3 py-1 bg-error-container/30 rounded-full text-[11px] text-error font-semibold">
            +{'>'}5% degradation
          </div>
        </div>
        <div className="bento-card p-6 flex flex-col justify-center items-center text-center">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">
            Improved Days
          </span>
          <div className="stat-display text-success">{summary.improved}</div>
          <div className="mt-4 px-3 py-1 bg-success/10 rounded-full text-[11px] text-success font-semibold">
            -{'>'}5% improvement
          </div>
        </div>
      </div>

      {/* ---- Chart + Table ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart */}
        <div className="bento-card p-6">
          <div className="mb-4">
            <h3 className="text-[16px] font-headline font-semibold text-text-primary">
              {currentLabel} — Weekly Comparison
            </h3>
            <p className="text-[11px] text-text-muted mt-1">
              Blue = This Week, Gray = Last Week
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-[200px] text-text-muted animate-pulse">Loading...</div>
          ) : (
            <ComparisonChart merged={merged} />
          )}
        </div>

        {/* Data Table */}
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-surface-container-lowest">
            <div>
              <h3 className="text-[16px] font-headline font-semibold text-text-primary">
                {currentLabel} Data
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5">
                {summary.days} days compared
              </p>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-text-secondary">
                  <th className="px-5 py-3 text-[11px] font-bold uppercase">Date</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase text-right">This Week</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase text-right">Last Week</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase text-right">Change</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase text-center">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {merged.map((row, i) => (
                  <tr key={i} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                    <td className="px-5 py-3 text-[13px] font-mono text-primary group-hover:font-bold">{row.key}</td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-text-primary text-right">{row.avgA}{currentUnit}</td>
                    <td className="px-5 py-3 text-[13px] text-text-secondary text-right">{row.avgB}{currentUnit}</td>
                    <td className="px-5 py-3 text-right">
                      {row.diff ? (
                        <span className={`text-[13px] font-bold ${Number(row.diff) > 0 ? 'text-error' : 'text-success'}`}>
                          {Number(row.diff) > 0 ? '+' : ''}{row.diff}%
                        </span>
                      ) : (
                        <span className="text-text-muted text-[13px]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {row.diff ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          Number(row.diff) > 0 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {Number(row.diff) > 0 ? 'trending_up' : 'trending_down'}
                          </span>
                          {Number(row.diff) > 0 ? 'Worse' : 'Better'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-text-muted">Same</span>
                      )}
                    </td>
                  </tr>
                ))}
                {merged.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-text-muted text-[13px]">
                      Collect more data over time to see comparisons
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
