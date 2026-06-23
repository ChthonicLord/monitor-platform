/* ================================================================
 *  Kafka 适配层 —— 实时消费 / 数据清洗 / 维度补全
 *  当前版本：内存模拟实现，生产可替换为 kafkajs
 *  架构说明：
 *    1. SDK 上报 → HTTP Server → Kafka（峰值削峰）
 *    2. Kafka Consumer → 数据清洗 → ES + ClickHouse
 * ================================================================ */

import { LogEntry } from './elasticsearch';
import { MetricRecord } from './clickhouse';

export interface RawReportData {
  appId: string;
  events: Array<{
    eventId: string;
    eventType: string;
    timestamp: number;
    pageUrl: string;
    message?: string;
    stack?: string;
    metrics?: Record<string, number>;
    [key: string]: unknown;
  }>;
  sendTime: number;
}

type ConsumerFn = (data: RawReportData) => void;

/**
 * 内存模拟 Kafka
 * 生产环境替换为真实 Kafka Client
 */
class KafkaAdapter {
  private consumers: ConsumerFn[] = [];
  private pendingMessages: RawReportData[] = [];

  /** 生产者：发布消息 */
  produce(data: RawReportData): void {
    this.pendingMessages.push(data);
    this.flush();
  }

  /** 注册消费者 */
  consume(fn: ConsumerFn): void {
    this.consumers.push(fn);
  }

  /** 批量投递到消费者 */
  private flush(): void {
    const batch = this.pendingMessages.splice(0);
    for (const msg of batch) {
      // 数据清洗 & 维度补全
      const cleaned = this.cleanAndEnrich(msg);
      for (const consumer of this.consumers) {
        try {
          consumer(cleaned);
        } catch (err) {
          console.error('[Kafka] Consumer error:', err);
        }
      }
    }
  }

  /**
   * 数据清洗 & 维度补全
   * - 补全时间戳
   * - UA 解析 → 设备信息（此处简化，生产可接入 IP 库 / UA 解析服务）
   */
  private cleanAndEnrich(data: RawReportData): RawReportData {
    return {
      ...data,
      events: data.events.map((event) => ({
        ...event,
        timestamp: event.timestamp || Date.now(),
        _enriched: {
          receiveTime: Date.now(),
          // 维度补全占位：生产环境可接入 ip2region / ua-parser
          geo: 'unknown',
          device: 'unknown',
        },
      })),
    };
  }
}

export const kafka = new KafkaAdapter();
