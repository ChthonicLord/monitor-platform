/* ================================================================
 *  数据查询路由 —— 聚合查询 / 多维下钻 / 分位值计算
 *  GET /api/query/errors | /api/query/performance | /api/query/behavior | ...
 * ================================================================ */

import { Router, Request, Response } from 'express';
import { elasticsearch } from '../services/elasticsearch';
import { clickhouse } from '../services/clickhouse';

const router = Router();

// ---- 错误查询 ----

/** GET /api/query/errors?appId=xxx&startTime=xxx&endTime=xxx&page=1&pageSize=20 */
router.get('/errors', (req: Request, res: Response) => {
  try {
    const { appId, startTime, endTime, page, pageSize, keyword } = req.query;
    const result = elasticsearch.search({
      appId: appId as string,
      eventType: 'error',
      startTime: startTime ? Number(startTime) : undefined,
      endTime: endTime ? Number(endTime) : undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      keyword: keyword as string,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

/** GET /api/query/errors/stats?appId=xxx */
router.get('/errors/stats', (req: Request, res: Response) => {
  try {
    const { appId, startTime, endTime } = req.query;
    const stats = elasticsearch.aggregateByType({
      appId: appId as string,
      startTime: startTime ? Number(startTime) : undefined,
      endTime: endTime ? Number(endTime) : undefined,
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// ---- 性能查询 ----

/** GET /api/query/performance?appId=xxx&metric=ttfb&groupBy=day */
router.get('/performance', (req: Request, res: Response) => {
  try {
    const { appId, metric, startTime, endTime, groupBy } = req.query;
    const result = clickhouse.aggregate({
      appId: appId as string,
      metric: (metric as string) || 'ttfb',
      startTime: startTime ? Number(startTime) : undefined,
      endTime: endTime ? Number(endTime) : undefined,
      groupBy: (groupBy as 'hour' | 'day' | 'page') || 'day',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// ---- 行为查询 ----

/** GET /api/query/behaviors?appId=xxx&page=1&pageSize=20 */
router.get('/behaviors', (req: Request, res: Response) => {
  try {
    const { appId, startTime, endTime, page, pageSize } = req.query;
    const result = elasticsearch.search({
      appId: appId as string,
      eventType: 'behavior',
      startTime: startTime ? Number(startTime) : undefined,
      endTime: endTime ? Number(endTime) : undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// ---- 资源查询 ----

/** GET /api/query/resources?appId=xxx */
router.get('/resources', (req: Request, res: Response) => {
  try {
    const { appId, startTime, endTime, page, pageSize } = req.query;
    const result = elasticsearch.search({
      appId: appId as string,
      eventType: 'resource',
      startTime: startTime ? Number(startTime) : undefined,
      endTime: endTime ? Number(endTime) : undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// ---- 实时大盘统计 ----

/** GET /api/query/dashboard?appId=xxx */
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const { appId } = req.query;
    const now = Date.now();
    const oneHourAgo = now - 3600_000;
    const twoHoursAgo = now - 7200_000;

    // 统计各类事件数（当前周期）
    const typeCounts = elasticsearch.aggregateByType({
      appId: appId as string,
      startTime: oneHourAgo,
    });

    // 统计上一周期事件数（用于对比趋势）
    const prevCounts = elasticsearch.aggregateByType({
      appId: appId as string,
      startTime: twoHoursAgo,
      endTime: oneHourAgo,
    });

    // 错误详情
    const errors = elasticsearch.search({
      appId: appId as string,
      eventType: 'error',
      startTime: oneHourAgo,
      page: 1,
      pageSize: 10,
    });

    // 性能概览
    const perf = clickhouse.aggregate({
      appId: appId as string,
      startTime: oneHourAgo,
      groupBy: 'day',
    });

    // 错误类型分布
    const errorBreakdown = elasticsearch.aggregateByErrorType({ startTime: oneHourAgo });

    // UV 统计（近 1 小时去重用户数）
    const uv = elasticsearch.countUniqueUsers({ startTime: oneHourAgo });

    res.json({
      timestamp: now,
      eventCounts: typeCounts,
      prevEventCounts: prevCounts,
      errorBreakdown,
      uniqueUsers: uv,
      recentErrors: errors,
      performanceSummary: perf.buckets.slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

export default router;
