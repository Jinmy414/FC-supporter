# FC Supporter · Local Planner

一个从零编写的 Manifest V3 浏览器扩展，用于离线规划 FC 阵容和 SBC。它依据公开功能说明实现独立工具，不包含 fodder.gg 源码、EA 接口或网页注入代码。

公开安装页源码位于 `site/`，GitHub Actions 工作流会将其发布到 GitHub Pages。默认地址为 <https://jinmy414.github.io/FC-supporter/>；首次启用 Pages 时，在仓库 Settings → Pages 中将 Source 设为 **GitHub Actions**。

## 当前功能

- 导入、导出本地球员名单（CSV 或 JSON）；可把自有球员和手动录入的市场球员放在同一数据集中。
- 按评分、化学反应、预算、球员质量、联赛/国家/俱乐部数量约束求 SBC 阵容。
- 对 1–20 个挑战进行批量规划，并避免在挑战之间重复使用相同球员卡。
- 在一套已有解中替换单名球员，并重新检查整套要求。
- 按阵型、战术位置和预算构建阵容；提供基于导入数据的角色 Meta 评分。
- 在浏览器本地保存数据，不依赖服务器。

## 安装

1. 下载或克隆此仓库。
2. 在 Chrome 地址栏打开 `chrome://extensions`。
3. 开启“开发者模式”，选择“加载已解压的扩展程序”，再选中本目录。
4. 点击工具栏中的扩展图标，打开 FC Supporter。
5. 在“数据”页导入自己的 CSV/JSON 球员表。字段模板见 `data/players-template.csv`。

CSV 的 `positions` 使用逗号分隔，例如 `ST,CF`；`owned` 接受 `true/false`、`1/0`、`是/否`。未自有球员的 `price` 是手动维护的估价。

## SBC 约束格式

在求解页输入一个对象或最多 20 个对象的 JSON 数组。支持 `name`、`minRating`、`minChemistry`、`budget`、`quality`（`bronze`/`silver`/`gold`）、`maxSameLeague`、`maxSameNation`、`maxSameClub`、`minUniqueLeagues`、`minUniqueNations`、`minUniqueClubs` 和 `formation`。化学反应与阵容评分是规划估算，具体结果可能因特殊卡化学加成或游戏规则调整而不同。

## 与 EA 的边界

此扩展没有 `host_permissions`、`content_scripts` 或 EA 网页访问权限。它不会读取 EA 登录态、抓取俱乐部、调用 EA 接口、自动买球员或提交 SBC。市场价格及球员名单由用户自己导入。EA 的公开规则建议避免第三方浏览器扩展，并禁止自动买家和机器人；见 [EA SPORTS FC 规则](https://help.ea.com/en/articles/ea-sports-fc/fc-rules/)。

## 功能来源

Gold 功能范围依据 fodder.gg 当前公开的 [FC 27 功能页](https://fodder.gg/zh/features) 和 [首页说明](https://fodder.gg/)。本项目只参考公开功能描述，未复制其实现或素材。
