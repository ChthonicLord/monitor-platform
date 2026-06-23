import { useEffect, useState } from 'react';
import { api } from '../services/api';

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '2px solid #eee', color: '#666', fontWeight: 600 },
  td: { padding: '8px 12px', borderBottom: '1px solid #f0f0f0' },
  tabs: { display: 'flex', gap: 8, marginBottom: 20 },
  tab: (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? '#e94560' : '#fff',
    color: active ? '#fff' : '#333',
    fontWeight: active ? 600 : 400,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    fontSize: 13,
  }),
  pagination: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 },
  pageBtn: { padding: '6px 14px', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 13 },
};

const TABS = ['errors', 'behaviors', 'resources'] as const;
const TAB_LABELS: Record<string, string> = {
  errors: '错误日志',
  behaviors: '行为日志',
  resources: '资源日志',
};

export default function PageDetail() {
  const [tab, setTab] = useState<string>('errors');
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

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

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 600, color: '#1a1a2e' }}>📄 页面详情</h2>

      <div style={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} style={styles.tab(tab === t)} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={styles.card}>
        {loading ? (
          <div>加载中...</div>
        ) : (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>事件 ID</th>
                  <th style={styles.th}>类型</th>
                  <th style={styles.th}>详情</th>
                  <th style={styles.th}>页面</th>
                  <th style={styles.th}>时间</th>
                </tr>
              </thead>
              <tbody>
                {(data?.list || []).map((item: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...styles.td, fontSize: 11, color: '#888' }}>{item.id?.slice(0, 16)}...</td>
                    <td style={styles.td}>{item.eventType}</td>
                    <td style={styles.td}>
                      {item.data?.message?.slice(0, 60) ||
                        item.data?.behaviorType ||
                        item.data?.resourceUrl?.slice(0, 50) ||
                        '-'}
                    </td>
                    <td style={{ ...styles.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.data?.pageUrl?.slice(0, 40) || '-'}
                    </td>
                    <td style={styles.td}>{new Date(item.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {(!data?.list || data.list.length === 0) && (
                  <tr><td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: '#999' }}>暂无数据</td></tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button style={styles.pageBtn} disabled={page <= 1} onClick={() => loadPage(page - 1)}>上一页</button>
                <span style={{ padding: '6px 8px', fontSize: 13 }}>第 {page} / {totalPages} 页 (共 {total} 条)</span>
                <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => loadPage(page + 1)}>下一页</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
