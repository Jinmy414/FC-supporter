# 后端恢复线索与重建边界

日期：2026-10-19。未找到原后端工程。用户不记得仓库或部署平台，继续依据已恢复客户端进行静态分析。

## 可重复的接口索引

运行：

```sh
node scripts/backend-contracts.cjs recovery/readable/client.core.js docs/backend-call-sites.json
node --test tests/backend-contracts.test.cjs
```

索引记录 61 个 `be(...)` 后端请求调用点，包括代码行、所在函数、路由表达式、显式 HTTP 方法及请求体表达式。动态路由保留表达式；无法静态判断的方法标为 unresolved。数量是调用点数，不是独立接口或完整功能数量。输入文件 SHA-256 写入报告，行号均针对该可读版。脚本只解析 AST，不执行恢复客户端，不访问生产接口。

此索引不是完整的服务端契约。缺少字段取值范围、错误码全集、鉴权规则、状态迁移和数据库约束；不能以静态索引测试通过声称已通过服务端兼容测试。

## 已确认的调用链

| 模块 | 客户端可见协议 | 证据位置（可读版 client.core.js） | 仍缺失 |
| --- | --- | --- | --- |
| SBC 求解 | POST `/v1/solves`，`Prefer: wait=25`；结果 status=running 时每 2 秒 GET `/v1/solves/{id}`；取消时尝试 DELETE | `rL`、`oL`，约 14580–14662 行 | 服务端求解器、任务队列、价格与卡片数据库、完整结果结构 |
| 求解输入 | platform、pool、filters、policy；单挑战 challenge/squads，整组 set/runs；可选 groups | `rL`，约 14580–14616 行 | 各 requirement 的实际语义和边界 |
| 换人 | POST `/replace`；请求体由调用方提供 | `aL`，14709 行 | 替换优化算法与完整契约 |
| 积分挑战 | POST `/api/solve-streamlined`；target、pool、filters、platform、perSubmit、times、fullTarget、prefer、allowPartial、allowCopies；可选 setId 等 | 22620–22701 行 | 积分求解、重复与部分完成策略 |
| 价格 | POST `/prices/lookup`；resourceIds、platform 及可选附加元数据；读取响应 cards[id] 的 price、approx、max、name、rating、rareflag | `GD`，29424–29492 行 | 实时数据源、缓存时效、价格真实性校验 |
| 阵容构建 | POST `/v1/squad-builds`；tactic、pool、count、minDifferent、chooseManager、engine；可选 manager/managers、keep、budget、platform、ratingMin/Max 和国家/联赛/俱乐部过滤 | `Y6`，37437 行 | 优化器、经理与特殊卡化学反应模型 |
| 会话与功能能力 | GET `/v1/session`、`/v1/manifest`；manifest.surfaces 指向 `/v1/content/{surface}/{version}`；读取 tiers、routines、evolutions、features 等 JSON | `OS`、`fh`、`M4`，30901–31054 行 | 账户数据库、套餐能力、内容版本与原始配置数据 |

`qo(path)` 根据运行时 config.solveBase 选择求解服务地址（31103 行）；因此客户端内的相对路径不能证明服务器实际部署位置。`be(...)` 是传输封装（30641 行）：包括标识头、可选 Bearer 会话、gzip、超时和有限重试。恢复传输代码不能替代服务端会话或授权。

manifest.surfaces 在已检查代码中加载的是 JSON 内容；不能据此认定发现了尚未下载的服务端源码或 JS 模块。

## 下一步实现依据

现有本地 SBC、阵容和活动规划器可继续独立改进；它们目前使用项目自身的数据结构和估算规则，未实现上述原站协议。优先补全实际规则与明确的离线样例，再考虑独立后端适配。不可用“模拟成功响应”代替真实求解、价格或 EA 操作。公开安装页保持测试版标识。

本次新增的四项测试只验证索引工具的静态提取和不执行输入代码，不计为四项 Gold 功能验收。
