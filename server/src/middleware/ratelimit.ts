/* ================================================================
 *  速率限制中间件 —— 防止恶意刷量
 * ================================================================ */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

/** 每分钟最多上报请求数 */
const RATE_LIMIT = 300;

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const key = `report:${ip}`;

  let entry = store.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + 60_000 };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  next();
}

/** 定期清理过期条目 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 60_000);
