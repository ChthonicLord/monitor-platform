/* ================================================================
 *  Elasticsearch 适配层 —— 明细日志存储（保留7天）
 *  当前版本：内存模拟实现，生产可替换为 @elastic/elasticsearch
 * ================================================================ */

export interface LogEntry {
  id: string;
  timestamp: number;
  appId: string;
  eventType: string;
  data: Record<string, unknown>;
}

export interface QueryParams {
  appId?: string;
  eventType?: string;
  startTime?: number;
  endTime?: number;
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface QueryResult {
  total: number;
  list: LogEntry[];
}

/**
 * 内存模拟 Elasticsearch 存储
 * 生产环境替换为真实 ES Client
 */
class ElasticsearchAdapter {
  private store: LogEntry[] = [];
  private retentionMs = 7 * 24 * 60 * 60 * 1000; // 7天

  /** 写入单条日志 */
  index(entry: LogEntry): void {
    this.store.push(entry);
    this.cleanup();
  }

  /** 批量写入 */
  bulkIndex(entries: LogEntry[]): void {
    this.store.push(...entries);
    this.cleanup();
  }

  /** 查询日志（支持多条件筛选） */
  search(params: QueryParams): QueryResult {
    let filtered = [...this.store];

    if (params.appId) {
      filtered = filtered.filter((e) => e.data.appId === params.appId);
    }
    if (params.eventType) {
      filtered = filtered.filter((e) => e.eventType === params.eventType);
    }
    if (params.startTime) {
      filtered = filtered.filter((e) => e.timestamp >= params.startTime!);
    }
    if (params.endTime) {
      filtered = filtered.filter((e) => e.timestamp <= params.endTime!);
    }
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      filtered = filtered.filter(
        (e) => JSON.stringify(e.data).toLowerCase().includes(kw),
      );
    }

    // 按时间降序排列
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    const total = filtered.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize);

    return { total, list };
  }

  /** 聚合查询（按 eventType 统计） */
  aggregateByType(params: { appId?: string; startTime?: number; endTime?: number }): Record<string, number> {
    let filtered = [...this.store];
    if (params.appId) {
      filtered = filtered.filter((e) => e.data.appId === params.appId);
    }
    if (params.startTime) {
      filtered = filtered.filter((e) => e.timestamp >= params.startTime!);
    }
    if (params.endTime) {
      filtered = filtered.filter((e) => e.timestamp <= params.endTime!);
    }

    const counts: Record<string, number> = {};
    for (const entry of filtered) {
      counts[entry.eventType] = (counts[entry.eventType] || 0) + 1;
    }
    return counts;
  }

  /** 清理过期数据（7天前） */
  private cleanup(): void {
    const cutoff = Date.now() - this.retentionMs;
    this.store = this.store.filter((e) => e.timestamp > cutoff);

    // 限制内存总量（最多保留 100000 条）
    if (this.store.length > 100_000) {
      this.store = this.store.slice(-100_000);
    }
  }
}

export const elasticsearch = new ElasticsearchAdapter();
