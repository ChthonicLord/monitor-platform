/* ================================================================
 *  CORS 中间件
 * ================================================================ */

import { Request, Response, NextFunction } from 'express';

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // 动态回显请求来源，支持 credentials: include
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}
