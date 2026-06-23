import { useEffect, useState } from 'react';
import { api } from '../services/api';

// allow function-valued entries like tag: (type) => React.CSSProperties
const styles: Record<string, any> = {
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: {
    background: '#fff',
    borderRadius: 8,
    padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  statValue: { fontSize: 32, fontWeight: 700, margin: '4px 0' },
  statLabel: { fontSize: 13, color: '#888' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '2px solid #eee', color: '#666', fontWeight: 600 },
  td: { padding: '8px 12px', borderBottom: '1px solid #f0f0f0' },
  tag: (type: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: type === 'error' ? '#ffe0e0' : type === 'performance' ? '#e0f0ff' : type === 'behavior' ? '#e0ffe0' : '#f0e0ff',
    color: type === 'error' ? '#c00' : type === 'performance' ? '#06c' : type === 'behavior' ? '#060' : '#606',
  }),
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' },
};

export default function RealtimeDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
    const timer = setInterval(() => {
      api.getDashboard().then(setData).catch(() => {});
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div>加载中...</div>;
  if (!data) return <div>暂无数据</div>;

  const counts = data.eventCounts || {};

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 600, color: '#1a1a2e' }}>📊 实时大盘</h2>

      {/* 统计卡片 */}
      <div style={styles.grid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>错误数 (近1h)</div>
          <div style={{ ...styles.statValue, color: '#e94560' }}>{counts.error || 0}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>性能事件</div>
          <div style={{ ...styles.statValue, color: '#0f3460' }}>{counts.performance || 0}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>行为事件</div>
          <div style={{ ...styles.statValue, color: '#16a34a' }}>{counts.behavior || 0}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>资源事件</div>
          <div style={{ ...styles.statValue, color: '#9333ea' }}>{counts.resource || 0}</div>
        </div>
      </div>

      {/* 最近错误 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>最近 10 条错误</div>
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>类型</th>
                <th style={styles.th}>消息</th>
                <th style={styles.th}>页面</th>
                <th style={styles.th}>时间</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentErrors?.list || []).map((e: any, i: number) => (
                <tr key={i}>
                  <td style={styles.td}><span style={styles.tag(e.eventType)}>{e.eventType}</span></td>
                  <td style={styles.td}>{e.data?.message?.slice(0, 80) || '-'}</td>
                  <td style={styles.td}><span style={{ fontSize: 12, color: '#888' }}>{e.data?.pageUrl?.slice(0, 50) || '-'}</span></td>
                  <td style={styles.td}>{new Date(e.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
              {(!data.recentErrors?.list || data.recentErrors.list.length === 0) && (
                <tr><td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: '#999' }}>暂无错误</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 性能概况 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>性能指标概况</div>
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>日期</th>
                <th style={styles.th}>采样数</th>
                <th style={styles.th}>均值 (ms)</th>
                <th style={styles.th}>P50</th>
                <th style={styles.th}>P95</th>
                <th style={styles.th}>P99</th>
              </tr>
            </thead>
            <tbody>
              {(data.performanceSummary || []).map((b: any, i: number) => (
                <tr key={i}>
                  <td style={styles.td}>{b.key}</td>
                  <td style={styles.td}>{b.count}</td>
                  <td style={styles.td}>{b.avg}</td>
                  <td style={styles.td}>{b.p50}</td>
                  <td style={styles.td}>{b.p95}</td>
                  <td style={styles.td}>{b.p99}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
