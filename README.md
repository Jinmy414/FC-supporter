# FC Supporter

FC 阵容规划工具与安装站点，当前为 **1.1.0-beta.1**。Chromium 页面与求解流程已加入实际浏览器测试；跨平台安装和 EA 会话验收仍待完成，尚未达到完整 Gold 功能迁移的发布标准。

- 安装首页：<https://jinmy414.github.io/FC-supporter/>
- 网页工具：<https://jinmy414.github.io/FC-supporter/app.html>
- 安装页兼容地址：<https://jinmy414.github.io/FC-supporter/install.html>

## 当前能力

导入 CSV/JSON 球员名单后，可在浏览器本地使用：单个 SBC 规划、最多 20 个挑战的批量规划、市场估价与预算、解后换人、阵容生成器、活动阵容及按位置的 Meta 估算。扩展、网页版分别在自身浏览器存储中保存名单，不自动共享数据。修改球员名单会清除旧规划，避免继续使用失效结果。

批量 JSON 支持 `minUniqueLeagues`、`minUniqueNations`、`minUniqueClubs`（0–11）和 `maxUniqueLeagues`、`maxUniqueNations`、`maxUniqueClubs`（1–11）。例如 `{"minUniqueLeagues": 2, "maxUniqueLeagues": 3}` 要求来自 2–3 个联赛。最小值大于最大值会直接报错；指定上限时缺失对应分组数据不会被当作满足条件。

Chrome/Edge 扩展 ZIP 可以通过开发者模式加载。另提供可用于 Chrome/Edge、Firefox、iOS Safari Userscripts、Android Firefox 的用户脚本。**当前用户脚本仅在 EA 页面添加规划工具入口**；它没有同步 EA 俱乐部、购买球员或提交 SBC 的能力。

## 数据与计算范围

导入文件最多 5 MB、10000 张卡。每张实体卡需要唯一 `id`、`name`、`rating`（1–99）、`positions`。`owned=true` 表示自有球员；市场球员必须提供大于 0 的 `price`。可选 `assetId` 表示球员本体，用于防止不同卡片版本同时进入同一套阵容。俱乐部、联赛、国家和基础属性字段见 `data/players-template.csv`。

“评分”采用算术平均后取整的规划估算，未实现 EA SBC 的完整球队评分公式。化学反应只模拟普通球员基础阈值与手动 `chemBonus`，未完整模拟 Icon、Hero、特殊卡与教练；未知位置不贡献化学反应。位置评分使用导入的 Meta 值或属性权重，不代表 fodder.gg 的专有 Meta 模型。

搜索有时间、节点与候选数量限制，结果为满足当前本地估算规则的可行规划，不能保证全局最优。挑战组优先处理评分和化学反应要求较高的挑战；后续挑战失败时会回溯前面的阵容，尝试释放关键球员。整组最多搜索 4 秒、60 次单挑战调用，每层最多尝试 12 种排除分支；优先寻找全部挑战都可行的分配，未完成时保留已找到的最多挑战结果，不能据此判定整组无解。求解在 Web Worker 中运行，可以随时停止。

## 开发与检查

需要 Node.js 20 或更新版本；打包另外使用 Python 3 标准库。

```sh
npm ci
npm run package
npm test
npm run check
npx playwright install chromium
npm run test:browser
```

`npm test` 包含核心规则回归、DOM 交互和后台求解协议测试。DOM 测试使用 jsdom 与隔离的 Worker 协议测试环境，不等同于真实 Chrome/Firefox/Safari 验收。

`npm run test:browser` 使用真实 Chromium，覆盖 1440px、390px 和 320px 宽度下的安装面板、指南、ZIP 下载及哈希、文件导入、真实 Web Worker 求解、名单持久化、挑战组回溯及阵型卡片边界。截图、失败追踪及 HTML 报告保存到 `artifacts/`。手机尺寸模拟不等于真机 Safari 或 Android 扩展安装验收。CI 会运行浏览器测试，失败时阻止部署。

`npm run package` 将公共脚本同步到 `site/` 并生成扩展 ZIP、用户脚本与 SHA-256 清单。产物只包含本项目运行文件；源码恢复归档不进入安装包。

本地预览可在项目目录运行 `python3 -m http.server 8080 --directory site`，再打开 `http://127.0.0.1:8080/`。使用 Web Worker 的页面应通过 HTTP 或扩展安装打开。

## 发布进度

见 [发布检查清单](docs/RELEASE_STATUS.md)。GitHub Pages 使用 `.github/workflows/pages.yml`。开发改动先通过检查，再进入发布；未通过的浏览器和 EA 会话检查必须明确保留。

## fodder.gg 代码恢复

已经找回公开客户端 1.3.10、Chrome 官方分发包 1.3.9、语言包、网站前端资源以及早期公开仓库的 105 次提交。恢复原件与可读版保存在本机 `recovery/`，不参与安装包构建，亦未执行或改动其授权逻辑。完整的服务端工程尚未找回，不能将前端恢复等同于 Gold 已独立可用。详见 [恢复记录](docs/SOURCE_RECOVERY.md)。
