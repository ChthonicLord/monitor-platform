/* ================================================================
 *  数据上报路由 —— SDK 数据接收入口
 *  POST /api/report
 * ================================================================ */

import { Router, Request, Response } from 'express';
import { kafka, RawReportData } from '../services/kafka';

const router = Router();

/**
 * 上报接口
 * Body: { appId: string, events: MonitorEvent[], sendTime: number }
 */
router.post('/report', (req: Request, res: Response) => {
  try {
    const body = req.body as RawReportData;

    // 基础校验
    if (!body || !body.appId || !Array.isArray(body.events)) {
      res.status(400).json({ error: 'Invalid payload: appId and events[] required' });
      return;
    }

    // 限制单次最大事件数
    const MAX_EVENTS = 200;
    if (body.events.length > MAX_EVENTS) {
      res.status(400).json({
        error: `Too many events: max ${MAX_EVENTS}, got ${body.events.length}`,
      });
      return;
    }

    // 发布到 Kafka（削峰填谷）
    kafka.produce(body);

    // 快速响应，避免阻塞 SDK
    res.status(200).json({ ok: true, received: body.events.length });
  } catch (err) {
    console.error('[Report] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
