/* ================================================================
 *  ClickHouse 适配层 —— 聚合数据长期存储
 *  当前版本：内存模拟实现，生产可替换为 @clickhouse/client
 * ================================================================ */

export interface MetricRecord {
  timestamp: number;
  appId: string;
  pageUrl: string;
  metric: string;
  value: number;
  tags: Record<string, string>;
}

export interface AggregationQuery {
  appId?: string;
  metric?: string;
  startTime?: number;
  endTime?: number;
  groupBy?: 'hour' | 'day' | 'page';
}

export interface AggregationResult {
  buckets: { key: string; count: number; avg: number; p50: number; p95: number; p99: number }[];
}

/**
 * 内存模拟 ClickHouse 存储
 * 生产环境替换为真实 ClickHouse Client
 */
class ClickHouseAdapter {
  private store: MetricRecord[] = [];

  /** 写入单条指标 */
  insert(record: MetricRecord): void {
    this.store.push(record);
    if (this.store.length > 200_000) {
      this.store = this.store.slice(-200_000);
    }
  }

  /** 批量写入 */
  bulkInsert(records: MetricRecord[]): void {
    this.store.push(...records);
    if (this.store.length > 200_000) {
      this.store = this.store.slice(-200_000);
    }
  }

  /** 聚合查询 */
  aggregate(query: AggregationQuery): AggregationResult {
    let filtered = [...this.store];

    if (query.appId) filtered = filtered.filter((r) => r.appId === query.appId);
    if (query.metric) filtered = filtered.filter((r) => r.metric === query.metric);
    if (query.startTime) filtered = filtered.filter((r) => r.timestamp >= query.startTime!);
    if (query.endTime) filtered = filtered.filter((r) => r.timestamp <= query.endTime!);

    // 分组
    const bucketMap = new Map<string, number[]>();
    for (const record of filtered) {
      let key: string;
      if (query.groupBy === 'page') {
        key = record.pageUrl;
      } else if (query.groupBy === 'hour') {
        const d = new Date(record.timestamp);
        key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`;
      } else {
        // day
        const d = new Date(record.timestamp);
        key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }

      if (!bucketMap.has(key)) bucketMap.set(key, []);
      bucketMap.get(key)!.push(record.value);
    }

    const buckets = Array.from(bucketMap.entries()).map(([key, values]) => {
      const sorted = values.sort((a, b) => a - b);
      const count = sorted.length;
      const avg = count > 0 ? sorted.reduce((s, v) => s + v, 0) / count : 0;
      const p50 = percentile(sorted, 50);
      const p95 = percentile(sorted, 95);
      const p99 = percentile(sorted, 99);
      return { key, count, avg: Math.round(avg * 100) / 100, p50, p95, p99 };
    });

    return { buckets };
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export const clickhouse = new ClickHouseAdapter();
