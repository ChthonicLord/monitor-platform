import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';

const METRICS = ['ttfb', 'loadComplete', 'firstContentfulPaint', 'largestContentfulPaint'] as const;
const METRIC_LABELS: Record<string, string> = {
  ttfb: 'TTFB',
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
  comparisonGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 },
  compCard: {
    background: '#f8f9fc',
    borderRadius: 8,
    padding: 16,
  },
  compTitle: { fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#333' },
  compRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #eee',
    fontSize: 13,
  },
  diffBadge: (positive: boolean): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: positive ? '#e0ffe0' : '#ffe0e0',
    color: positive ? '#16a34a' : '#e94560',
  }),
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13, marginTop: 8 },
  th: { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '2px solid #eee', color: '#666', fontWeight: 600 },
  td: { padding: '8px 12px', borderBottom: '1px solid #f0f0f0' },
};

export default function ComparisonAnalysis() {
  const [metric, setMetric] = useState<string>('ttfb');
  const [pageData, setPageData] = useState<any>(null);
  const [dayData, setDayData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getPerformance({ metric, groupBy: 'page' }),
      api.getPerformance({ metric, groupBy: 'day' }),
    ])
      .then(([page, day]) => {
        setPageData(page);
        setDayData(day);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [metric]);

  const pageBuckets = (pageData?.buckets || []).sort((a: any, b: any) => b.avg - a.avg);
  const dayBuckets = dayData?.buckets || [];

  // 对比最近两天
  const recent2 = useMemo(() => {
    if (dayBuckets.length < 2) return null;
    const sorted = [...dayBuckets].sort((a: any, b: any) => b.key.localeCompare(a.key));
    const latest = sorted[0];
    const prev = sorted[1];
    return {
      latest,
      prev,
      change: latest.avg - prev.avg,
      changePct: prev.avg > 0 ? Math.round(((latest.avg - prev.avg) / prev.avg) * 100) : 0,
    };
  }, [dayBuckets]);

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 600, color: '#1a1a2e' }}>🔍 对比分析</h2>

      <div style={styles.metricSelector}>
        {METRICS.map((m) => (
          <button key={m} style={styles.metricBtn(metric === m)} onClick={() => setMetric(m)}>
            {METRIC_LABELS[m] || m}
          </button>
        ))}
      </div>

      {loading ? (
        <div>加载中...</div>
      ) : (
        <>
          {/* 日环比 */}
          {recent2 && (
            <div style={styles.card}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
                📅 日环比：{METRIC_LABELS[metric]}
              </div>
              <div style={styles.comparisonGrid}>
                <div style={styles.compCard}>
                  <div style={styles.compTitle}>昨日 ({recent2.prev.key})</div>
                  <div style={styles.compRow}>
                    <span>均值</span><strong>{recent2.prev.avg} ms</strong>
                  </div>
                  <div style={styles.compRow}>
                    <span>P95</span><strong>{recent2.prev.p95} ms</strong>
                  </div>
                  <div style={styles.compRow}>
                    <span>采样数</span><strong>{recent2.prev.count}</strong>
                  </div>
                </div>
                <div style={styles.compCard}>
                  <div style={styles.compTitle}>今日 ({recent2.latest.key})</div>
                  <div style={styles.compRow}>
                    <span>均值</span>
                    <strong>
                      {recent2.latest.avg} ms
                      <span style={styles.diffBadge(recent2.change <= 0)}>
                        {recent2.change > 0 ? '+' : ''}{recent2.changePct}%
                      </span>
                    </strong>
                  </div>
                  <div style={styles.compRow}>
                    <span>P95</span><strong>{recent2.latest.p95} ms</strong>
                  </div>
                  <div style={styles.compRow}>
                    <span>采样数</span><strong>{recent2.latest.count}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 页面维度对比 */}
          <div style={styles.card}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
              📄 页面维度对比：{METRIC_LABELS[metric]}
            </div>
            {pageBuckets.length === 0 ? (
              <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无数据</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>页面</th>
                    <th style={styles.th}>采样数</th>
                    <th style={styles.th}>均值 (ms)</th>
                    <th style={styles.th}>P50</th>
                    <th style={styles.th}>P95</th>
                    <th style={styles.th}>P99</th>
                  </tr>
                </thead>
                <tbody>
                  {pageBuckets.map((b: any, i: number) => (
                    <tr key={i}>
                      <td style={styles.td}>
                        <span style={{ fontSize: 12, color: '#888', maxWidth: 300, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.key || '(首页)'}
                        </span>
                      </td>
                      <td style={styles.td}>{b.count}</td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{b.avg}</td>
                      <td style={styles.td}>{b.p50}</td>
                      <td style={styles.td}>{b.p95}</td>
                      <td style={styles.td}>{b.p99}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
