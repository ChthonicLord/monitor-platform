# 前端监控平台

基于 TypeScript 构建的前端监控 SDK 和可视化监控平台。覆盖错误、性能、行为、资源四维采集，支持实时大盘、性能趋势、多维对比分析。

## 项目结构

```
Desktop/project/
├── frontend-monitor-sdk/          # 前端监控 SDK
│   └── src/
│       ├── index.ts               # 业务接入层 (createMonitor API)
│       ├── core/monitor.ts        # 核心调度器
│       ├── collectors/            # 采集层
│       │   ├── error-collector.ts
│       │   ├── performance-collector.ts
│       │   ├── behavior-collector.ts
│       │   └── resource-collector.ts
│       ├── processors/            # 数据处理层
│       │   └── pipeline.ts        # 采样 / 脱敏 / 去重 / 聚合
│       ├── reporters/             # 上报层
│       │   └── batch-reporter.ts  # 批量合并 / 队列 / 重试
│       ├── transports/            # 传输层
│       │   └── index.ts           # sendBeacon / XHR / Image
│       ├── types/index.ts         # 类型定义
│       └── utils/index.ts         # 工具函数
│
└── monitor-platform/              # 监控平台
    ├── server/                    # 后端服务 (Express + TypeScript)
    │   └── src/
    │       ├── index.ts           # 服务入口
    │       ├── routes/
    │       │   ├── report.ts      # SDK 数据接收入口
    │       │   └── query.ts       # 查询分析 API
    │       ├── services/
    │       │   ├── elasticsearch.ts  # ES 适配（明细日志）
    │       │   ├── clickhouse.ts     # ClickHouse 适配（聚合指标）
    │       │   └── kafka.ts          # Kafka 适配（数据管道）
    │       └── middleware/
    │           ├── cors.ts
    │           └── ratelimit.ts
    │
    └── dashboard/                 # 前端展示 (React + Vite + TypeScript)
        └── src/
            ├── App.tsx            # 路由
            ├── components/
            │   └── Layout.tsx     # 布局（侧边栏导航）
            ├── pages/
            │   ├── RealtimeDashboard.tsx   # 实时大盘
            │   ├── PageDetail.tsx          # 页面详情
            │   ├── PerformanceTrend.tsx    # 性能趋势
            │   └── ComparisonAnalysis.tsx  # 对比分析
            └── services/
                └── api.ts         # API 调用层
```

## 架构设计

### SDK 数据流

```
┌─────────────────────────────────────────────────────────┐
│                   业务接入层（API）                      │
│  init()  |  track()  |  setUser()  |  setCommonParams() │
├─────────────────────────────────────────────────────────┤
│                   核心采集层（Collector）               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Error     │ │Performance│ │Behavior  │ │Resource  │  │
│  │Collector │ │Collector  │ │Collector │ │Collector │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│                   数据处理层（Processor）               │
│  数据聚合  |  敏感信息脱敏  |  采样控制  |  去重过滤   │
├─────────────────────────────────────────────────────────┤
│                   上报层（Reporter）                    │
│  批量合并  |  队列管理  |  重试机制  |  降级策略      │
├─────────────────────────────────────────────────────────┤
│                   底层支撑（Transport）                 │
│  navigator.sendBeacon  |  XMLHttpRequest  |  Image     │
└─────────────────────────────────────────────────────────┘
```

### 平台数据流

```
SDK 上报 → POST /api/report → Kafka（削峰）→ ES（明细7天）+ ClickHouse（聚合长期）
Dashboard → GET /api/query/* → ES / ClickHouse → 可视化展示
```

## 快速开始

### 1. SDK 开发

```bash
cd frontend-monitor-sdk
pnpm install
pnpm dev        # 开发模式（watch）
pnpm build      # 构建产出 dist/
```

### 2. Server 启动

```bash
cd monitor-platform/server
pnpm install
pnpm dev        # 启动在 http://localhost:3001
```

### 3. Dashboard 启动

```bash
cd monitor-platform/dashboard
pnpm install
pnpm dev        # 启动在 http://localhost:5173
                # Vite 自动代理 /api → localhost:3001
```

## SDK 使用指南

### 方式一：一行接入（推荐）

将 SDK 部署到 CDN / 静态服务器后，业务方只需一行 `<script>` 标签，无需写任何 JS：

```html
<script
  src="https://cdn.example.com/monitor/1.0.0/monitor.umd.js"
  data-app-id="my-app"
  data-report-url="https://monitor.example.com/api/report"
  data-sample-rate="0.1"
  data-debug="false"
></script>
```

SDK 加载后会自动读取 `data-*` 属性完成初始化和数据采集。初始化后的实例挂载在 `window.__monitor__`，SPA 项目可通过它在路由切换时手动上报 PV：

```js
// React Router 示例
useEffect(() => {
  window.__monitor__?.trackPageView(location.pathname);
}, [location]);
```

**支持的 data 属性：**

| 属性 | 说明 | 默认值 |
|------|------|--------|
| `data-app-id` | 必填，应用标识 | - |
| `data-report-url` | 必填，上报地址 | - |
| `data-app-version` | 应用版本 | - |
| `data-sample-rate` | 采样率 0-1 | `1` |
| `data-debug` | 调试模式 | `false` |
| `data-enable-performance` | 开启性能采集 | `true` |
| `data-enable-behavior` | 开启行为采集 | `true` |
| `data-enable-resource` | 开启资源采集 | `true` |
| `data-max-duplicate-errors` | 同类错误去重上限 | `5` |
| `data-batch-max-size` | 批量上报最大条数 | `10` |
| `data-batch-interval` | 批量上报间隔 ms | `5000` |
| `data-max-retries` | 失败重试次数 | `3` |

### 方式二：ESM import（手动初始化）

```ts
import { createMonitor } from '@monitor/frontend-sdk';
```

### 手动初始化（ESM import 方式）

```ts
import { createMonitor } from '@monitor/frontend-sdk';

const monitor = createMonitor({
  appId: 'my-app',                    // 必填：应用标识
  reportUrl: '/api/report',           // 必填：上报地址
  appVersion: '1.0.0',               // 应用版本
  debug: false,                       // 调试模式
  sampleRate: 1,                      // 采样率 0-1
  enablePerformance: true,            // 开启性能采集
  enableBehavior: true,               // 开启行为采集
  enableResource: true,               // 开启资源采集
  maxDuplicateErrors: 5,              // 同类错误最大去重次数
  batchMaxSize: 10,                   // 批量上报最大条数
  batchInterval: 5000,                // 批量上报间隔 ms
  maxRetries: 3,                      // 失败重试次数
  sensitiveFields: ['password'],      // 敏感字段脱敏
  beforeReport: (event) => {          // 上报前钩子
    if (event.pageUrl.includes('admin')) return null; // 返回 null 丢弃
    return event;
  },
});
```

> 如果使用方式一（data 属性自动初始化），实例已挂载在 `window.__monitor__`，下面所有 API 用 `window.__monitor__.track(...)` 即可。

### 手动埋点

```ts
// ESM 方式
monitor.track('button_click', { btnName: 'submit', page: 'login' });

// data 属性方式 (script 标签)
window.__monitor__?.track('button_click', { btnName: 'submit' });
```

### 设置用户信息

```ts
monitor.setUser({ userId: '12345', userName: '张三' });
// 或 window.__monitor__?.setUser({ userId: '12345', userName: '张三' });
```

### 设置公共参数

```ts
monitor.setCommonParams({ channel: 'wechat', version: '2.1.0' });
// 或 window.__monitor__?.setCommonParams({ channel: 'wechat', version: '2.1.0' });
```

### SPA 路由切换时手动 PV

```ts
// React Router（ESM 方式）
useEffect(() => {
  monitor.trackPageView(window.location.href);
}, [location]);

// React Router（data 属性方式）
useEffect(() => {
  window.__monitor__?.trackPageView(window.location.href);
}, [location]);
```

## 查询 API 参考

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/report` | POST | SDK 数据上报入口 |
| `/api/query/dashboard` | GET | 实时大盘 (最近1h 统计) |
| `/api/query/errors` | GET | 错误列表 (支持分页/搜索) |
| `/api/query/errors/stats` | GET | 错误按类型聚合统计 |
| `/api/query/performance` | GET | 性能聚合 (支持按 时/日/页面 分组) |
| `/api/query/behaviors` | GET | 行为日志列表 |
| `/api/query/resources` | GET | 资源日志列表 |
| `/api/health` | GET | 健康检查 |

### 查询参数

```
GET /api/query/errors?appId=my-app&startTime=1700000000000&endTime=1700100000000&page=1&pageSize=20&keyword=TypeError
GET /api/query/performance?appId=my-app&metric=ttfb&groupBy=day&startTime=1700000000000
GET /api/query/dashboard?appId=my-app
```

## 采集能力一览

| 维度 | 采集内容 | 实现方式 |
|------|---------|---------|
| **JS 错误** | message / stack / filename / lineno / colno | `window.onerror` |
| **Promise 异常** | reason message / stack | `unhandledrejection` |
| **资源错误** | 加载失败的 script / img / link | `error` 事件捕获 |
| **性能指标** | TTFB / DNS / TCP / DOM Parse / LCP / FID / CLS / FCP | Navigation Timing L2 + PerformanceObserver |
| **页面浏览** | PV / SPA 路由变化 | 自动 + 手动埋点 |
| **用户行为** | click / scroll / input | DOM 事件捕获 |
| **资源加载** | script / style / image / font 耗时 & 大小 | PerformanceObserver (resource) |
| **自定义事件** | 任意 key-value | `monitor.track()` |

## 生产部署建议

当前服务层的 ES / ClickHouse / Kafka 适配器使用**内存模拟实现**，可直接启动验证数据流。生产环境建议：

1. **Elasticsearch** — 替换 `services/elasticsearch.ts`，接入 `@elastic/elasticsearch`
2. **ClickHouse** — 替换 `services/clickhouse.ts`，接入 `@clickhouse/client`
3. **Kafka** — 替换 `services/kafka.ts`，接入 `kafkajs`
4. **IP → 地域** — 在 Kafka 清洗层接入 `ip2region`
5. **UA → 设备** — 接入 `ua-parser-js`
6. **SourceMap 解析** — 接入 `source-map` 库还原压缩堆栈
7. **告警规则** — 基于 ClickHouse 聚合数据配置阈值告警

三个适配器的接口保持一致，替换实现即可无缝切换，无需修改路由和 Dashboard 代码。
