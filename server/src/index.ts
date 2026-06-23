/* ================================================================
 *  监控平台 Server 入口
 *
 *  启动: npx tsx src/index.ts
 *  服务端口: 3001
 *
 *  数据流:
 *    SDK 上报 → POST /api/report → Kafka → ES (明细) + ClickHouse (聚合)
 *    Dashboard → GET /api/query/* → ES / ClickHouse
 * ================================================================ */

import express from 'express';
import { corsMiddleware } from './middleware/cors';
import { rateLimitMiddleware } from './middleware/ratelimit';
import reportRouter from './routes/report';
import queryRouter from './routes/query';
import { kafka } from './services/kafka';
import { elasticsearch } from './services/elasticsearch';
import { clickhouse } from './services/clickhouse';

const app = express();
const PORT = process.env.PORT || 3001;

// ---- 中间件 ----
app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));

// 上报接口限流
app.use('/api/report', rateLimitMiddleware);

// ---- 路由 ----
app.use('/api', reportRouter);
app.use('/api/query', queryRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ---- 启动 Kafka 消费者（数据写入 ES + ClickHouse） ----
kafka.consume((data) => {
  const now = Date.now();

  for (const event of data.events) {
    // 写入 ES（明细日志）
    elasticsearch.index({
      id: event.eventId,
      timestamp: event.timestamp || now,
      appId: data.appId,
      eventType: event.eventType,
      data: event as unknown as Record<string, unknown>,
    });

    // 写入 ClickHouse（性能指标）
    if (event.eventType === 'performance' && event.metrics) {
      const metrics = event.metrics as Record<string, number>;
      for (const [metric, value] of Object.entries(metrics)) {
        if (typeof value === 'number' && value > 0) {
          clickhouse.insert({
            timestamp: event.timestamp || now,
            appId: data.appId,
            pageUrl: (event.pageUrl as string) || '',
            metric,
            value,
            tags: {},
          });
        }
      }
    }
  }
});

// ---- 启动服务 ----
app.listen(PORT, () => {
  console.log(`[Monitor Platform] Server running on http://localhost:${PORT}`);
  console.log(`  POST /api/report     - SDK 数据上报入口`);
  console.log(`  GET  /api/query/*     - 数据查询接口`);
  console.log(`  GET  /api/health      - 健康检查`);
});

export default app;
