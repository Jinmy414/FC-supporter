# FC Supporter

FC 27 阵容规划网页工具。打开 GitHub Pages 首页即可直接使用；扩展安装页是可选入口：

- 网页工具：<https://jinmy414.github.io/FC-supporter/>
- 扩展安装：<https://jinmy414.github.io/FC-supporter/install.html>
- 源码仓库：<https://github.com/Jinmy414/FC-supporter>

## 功能

- SBC 阵容求解：按球员评分、估算化学反应、预算、品质和俱乐部约束规划 11 人阵容。
- 多挑战规划：一次输入最多 20 个挑战，并避免在不同挑战间重复使用同一张球员卡。
- 解后换人：替换一名球员后重新检查挑战要求。
- 阵容构建：按阵型、预算、球员来源和位置 Meta 估分组建阵容。
- Gauntlet / 实时活动阵容：按活动评分、化学反应、预算和重复俱乐部/联赛/国家限制求解。
- 位置评分：比较球员在各位置的导入 Meta 值或基础属性估算值。
- 球员数据：从 CSV/JSON 导入、导出和备份自己的球员名单。

网页工具完全在浏览器本地运行，数据保存在当前浏览器的 localStorage。导入球员表后可使用完整规划功能；“载入演示数据”可先体验界面和求解器。

## 运行方式

网页直接访问 GitHub Pages 首页即可使用。项目也提供 Chrome/Edge 扩展源码包，见 [扩展安装说明](site/install.html)。扩展可在 `chrome://extensions` 或 `edge://extensions` 中通过开发者模式加载。

Pages 由 GitHub Actions 发布。首次启用时，仓库 Settings → Pages 的 Source 需要设置为 **GitHub Actions**。

## 数据与估算

球员名单、Meta 分数和市场价格由用户自行导入或维护。化学反应和阵容评分是规划估算，不代表游戏服务器结果；特殊卡加成、实时价格及 SBC 的具体规则需要在游戏内核对。

挑战要求可输入一个对象或最多 20 个对象的 JSON 数组，支持 `name`、`minRating`、`minChemistry`、`budget`、`quality`（`bronze`/`silver`/`gold`）、`maxSameLeague`、`maxSameNation`、`maxSameClub`、`minUniqueLeagues`、`minUniqueNations`、`minUniqueClubs` 和 `formation`。

## 与 EA 和 fodder.gg 的关系

FC Supporter 是独立项目，参考 fodder.gg 当前公开的 [Gold 功能介绍](https://fodder.gg/zh/gold) 实现本地规划流程。公开 Gold 页的 JavaScript 只包含营销页展示，未发现可用的 source map，因此不能从这份公开页面代码恢复扩展内部实现。工具不连接 EA、不读取 EA 登录状态、不抓取俱乐部或市场数据，也不会自动购买或提交 SBC。请遵循 [EA SPORTS FC 规则](https://help.ea.com/en/articles/ea-sports-fc/fc-rules/)。
