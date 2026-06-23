/* ================================================================
 *  告警 API
 * ================================================================ */

import { Router, Request, Response } from 'express';
import { alertEngine } from '../services/alert-engine';

const router = Router();

/** GET /api/alerts/rules — 获取告警规则列表 */
router.get('/rules', (_req: Request, res: Response) => {
  res.json({ rules: alertEngine.getRules() });
});

/** PATCH /api/alerts/rules/:id — 更新告警规则 */
router.patch('/rules/:id', (req: Request, res: Response) => {
  const updated = alertEngine.updateRule(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }
  res.json({ rule: updated });
});

/** GET /api/alerts/active — 获取当前活跃告警 */
router.get('/active', (_req: Request, res: Response) => {
  res.json({ alerts: alertEngine.getActiveAlerts() });
});

/** GET /api/alerts/history — 获取告警历史 */
router.get('/history', (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  res.json({ alerts: alertEngine.getAlertHistory(limit) });
});

export default router;
