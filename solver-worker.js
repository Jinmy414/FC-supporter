"use strict";
importScripts("core.js");
self.onmessage = event => {
  const {
    type,
    players,
    requirements,
    options,
    includeMarket
  } = event.data;
  try {
    let result;
    if (type === "batch") {
      result = self.FCSupporterCore.solveBatch(players, requirements, includeMarket, progress => self.postMessage({
        type: "progress",
        ...progress
      }));
    } else if (type === "squad") result = self.FCSupporterCore.buildSquad(players, options);
    else throw new Error("不支持的求解操作。");
    self.postMessage({
      type: "result",
      result
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error.message || "无法完成求解。"
    });
  }
};
