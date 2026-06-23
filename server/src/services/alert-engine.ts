/* ================================================================
 *  Alert Engine — 告警规则引擎
 *
 *  四层金字塔：
 *    P0 - 致命：服务不可用（错误率 > 5% 持续 2 分钟）
 *    P1 - 严重：核心功能受损（支付接口成功率 < 95%）
 *    P2 - 一般：性能劣化（LCP > 2.5s 占比 > 30%）
 *    P3 - 提示：异常波动（错误数同比 > 200%）
 *
 *  执行流程：每 30 秒轮询 → 检查规则 → 触发/恢复告警
 * ================================================================ */

import { elasticsearch } from './elasticsearch';
import { clickhouse } from './clickhouse';

export type AlertLevel = 'P0' | 'P1' | 'P2' | 'P3';

export interface AlertRule {
  id: string;
  name: string;
  level: AlertLevel;
  type: 'error_rate' | 'api_success_rate' | 'lcp_threshold' | 'error_spike';
  threshold: number;
  durationSeconds: number; // 持续多少秒才触发
  enabled: boolean;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  level: AlertLevel;
  message: string;
  triggeredAt: number;
  resolvedAt?: number;
  status: 'firing' | 'resolved';
  currentValue: number;
}

class AlertEngine {
  private rules: AlertRule[] = [];
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private alertHistory: AlertEvent[] = [];
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private ruleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // 默认规则集
  private defaultRules: AlertRule[] = [
    {
      id: 'p0-error-rate',
      name: '错误率超过 5%',
      level: 'P0',
      type: 'error_rate',
      threshold: 5,        // 5%
      durationSeconds: 120, // 持续 2 分钟
      enabled: false,       // 默认关闭，需手动开启
    },
    {
      id: 'p2-lcp-threshold',
      name: 'LCP > 2.5s 占比超 30%',
      level: 'P2',
      type: 'lcp_threshold',
      threshold: 30,       // 30%
      durationSeconds: 60,
      enabled: true,
    },
    {
      id: 'p3-error-spike',
      name: '错误数同比激增 200%',
      level: 'P3',
      type: 'error_spike',
      threshold: 200,      // 200%
      durationSeconds: 60,
      enabled: true,
    },
  ];

  constructor() {
    this.rules = [...this.defaultRules];
  }

  start(): void {
    if (this.pollTimer) return;
    console.log('[AlertEngine] Started, checking every 30s');
    this.pollTimer = setInterval(() => this.evaluate(), 30_000);
    this.evaluate(); // 立即执行一次
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.ruleTimers.forEach((t) => clearTimeout(t));
    this.ruleTimers.clear();
  }

  getRules(): AlertRule[] {
    return this.rules;
  }

  updateRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const idx = this.rules.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.rules[idx] = { ...this.rules[idx], ...updates };
    return this.rules[idx];
  }

  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(limit = 50): AlertEvent[] {
    return this.alertHistory.slice(-limit).reverse();
  }

  /** 核心评估逻辑 */
  private evaluate(): void {
    const now = Date.now();
    const windowMs = 120_000; // 检查最近 2 分钟的数据

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        const value = this.checkCondition(rule, now - windowMs, now);

        if (this.isFiring(rule, value)) {
          // 条件满足，检查是否需要持续观察
          if (!this.ruleTimers.has(rule.id)) {
            this.ruleTimers.set(
              rule.id,
              setTimeout(() => {
                // 等待 durationSeconds 后再次确认
                const currentValue = this.checkCondition(rule, now - windowMs, now);
                if (this.isFiring(rule, currentValue)) {
                  this.fireAlert(rule, currentValue);
                }
                this.ruleTimers.delete(rule.id);
              }, rule.durationSeconds * 1000),
            );
          }
        } else {
          // 条件不满足，清除定时器
          const existingTimer = this.ruleTimers.get(rule.id);
          if (existingTimer) {
            clearTimeout(existingTimer);
            this.ruleTimers.delete(rule.id);
          }
          // 如果之前有告警在 firing，标记恢复
          this.resolveIfNeeded(rule, value);
        }
      } catch (err) {
        console.error(`[AlertEngine] Error evaluating rule ${rule.id}:`, err);
      }
    }
  }

  private checkCondition(rule: AlertRule, startTime: number, endTime: number): number {
    switch (rule.type) {
      case 'error_rate': {
        const typeCounts = elasticsearch.aggregateByType({ startTime, endTime });
        const total = Object.values(typeCounts).reduce((s, v) => s + v, 0);
        const errors = typeCounts.error || 0;
        return total > 0 ? (errors / total) * 100 : 0;
      }
      case 'lcp_threshold': {
        const perf = clickhouse.aggregate({ metric: 'largestContentfulPaint', startTime, endTime, groupBy: 'hour' });
        let totalSamples = 0;
        let slowSamples = 0;
        for (const b of perf.buckets) {
          totalSamples += b.count;
          if (b.avg > 2500) slowSamples += b.count; // LCP > 2.5s
        }
        return totalSamples > 0 ? (slowSamples / totalSamples) * 100 : 0;
      }
      case 'error_spike': {
        const now = Date.now();
        const oneHourAgo = now - 3600_000;
        const twoHoursAgo = now - 7200_000;
        const current = elasticsearch.aggregateByType({ startTime: oneHourAgo }).error || 0;
        const previous = elasticsearch.aggregateByType({ startTime: twoHoursAgo, endTime: oneHourAgo }).error || 0;
        if (previous === 0) return current > 0 ? 999 : 0;
        return ((current - previous) / previous) * 100;
      }
      default:
        return 0;
    }
  }

  private isFiring(rule: AlertRule, value: number): boolean {
    return value >= rule.threshold;
  }

  private fireAlert(rule: AlertRule, value: number): void {
    const existingAlert = Array.from(this.activeAlerts.values())
      .find((a) => a.ruleId === rule.id && a.status === 'firing');

    if (existingAlert) {
      // 已在告警中，更新当前值
      existingAlert.currentValue = value;
      return;
    }

    const alert: AlertEvent = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      level: rule.level,
      message: `[${rule.level}] ${rule.name}: current=${value.toFixed(1)}%, threshold=${rule.threshold}%`,
      triggeredAt: Date.now(),
      status: 'firing',
      currentValue: value,
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // 限制历史记录
    if (this.alertHistory.length > 500) {
      this.alertHistory = this.alertHistory.slice(-500);
    }

    console.log(`[AlertEngine] ALERT FIRED: ${alert.message}`);
  }

  private resolveIfNeeded(rule: AlertRule, value: number): void {
    for (const alert of this.activeAlerts.values()) {
      if (alert.ruleId === rule.id && alert.status === 'firing') {
        alert.resolvedAt = Date.now();
        alert.status = 'resolved';
        alert.currentValue = value;
        console.log(`[AlertEngine] ALERT RESOLVED: ${alert.message}`);
      }
    }
  }
}

export const alertEngine = new AlertEngine();
