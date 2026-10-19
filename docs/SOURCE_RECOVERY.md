# fodder.gg 公开代码恢复

本机恢复位置：`recovery/`。归档：`fodder-source-recovery-2026-10-19.zip`。原始恢复树与历史归档不直接打包；经 SHA-256 校验的官方扩展运行文件副本已进入 1.2.0 测试包，见 `vendor/fodder/provenance.json`。

| 内容 | 结果 |
| --- | --- |
| `https://fodder.gg/client.core.js` | 1.3.10，原始文件 1,169,110 字节，可读版 48,721 行 |
| `https://fodder.gg/fodder.user.js` | 当前公开用户脚本加载器 |
| `https://fodder.gg/i18n/zh.json` | 中文语言包 |
| Google CRX 官方分发 | 扩展 1.3.9；ID `oiobjpgojmnjalcibebleakhadcokkak`；完整原包与解包文件 |
| `https://www.fodder.gg/zh` | HTML 及引用的 20 个 JS/CSS 资源 |
| `https://github.com/nezygis/fc26-playstyle-evo-helper` | 105 次公开提交，Git bundle 与早期可读源码 |

六份格式化 JS 均通过语法解析，并与原文件做去除位置和字面量书写差异后的 AST 比较，结果一致。来源、下载时间、SHA-256、函数行号和接口路径保存在本机恢复报告中。

当前发布客户端没有 sourceMappingURL，因此原始模块、变量名和注释未完全恢复。客户端请求 `/solve`、`/api/solve-streamlined` 等后端；未取得服务端实现或数据库。原客户端已接入扩展，并仅在不含 EA services/repositories 的离线页面夹具中验证加载；没有修改其授权判断，也没有测试真实 EA 会话或生产业务写入。

后续静态分析见 [后端恢复记录](https://github.com/Jinmy414/FC-supporter/blob/main/docs/BACKEND_RECOVERY.md) 和 [61 个后端请求调用点](https://github.com/Jinmy414/FC-supporter/blob/main/docs/backend-call-sites.json)。其中当前 SBC 路径为 `/v1/solves`；保留的旧 `/solve` 字符串不代表当前仍在使用该接口。新增报告独立于原恢复 ZIP，原归档及校验值保持原样。
