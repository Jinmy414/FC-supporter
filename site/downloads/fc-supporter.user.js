// ==UserScript==
// @name         FC Supporter · 阵容规划入口
// @namespace    https://jinmy414.github.io/FC-supporter/
// @version      1.1.0
// @description  在 EA FC Web App 中添加本地阵容规划工具入口。不会读取俱乐部、自动购买或提交 SBC。
// @match        https://www.ea.com/ea-sports-fc/ultimate-team/web-app*
// @match        https://www.ea.com/*/ea-sports-fc/ultimate-team/web-app*
// @run-at       document-idle
// @noframes
// @updateURL    https://jinmy414.github.io/FC-supporter/downloads/fc-supporter.user.js
// @downloadURL  https://jinmy414.github.io/FC-supporter/downloads/fc-supporter.user.js
// @grant        none
// ==/UserScript==
(() => {
  "use strict";
  if (document.getElementById("fc-supporter-launcher")) return;
  const host = document.createElement("div");
  host.id = "fc-supporter-launcher";
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = ":host{all:initial;position:fixed;right:18px;bottom:24px;z-index:2147483000}button{display:flex;align-items:center;gap:9px;min-height:44px;padding:0 17px;border:1px solid #34d39970;border-radius:999px;background:#11271f;color:#e5f4ed;font:700 13px system-ui,sans-serif;box-shadow:0 6px 24px #0005;cursor:pointer}button:hover{background:#174733}button:focus-visible{outline:2px solid #34d399;outline-offset:4px}span{color:#34d399;font-size:17px}";
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "在新标签页打开 FC Supporter 阵容规划工具");
  button.title = "打开本地阵容规划工具";
  const mark = document.createElement("span");
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = "◇";
  button.append(mark, "FC Supporter");
  button.addEventListener("click", () => {
    window.open("https://jinmy414.github.io/FC-supporter/app.html", "_blank", "noopener,noreferrer");
  });
  root.append(style, button);
  document.body.append(host);
})();
