import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';

const METRICS = ['ttfb', 'dnsTime', 'tcpTime', 'domParseTime', 'loadComplete', 'firstContentfulPaint', 'largestContentfulPaint'] as const;
const METRIC_LABELS: Record<string, string> = {
  ttfb: 'TTFB',
  dnsTime: 'DNS 解析',
  tcpTime: 'TCP 连接',
  domParseTime: 'DOM 解析',
  loadComplete: '页面加载完成',
  firstContentfulPaint: 'FCP',
  largestContentfulPaint: 'LCP',
};

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 },
  metricSelector: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  metricBtn: (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    border: `1px solid ${active ? '#e94560' : '#ddd'}`,
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? '#e94560' : '#fff',
    color: active ? '#fff' : '#333',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
  }),
  chartContainer: { padding: '10px 0' },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  barLabel: { width: 120, fontSize: 12, color: '#666', textAlign: 'right' as const, flexShrink: 0 },
  barTrack: { flex: 1, height: 24, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  barFill: (width: number, color: string): React.CSSProperties => ({
    height: '100%',
    width: `${Math.min(width, 100)}%`,
    background: color,
    borderRadius: 4,
    transition: 'width 0.3s',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 8,
    fontSize: 11,
    color: '#fff',
    fontWeight: 600,
  }),
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 },
  statItem: { background: '#f8f9fc', borderRadius: 6, padding: '10px 14px', textAlign: 'center' as const },
  statValue2: { fontSize: 20, fontWeight: 700 },
  statLabel2: { fontSize: 11, color: '#888', marginTop: 2 },
};

export default function PerformanceTrend() {
  const [metric, setMetric] = useState<string>('ttfb');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getPerformance({ metric, groupBy: 'day' })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [metric]);

  const buckets = data?.buckets || [];

  // 计算最大值用于柱状图比例
  const maxAvg = useMemo(() => {
    if (buckets.length === 0) return 1;
    return Math.max(...buckets.map((b: any) => b.avg), 1);
  }, [buckets]);

  // 颜色
  const barColor = '#0f3460';

  // 总体统计
  const overallAvg = useMemo(() => {
    if (buckets.length === 0) return 0;
    const total = buckets.reduce((s: number, b: any) => s + b.avg * b.count, 0);
    const totalCount = buckets.reduce((s: number, b: any) => s + b.count, 0);
    return totalCount > 0 ? Math.round((total / totalCount) * 100) / 100 : 0;
  }, [buckets]);

  const overallP95 = useMemo(() => {
    if (buckets.length === 0) return 0;
    return Math.max(...buckets.map((b: any) => b.p95));
  }, [buckets]);

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 600, color: '#1a1a2e' }}>📈 性能趋势</h2>

      {/* 指标选择器 */}
      <div style={styles.metricSelector}>
        {METRICS.map((m) => (
          <button key={m} style={styles.metricBtn(metric === m)} onClick={() => setMetric(m)}>
            {METRIC_LABELS[m] || m}
          </button>
        ))}
      </div>

      {/* 统计总览 */}
      <div style={styles.statsGrid}>
        <div style={styles.statItem}>
          <div style={styles.statLabel2}>{METRIC_LABELS[metric]} 均值</div>
          <div style={{ ...styles.statValue2, color: '#0f3460' }}>{overallAvg} ms</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statLabel2}>P95</div>
          <div style={{ ...styles.statValue2, color: '#e94560' }}>{overallP95} ms</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statLabel2}>总采样数</div>
          <div style={{ ...styles.statValue2, color: '#16a34a' }}>{buckets.reduce((s: number, b: any) => s + b.count, 0)}</div>
        </div>
      </div>

      {/* 柱状图 */}
      <div style={{ ...styles.card, marginTop: 20 }}>
        {loading ? (
          <div>加载中...</div>
        ) : buckets.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: 40 }}>暂无数据，请确保 SDK 已接入并上报性能数据</div>
        ) : (
          <div style={styles.chartContainer}>
            {buckets.map((b: any, i: number) => (
              <div key={i} style={styles.barRow}>
                <div style={styles.barLabel}>{b.key}</div>
                <div style={styles.barTrack}>
                  <div style={styles.barFill((b.avg / maxAvg) * 100, barColor)}>
                    {b.avg > maxAvg * 0.3 ? `${b.avg} ms` : ''}
                  </div>
                </div>
                {b.avg <= maxAvg * 0.3 && <span style={{ fontSize: 11, color: '#666', width: 50 }}>{b.avg} ms</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 详细数据表 */}
      {buckets.length > 0 && (
        <div style={styles.card}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #eee', color: '#666' }}>日期</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #eee', color: '#666' }}>采样数</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #eee', color: '#666' }}>均值 (ms)</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #eee', color: '#666' }}>P50</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #eee', color: '#666' }}>P95</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #eee', color: '#666' }}>P99</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>{b.key}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>{b.count}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>{b.avg}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>{b.p50}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>{b.p95}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>{b.p99}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
