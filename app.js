(function () {
  "use strict";

  const Core = window.FCSupporterCore;
  const state = { players: [], results: [], swapChoices: [], squadResult: null, eventResult: null, toastTimer: null };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const storage = globalThis.chrome?.storage?.local;

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function toast(message, isError = false) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.classList.add("show");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => element.classList.remove("show"), 2800);
  }

  async function savePlayers() {
    if (storage) await storage.set({ fcSupporterPlayers: state.players });
    else localStorage.setItem("fcSupporterPlayers", JSON.stringify(state.players));
    renderAll();
  }

  async function loadPlayers() {
    if (storage) {
      const saved = await storage.get("fcSupporterPlayers");
      state.players = Array.isArray(saved.fcSupporterPlayers) ? saved.fcSupporterPlayers.map(Core.normalizePlayer) : [];
    } else {
      try { state.players = JSON.parse(localStorage.getItem("fcSupporterPlayers") || "[]").map(Core.normalizePlayer); }
      catch (_) { state.players = []; }
    }
    renderAll();
  }

  function qualityLabel(player) {
    return ({ bronze: "铜", silver: "银", gold: "金" })[Core.itemQuality(player)] || "";
  }

  function priceLabel(player) {
    return player.owned ? "俱乐部" : `${Number(player.price || 0).toLocaleString()} 金币`;
  }

  function playerPosition(player, result, index) {
    const assignment = result?.evaluation?.assignments?.find(item => item.playerIndex === index);
    return assignment?.position || player.positions[0] || "—";
  }

  function renderPlayerTable() {
    const target = $("#playerTable");
    $("#rosterDescription").textContent = state.players.length ? `已保存 ${state.players.length} 张球员卡。新导入的数据会替换当前名单。` : "还没有导入球员数据。";
    if (!state.players.length) {
      target.innerHTML = '<div class="no-results">导入 CSV 或 JSON，或载入演示数据开始使用。</div>';
      return;
    }
    const rows = state.players.slice(0, 500).map(player => `<tr>
      <td class="rating-cell">${escapeHTML(player.rating)}</td>
      <td>${escapeHTML(player.name)}</td>
      <td>${escapeHTML(player.positions.join(" / ") || "—")}</td>
      <td>${escapeHTML(player.club || "—")}</td>
      <td>${escapeHTML(player.league || "—")}</td>
      <td>${escapeHTML(player.nation || "—")}</td>
      <td>${player.owned ? '<span class="player-tag tag-owned">俱乐部</span>' : '<span class="player-tag tag-market">市场</span>'}</td>
      <td>${escapeHTML(priceLabel(player))}</td>
    </tr>`).join("");
    target.innerHTML = `<table class="data-table"><thead><tr><th>评分</th><th>球员</th><th>位置</th><th>俱乐部</th><th>联赛</th><th>国家</th><th>来源</th><th>估价</th></tr></thead><tbody>${rows}</tbody></table>${state.players.length > 500 ? '<div class="field-hint">列表最多显示前 500 张卡；求解器会读取完整名单。</div>' : ""}`;
  }

  function renderMetaTable() {
    const position = $("#metaPosition").value;
    const query = $("#metaSearch").value.trim().toLowerCase();
    const target = $("#metaTable");
    const ranked = state.players
      .filter(player => !query || player.name.toLowerCase().includes(query) || player.club.toLowerCase().includes(query))
      .map(player => ({ player, score: Core.roleScore(player, position) }))
      .sort((a, b) => b.score - a.score || b.player.rating - a.player.rating);
    if (!ranked.length) {
      target.innerHTML = '<div class="no-results">没有符合条件的球员数据。</div>';
      return;
    }
    target.innerHTML = `<table class="data-table"><thead><tr><th>#</th><th>球员</th><th>Meta · ${escapeHTML(position)}</th><th>评分</th><th>位置</th><th>联赛 / 俱乐部</th><th>估价</th></tr></thead><tbody>${ranked.slice(0, 300).map(({ player, score }, index) => `<tr>
      <td>${index + 1}</td><td>${escapeHTML(player.name)}</td><td class="meta-score">${score.toFixed(1)}</td><td class="rating-cell">${escapeHTML(player.rating)}</td><td>${escapeHTML(player.positions.join(" / ") || "—")}</td><td>${escapeHTML([player.league, player.club].filter(Boolean).join(" · ") || "—")}</td><td>${escapeHTML(priceLabel(player))}</td>
    </tr>`).join("")}</tbody></table>`;
  }

  function resultCard(result, index) {
    const name = result.requirement.name || `挑战 ${index + 1}`;
    if (!result.squad) return `<article class="squad-card"><div class="squad-card-heading"><h3>${escapeHTML(name)}</h3><span class="player-tag tag-market">未找到</span></div><div class="no-results">${escapeHTML(result.reason || "没有找到可用方案。")}</div></article>`;
    const evaluation = result.evaluation;
    const lines = result.squad.map((player, slot) => {
      const position = playerPosition(player, result, slot);
      return `<div class="player-row"><span class="player-rating">${escapeHTML(player.rating)}</span><span class="player-name" title="${escapeHTML(player.name)}">${escapeHTML(player.name)}</span><span class="player-meta">${escapeHTML(position)} · ${escapeHTML(qualityLabel(player))}</span><span class="player-tag ${player.owned ? "tag-owned" : "tag-market"}">${player.owned ? "已有" : escapeHTML(Number(player.price || 0).toLocaleString())}</span></div>`;
    }).join("");
    return `<article class="squad-card">
      <div class="squad-card-heading"><h3>${escapeHTML(name)}</h3><div class="squad-metrics"><span class="metric-pill">评分 <strong>${evaluation.rating}</strong></span><span class="metric-pill">化学 <strong>${evaluation.chemistry}</strong></span><span class="metric-pill">市场 <strong>${evaluation.cost.toLocaleString()}</strong></span></div></div>
      <div class="player-list">${lines}</div>
      ${result.approximate ? '<div class="field-hint">搜索达到计算上限；显示当前找到的可行解。</div>' : ""}
    </article>`;
  }

  function renderResults() {
    const target = $("#sbcResults");
    if (!state.results.length) {
      target.className = "empty-state";
      target.innerHTML = '<div class="empty-icon">⌘</div><h3>等待挑战要求</h3><p>导入球员数据，然后运行求解器。</p>';
      $("#resultSummary").textContent = "运行求解器后，结果会显示在这里。";
      $("#swapPanel").classList.add("hidden");
      return;
    }
    const solved = state.results.filter(result => result.squad).length;
    const marketCount = state.results.flatMap(result => result.squad || []).filter(player => !player.owned).length;
    $("#resultSummary").textContent = `已规划 ${solved}/${state.results.length} 个挑战 · ${marketCount} 张市场球员卡`;
    target.className = "results-list";
    target.innerHTML = `<div class="button-row" style="margin:0 0 12px"><button class="button button-quiet" type="button" data-action="export-purchases">导出市场清单 ↓</button></div>${state.results.map(resultCard).join("")}`;
    $("#swapPanel").classList.toggle("hidden", !solved);
    fillSwapChallenges();
  }

  function fillSwapChallenges() {
    const select = $("#swapChallenge");
    const previous = Number(select.value);
    const eligible = state.results.map((result, index) => ({ result, index })).filter(item => item.result.squad);
    select.innerHTML = eligible.map(({ result, index }) => `<option value="${index}">${escapeHTML(result.requirement.name || `挑战 ${index + 1}`)}</option>`).join("");
    if (eligible.some(item => item.index === previous)) select.value = String(previous);
    fillSwapSlots();
  }

  function fillSwapSlots() {
    const result = state.results[Number($("#swapChallenge").value)];
    const select = $("#swapSlot");
    if (!result?.squad) { select.innerHTML = ""; return; }
    const previous = Number(select.value);
    select.innerHTML = result.squad.map((player, index) => `<option value="${index}">${index + 1}. ${escapeHTML(player.name)} · ${escapeHTML(playerPosition(player, result, index))}</option>`).join("");
    if (previous >= 0 && previous < result.squad.length) select.value = String(previous);
  }

  function renderSwapChoices() {
    const target = $("#swapResults");
    if (!state.swapChoices.length) {
      target.innerHTML = '<div class="no-results">没有找到保持所有要求的替代球员。</div>';
      return;
    }
    target.innerHTML = state.swapChoices.map((choice, index) => `<div class="swap-option"><div><b>${escapeHTML(choice.player.name)} · ${escapeHTML(choice.player.rating)}</b><small>${escapeHTML(choice.player.positions.join(" / ") || "无位置数据")} · ${choice.player.owned ? "俱乐部" : `市场估价 ${Number(choice.player.price).toLocaleString()}`} · 化学 ${choice.evaluation.chemistry}</small></div><button class="button button-secondary" type="button" data-swap-choice="${index}">应用</button></div>`).join("");
  }

  function renderBuiltSquad() {
    const target = $("#squadResult");
    const result = state.squadResult;
    if (!result?.squad) {
      target.className = "empty-state compact-empty";
      target.innerHTML = `<div class="empty-icon">◇</div><h3>还没有阵容</h3><p>${escapeHTML(result?.reason || "导入数据后即可开始构建。")}</p>`;
      return;
    }
    target.className = "";
    const slots = result.squad.map((item, index) => ({ ...item, position: result.formation[index], index }));
    const keepers = slots.filter(item => item.position === "GK");
    const defenders = slots.filter(item => ["LB", "CB", "RB"].includes(item.position));
    const midfield = slots.filter(item => ["CDM", "CM", "CAM", "LM", "RM"].includes(item.position));
    const forwards = slots.filter(item => ["LW", "RW", "CF", "ST"].includes(item.position));
    const lines = [keepers, defenders, midfield, forwards].filter(line => line.length);
    const board = lines.map(line => `<div class="formation-line">${line.map(item => `<div class="formation-player"><b>${escapeHTML(item.position)} · ${Core.roleScore(item.player, item.position).toFixed(1)}</b><span title="${escapeHTML(item.player.name)}">${escapeHTML(item.player.name)}</span><small>${escapeHTML(item.player.rating)} OVR</small></div>`).join("")}</div>`).join("");
    const market = result.squad.filter(item => !item.player.owned).length;
    target.innerHTML = `<div class="squad-card"><div class="squad-card-heading"><h3>${escapeHTML($("#formation").value)} · ${result.squad.length} 人</h3><div class="squad-metrics"><span class="metric-pill">平均评分 <strong>${result.evaluation.rating}</strong></span><span class="metric-pill">化学 <strong>${result.evaluation.chemistry}</strong></span><span class="metric-pill">市场 <strong>${result.evaluation.cost.toLocaleString()}</strong></span></div></div><div class="formation-board">${board}</div><div class="field-hint">${market ? `${market} 张市场球员需要你自行核实价格。` : "阵容由俱乐部球员组成。"}${result.approximate ? " 搜索达到计算上限，当前方案为可行近似解。" : ""}</div></div>`;
    $("#squadSummary").textContent = `Meta 合计 ${result.score.toFixed(1)} · 估算费用 ${result.evaluation.cost.toLocaleString()} 金币`;
  }

  function runEventBuilder() {
    if (!state.players.length) { toast("请先导入球员数据，或载入演示数据。", true); return; }
    const requirement = {
      name: `${$("#eventType").value} · 活动阵容`,
      formation: $("#eventFormation").value,
      minRating: Number($("#eventMinRating").value) || 0,
      minChemistry: Number($("#eventMinChemistry").value) || 0,
      budget: Number($("#eventBudget").value) || 0,
      maxSameClub: Number($("#eventMaxSameClub").value) || 11,
      maxSameLeague: Number($("#eventMaxSameLeague").value) || 11,
      maxSameNation: Number($("#eventMaxSameNation").value) || 11,
      minUniqueClubs: Number($("#eventMinUniqueClubs").value) || 0,
      minUniqueLeagues: Number($("#eventMinUniqueLeagues").value) || 0,
      minUniqueNations: Number($("#eventMinUniqueNations").value) || 0,
      quality: $("#eventQuality").value
    };
    const result = Core.buildSquad(state.players, { ...requirement, includeMarket: $("#eventIncludeMarket").checked });
    state.eventResult = { ...result, requirement, squad: result.squad?.map(item => item.player) || null };
    const target = $("#eventResult");
    if (!result.squad) {
      target.className = "results-list";
      target.innerHTML = resultCard(state.eventResult, 0);
      $("#eventSummary").textContent = "当前球员数据中没有可行方案。";
      toast(result.reason || "没有找到符合条件的阵容。", true);
      return;
    }
    target.className = "results-list";
    target.innerHTML = resultCard(state.eventResult, 0);
    $("#eventSummary").textContent = `估算评分 ${result.evaluation.rating} · 化学 ${result.evaluation.chemistry} · 市场估价 ${result.evaluation.cost.toLocaleString()} 金币`;
    toast("已生成活动阵容规划。");
  }

  function renderAll() {
    const count = state.players.length;
    $("#rosterCount").textContent = `${count} 名球员`;
    $("#sbcPlayerCount").textContent = count;
    $("#metaPlayerCount").textContent = count;
    renderPlayerTable();
    renderMetaTable();
    renderResults();
    renderBuiltSquad();
  }

  function activateView(name) {
    $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === name));
    $$(".view").forEach(view => view.classList.toggle("active", view.id === `view-${name}`));
    const label = ({ sbc: "SBC 求解", squad: "阵容构建", events: "活动阵容", meta: "Meta 评分", players: "球员数据" })[name] || "FC Supporter";
    $("#breadcrumb").textContent = label;
  }

  function download(name, content, type = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportPurchaseList() {
    const rows = [["challenge", "id", "name", "rating", "positions", "league", "nation", "club", "estimated_price"]];
    state.results.forEach((result, index) => {
      (result.squad || []).filter(player => !player.owned).forEach(player => rows.push([
        result.requirement.name || `Challenge ${index + 1}`, player.id, player.name, player.rating,
        player.positions.join("/"), player.league, player.nation, player.club, player.price
      ]));
    });
    download("fc-supporter-market-list.csv", rows.map(row => row.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  }

  function makeDemoPlayers() {
    const entries = [
      [88, "GK", "North League", "Nation A", "North City"], [86, "LB", "North League", "Nation A", "North City"],
      [87, "CB", "North League", "Nation A", "North City"], [85, "CB", "North League", "Nation B", "North City"],
      [86, "RB", "North League", "Nation B", "North City"], [88, "CM", "North League", "Nation A", "North City"],
      [84, "CM", "East League", "Nation A", "East United"], [87, "CM", "East League", "Nation B", "East United"],
      [89, "LW", "East League", "Nation B", "East United"], [90, "ST", "East League", "Nation A", "East United"],
      [88, "RW", "East League", "Nation A", "East United"], [82, "GK", "West League", "Nation C", "West Town"],
      [83, "LB", "West League", "Nation C", "West Town"], [84, "CB", "West League", "Nation C", "West Town"],
      [82, "CB", "South League", "Nation C", "South Rovers"], [83, "RB", "South League", "Nation D", "South Rovers"],
      [85, "CDM", "South League", "Nation D", "South Rovers"], [86, "CDM", "South League", "Nation C", "South Rovers"],
      [87, "CAM", "South League", "Nation D", "South Rovers"], [85, "LM", "South League", "Nation D", "South Rovers"],
      [86, "RM", "West League", "Nation C", "West Town"], [84, "ST", "West League", "Nation D", "West Town"],
      [81, "CF", "East League", "Nation C", "East United"], [80, "CM", "North League", "Nation D", "North City"]
    ];
    return entries.map((item, index) => {
      const [rating, position, league, nation, club] = item;
      const attr = base => Math.min(99, Math.max(40, base + ((index * 7 + base) % 12) - 5));
      return Core.normalizePlayer({
        id: `demo-${index + 1}`, name: `Demo Player ${String(index + 1).padStart(2, "0")}`, rating,
        positions: position, price: index < 14 ? 0 : (rating - 65) * 390, owned: index < 14,
        rarity: rating >= 75 ? "gold" : "silver", league, nation, club,
        pace: attr(rating - 2), shooting: attr(rating - 3), passing: attr(rating - 1),
        dribbling: attr(rating), defending: attr(rating - 4), physical: attr(rating - 1)
      }, index);
    });
  }

  async function importFile(file) {
    if (!file) return;
    try {
      const players = Core.parsePlayersText(await file.text(), file.name);
      state.players = players;
      await savePlayers();
      $("#importStatus").textContent = `已导入 ${players.length} 张球员卡`;
      toast(`已导入 ${players.length} 张球员卡。`);
    } catch (error) {
      $("#importStatus").textContent = "导入失败";
      toast(error.message || "无法读取球员文件。", true);
    } finally {
      $("#playerFile").value = "";
    }
  }

  function readRequirements() {
    let value;
    try { value = JSON.parse($("#requirements").value); }
    catch (error) { throw new Error(`要求 JSON 格式错误：${error.message}`); }
    const list = Array.isArray(value) ? value : [value];
    if (!list.length || list.length > 20) throw new Error("请提供 1 到 20 个挑战要求。");
    if (list.some(item => !item || typeof item !== "object" || Array.isArray(item))) throw new Error("每个挑战要求都需要是 JSON 对象。");
    return list.map((item, index) => ({ ...item, name: item.name || `挑战 ${index + 1}` }));
  }

  function solveChallenges() {
    if (!state.players.length) { toast("请先导入球员数据，或载入演示数据。", true); return; }
    try {
      const requirements = readRequirements();
      state.results = Core.solveBatch(state.players, requirements, $("#includeMarket").checked);
      state.swapChoices = [];
      $("#swapResults").innerHTML = "";
      renderResults();
      const solved = state.results.filter(result => result.squad).length;
      toast(`已完成规划：${solved}/${state.results.length} 个挑战找到方案。`);
    } catch (error) { toast(error.message || "无法求解挑战。", true); }
  }

  function findSwapChoices() {
    const challengeIndex = Number($("#swapChallenge").value);
    const slot = Number($("#swapSlot").value);
    const result = state.results[challengeIndex];
    if (!result?.squad) return;
    state.swapChoices = Core.findSwaps(state.players, result.squad, slot, result.requirement, $("#includeMarket").checked).map(choice => ({ ...choice, challengeIndex, slot }));
    renderSwapChoices();
    if (state.swapChoices.length) toast(`找到 ${state.swapChoices.length} 个有效替代方案。`);
  }

  function applySwap(index) {
    const choice = state.swapChoices[index];
    if (!choice) return;
    const result = state.results[choice.challengeIndex];
    result.squad = choice.squad;
    result.evaluation = choice.evaluation;
    renderResults();
    $("#swapResults").innerHTML = "";
    state.swapChoices = [];
    toast(`已在本地方案中换入 ${choice.player.name}。`);
  }

  function runSquadBuilder() {
    if (!state.players.length) { toast("请先导入球员数据，或载入演示数据。", true); return; }
    const result = Core.buildSquad(state.players, {
      formation: $("#formation").value,
      budget: Number($("#squadBudget").value) || 0,
      minChemistry: Number($("#squadChemistry").value) || 0,
      includeMarket: $("#squadSource").value === "all"
    });
    state.squadResult = result;
    renderBuiltSquad();
    if (result.squad) toast("已生成阵容规划方案。");
    else toast(result.reason, true);
  }

  function setup() {
    $$(".nav-item").forEach(button => button.addEventListener("click", () => activateView(button.dataset.view)));
    $("#solveBatch").addEventListener("click", solveChallenges);
    $("#loadDemo").addEventListener("click", async () => { state.players = makeDemoPlayers(); await savePlayers(); toast("演示球员数据已载入。"); });
    $("#rosterDemo").addEventListener("click", async () => { state.players = makeDemoPlayers(); await savePlayers(); toast("演示球员数据已载入。"); });
    $("#buildSquad").addEventListener("click", runSquadBuilder);
    $("#buildEventSquad").addEventListener("click", runEventBuilder);
    $("#metaPosition").addEventListener("change", renderMetaTable);
    $("#metaSearch").addEventListener("input", renderMetaTable);
    $("#swapChallenge").addEventListener("change", fillSwapSlots);
    $("#findSwaps").addEventListener("click", findSwapChoices);
    $("#sbcResults").addEventListener("click", event => { if (event.target.closest('[data-action="export-purchases"]')) exportPurchaseList(); });
    $("#swapResults").addEventListener("click", event => {
      const button = event.target.closest("[data-swap-choice]");
      if (button) applySwap(Number(button.dataset.swapChoice));
    });
    $("#playerFile").addEventListener("change", event => importFile(event.target.files[0]));
    $("#topImport").addEventListener("click", () => { activateView("players"); $("#playerFile").click(); });
    $("#downloadTemplate").addEventListener("click", () => download("players-template.csv", "id,name,rating,positions,price,owned,rarity,league,nation,club,pace,shooting,passing,dribbling,defending,physical,meta,chemBonus\r\n", "text/csv;charset=utf-8"));
    $("#exportPlayers").addEventListener("click", () => download("fc-supporter-players.json", JSON.stringify(state.players, null, 2), "application/json;charset=utf-8"));
    $("#clearPlayers").addEventListener("click", async () => {
      if (!window.confirm("清空保存在此浏览器中的球员数据？此操作不能撤销。")) return;
      state.players = []; state.results = []; state.squadResult = null; await savePlayers();
      $("#importStatus").textContent = "本地数据已清空"; toast("球员数据已清空。");
    });
    const dropZone = $("#dropZone");
    ["dragenter", "dragover"].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.add("dragover"); }));
    ["dragleave", "drop"].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.remove("dragover"); }));
    dropZone.addEventListener("drop", event => importFile(event.dataTransfer.files[0]));
    loadPlayers();
  }

  setup();
})();
