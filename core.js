(function(root) {
  "use strict";

  const FORMATIONS = {
    "4-3-3": ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "LW", "ST", "RW"],
    "4-2-3-1": ["GK", "LB", "CB", "CB", "RB", "CDM", "CDM", "CAM", "LM", "RM", "ST"],
    "4-4-2": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"],
    "4-1-2-1-2": ["GK", "LB", "CB", "CB", "RB", "CDM", "CM", "CM", "CAM", "ST", "ST"]
  };

  const ROLE_WEIGHTS = {
    GK: {
      diving: .24,
      handling: .18,
      reflexes: .24,
      speed: .10,
      positioning: .24
    },
    CB: {
      pace: .15,
      defending: .39,
      physical: .25,
      passing: .10,
      dribbling: .06,
      shooting: .05
    },
    LB: {
      pace: .24,
      defending: .23,
      physical: .10,
      passing: .19,
      dribbling: .17,
      shooting: .07
    },
    RB: {
      pace: .24,
      defending: .23,
      physical: .10,
      passing: .19,
      dribbling: .17,
      shooting: .07
    },
    CDM: {
      pace: .12,
      defending: .28,
      physical: .22,
      passing: .20,
      dribbling: .12,
      shooting: .06
    },
    CM: {
      pace: .14,
      defending: .16,
      physical: .13,
      passing: .24,
      dribbling: .20,
      shooting: .13
    },
    CAM: {
      pace: .12,
      defending: .06,
      physical: .08,
      passing: .27,
      dribbling: .27,
      shooting: .20
    },
    LM: {
      pace: .25,
      defending: .08,
      physical: .08,
      passing: .18,
      dribbling: .24,
      shooting: .17
    },
    RM: {
      pace: .25,
      defending: .08,
      physical: .08,
      passing: .18,
      dribbling: .24,
      shooting: .17
    },
    LW: {
      pace: .28,
      defending: .04,
      physical: .08,
      passing: .15,
      dribbling: .27,
      shooting: .21
    },
    RW: {
      pace: .28,
      defending: .04,
      physical: .08,
      passing: .15,
      dribbling: .27,
      shooting: .21
    },
    CF: {
      pace: .20,
      defending: .03,
      physical: .10,
      passing: .17,
      dribbling: .23,
      shooting: .27
    },
    ST: {
      pace: .22,
      defending: .02,
      physical: .15,
      passing: .08,
      dribbling: .20,
      shooting: .33
    }
  };

  function asNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function parseBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["true", "1", "yes", "y", "是", "owned", "club"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "否", "market", "tradeable", "tradable"].includes(normalized)) return false;
    return fallback;
  }

  function splitPositions(value) {
    if (Array.isArray(value)) return value.map(item => String(item).trim().toUpperCase()).filter(Boolean);
    return String(value ?? "").split(/[,;|/\s]+/).map(item => item.trim().toUpperCase()).filter(Boolean);
  }

  function normalizeMeta(value) {
    if (typeof value === "number") return value;
    if (value && typeof value === "object") return value;
    if (value == null || value === "") return null;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "number" || (parsed && typeof parsed === "object") ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function normalizePlayer(raw, index = 0) {
    const source = raw && typeof raw === "object" ? raw : {};
    const stats = source.stats && typeof source.stats === "object" ? source.stats : {};
    const positions = splitPositions(source.positions ?? source.position);
    const numericStats = {};
    for (const key of ["pace", "shooting", "passing", "dribbling", "defending", "physical", "diving", "handling",
        "reflexes", "speed", "positioning"
      ]) {
      const value = source[key] ?? stats[key];
      if (value !== undefined && value !== "") numericStats[key] = asNumber(value);
    }
    return {
      id: String(source.id ??
        `player-${index}-${String(source.name ?? "card").trim().toLowerCase().replace(/\s+/g, "-")}`),
      assetId: String(source.assetId ?? source.baseId ?? source.id ?? `player-${index}`),
      name: String(source.name ?? `Player ${index + 1}`).trim(),
      rating: Math.max(0, asNumber(source.rating ?? source.overall)),
      positions,
      price: Math.max(0, asNumber(source.price ?? source.estimatedPrice)),
      owned: parseBoolean(source.owned ?? source.inClub, false),
      rarity: String(source.rarity ?? source.quality ?? "").trim(),
      league: String(source.league ?? "").trim(),
      nation: String(source.nation ?? source.country ?? "").trim(),
      club: String(source.club ?? "").trim(),
      meta: normalizeMeta(source.meta),
      chemBonus: Math.max(0, Math.min(3, asNumber(source.chemBonus))),
      stats: numericStats
    };
  }

  function parseDelimited(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const input = String(text).replace(/^\uFEFF/, "");
    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      if (quoted) {
        if (char === '"' && input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && input[i + 1] === "\n") i += 1;
        row.push(cell);
        cell = "";
        if (row.some(value => value.trim() !== "")) rows.push(row);
        row = [];
      } else cell += char;
    }
    if (quoted) throw new Error("CSV 引号未闭合，请检查最后一行。");
    row.push(cell);
    if (row.some(value => value.trim() !== "")) rows.push(row);
    if (rows.length < 2) return [];
    const aliases = {
      chembonus: "chemBonus",
      assetid: "assetId",
      baseid: "baseId",
      inclub: "inClub",
      estimatedprice: "estimatedPrice"
    };
    const headers = rows.shift().map(name => aliases[name.trim().toLowerCase()] || name.trim().toLowerCase());
    if (new Set(headers).size !== headers.length || headers.some(name => !name)) throw new Error("CSV 表头存在重复或空字段。");
    if (!headers.includes("name") || !(headers.includes("rating") || headers.includes("overall"))) throw new Error(
      "CSV 需要 name 和 rating 表头。");
    return rows.map((cells, rowIndex) => {
      if (cells.length !== headers.length) throw new Error(`CSV 第 ${rowIndex + 2} 行列数与表头不一致。`);
      return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
    });
  }

  function parsePlayersText(text, filename = "") {
    const trimmed = String(text).trim();
    if (!trimmed) throw new Error("文件内容为空。");
    if (trimmed.length > 5 * 1024 * 1024) throw new Error("文件超过 5 MB，请拆分后导入。");
    let data;
    if (filename.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
      data = JSON.parse(trimmed);
      if (!Array.isArray(data) && Array.isArray(data.players)) data = data.players;
      if (!Array.isArray(data)) throw new Error("JSON 顶层需要是球员数组，或包含 players 数组。");
    } else data = parseDelimited(trimmed);
    if (!data.length) throw new Error("没有找到球员行。请检查 CSV 是否有表头和数据。");
    if (data.length > 10000) throw new Error("一次最多导入 10000 张球员卡。");
    const ids = new Set();
    return data.map((raw, index) => {
      const fail = message => {
        throw new Error(`第 ${index + 1} 张球员卡：${message}`);
      };
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("需要是一个球员对象。");
      if (!String(raw.name ?? "").trim() || String(raw.name).length > 160) fail("name 不能为空且最多 160 字符。");
      const rating = raw.rating ?? raw.overall;
      if (rating === "" || rating == null || !Number.isFinite(Number(rating)) || Number(rating) < 1 || Number(
          rating) > 99) fail("rating 必须在 1 到 99 之间。");
      if (raw.id !== undefined && !String(raw.id).trim()) fail("id 不能为空。");
      const price = raw.price ?? raw.estimatedPrice;
      if (price !== undefined && price !== "" && (!Number.isFinite(Number(price)) || Number(price) < 0 || Number(
          price) > Number.MAX_SAFE_INTEGER)) fail("price 必须是非负数字。");
      const player = normalizePlayer(raw, index);
      const stats = raw.stats && typeof raw.stats === "object" ? raw.stats : {};
      for (const key of ["pace", "shooting", "passing", "dribbling", "defending", "physical", "diving",
          "handling", "reflexes", "speed", "positioning"
        ]) {
        const value = raw[key] ?? stats[key];
        if (value != null && value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(
            value) > 99)) fail(`${key} 必须在 0 到 99 之间。`);
      }
      if (raw.chemBonus != null && raw.chemBonus !== "" && (!Number.isInteger(Number(raw.chemBonus)) || Number(raw
          .chemBonus) < 0 || Number(raw.chemBonus) > 3)) fail("chemBonus 必须是 0 到 3 的整数。");
      if (raw.meta != null && raw.meta !== "") {
        if (player.meta == null || Array.isArray(player.meta)) fail("meta 需要是数字或位置评分对象。");
        const values = typeof player.meta === "object" ? Object.values(player.meta) : [player.meta];
        if (!values.length || values.some(value => value == null || value === "" || !Number.isFinite(Number(
            value)) || Number(value) < 0 || Number(value) > 100)) fail("meta 评分必须在 0 到 100 之间。");
      }
      if (player.positions.some(position => !ROLE_WEIGHTS[position])) fail("positions 包含不支持的位置。");
      if (!player.owned && player.price <= 0) fail("市场球员需要大于 0 的预估价格；俱乐部球员请设置 owned=true。");
      if (ids.has(player.id)) fail(`id ${player.id} 重复，请为每张实体卡使用唯一 id。`);
      ids.add(player.id);
      return player;
    });
  }

  function formationPositions(name) {
    if (Array.isArray(name)) {
      if (name.length !== 11 || name.some(position => !ROLE_WEIGHTS[position])) throw new Error("阵型需要 11 个有效位置。");
      return name.slice();
    }
    const normalized = String(name ?? "4-3-3").replace(/\s/g, "");
    if (!FORMATIONS[normalized]) throw new Error(`不支持的阵型：${normalized}`);
    return FORMATIONS[normalized].slice();
  }

  function validateRequirement(value = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("挑战要求需要是对象。");
    const ranges = {
      minRating: [0, 99],
      minChemistry: [0, 33],
      budget: [0, Number.MAX_SAFE_INTEGER],
      maxSameClub: [1, 11],
      maxSameLeague: [1, 11],
      maxSameNation: [1, 11],
      minUniqueClubs: [0, 11],
      minUniqueLeagues: [0, 11],
      minUniqueNations: [0, 11],
      nodeLimit: [1, 80000]
    };
    const allowed = new Set([...Object.keys(ranges), "name", "formation", "quality", "includeMarket"]);
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) throw new Error(`不支持的要求字段：${key}`);
      if (ranges[key]) {
        const [min, max] = ranges[key];
        const number = Number(value[key]);
        if (value[key] == null || value[key] === "" || !Number.isFinite(number) || number < min || number > max || !
          Number.isInteger(number)) throw new Error(`${key} 需要是 ${min} 到 ${max} 之间的整数。`);
      }
    }
    if (value.formation !== undefined) formationPositions(value.formation);
    if (value.quality !== undefined && !["any", "bronze", "silver", "gold"].includes(value.quality)) throw new Error(
      "quality 仅支持 any、bronze、silver、gold。");
    if (value.includeMarket !== undefined && typeof value.includeMarket !== "boolean") throw new Error(
      "includeMarket 需要是布尔值。");
    if (value.name !== undefined && (typeof value.name !== "string" || value.name.length > 100)) throw new Error(
      "挑战名称最多 100 字符。");
    return value;
  }

  function itemQuality(player) {
    const label = String(player.rarity ?? "").toLowerCase();
    if (label.includes("bronze") || label.includes("铜")) return "bronze";
    if (label.includes("silver") || label.includes("银")) return "silver";
    if (label.includes("gold") || label.includes("金")) return "gold";
    if (player.rating < 65) return "bronze";
    if (player.rating < 75) return "silver";
    return "gold";
  }

  function roleScore(player, position) {
    const meta = player.meta;
    if (typeof meta === "number") return meta;
    if (meta && typeof meta === "object") {
      const direct = meta[position] ?? meta[position.toLowerCase()];
      if (direct !== undefined && Number.isFinite(Number(direct))) return Number(direct);
      // Another position's score is not a measurement for this role. Fall back to attributes.
    }
    const weights = ROLE_WEIGHTS[position] || ROLE_WEIGHTS.CM;
    const stats = player.stats || {};
    const available = Object.keys(weights).filter(key => Number.isFinite(Number(stats[key])));
    if (!available.length) return player.rating;
    const weightTotal = available.reduce((sum, key) => sum + weights[key], 0);
    return available.reduce((sum, key) => sum + Number(stats[key]) * weights[key], 0) / weightTotal;
  }

  function threshold(count, steps) {
    let value = 0;
    for (const [minimum, points] of steps)
      if (count >= minimum) value = points;
    return value;
  }

  function baseChemistry(players, player) {
    const sameClub = player.club ? players.filter(item => item.club && item.club === player.club).length : 0;
    const sameLeague = player.league ? players.filter(item => item.league && item.league === player.league).length :
    0;
    const sameNation = player.nation ? players.filter(item => item.nation && item.nation === player.nation).length :
    0;
    return Math.min(3,
      threshold(sameClub, [
        [2, 1],
        [4, 2],
        [7, 3]
      ]) +
      threshold(sameLeague, [
        [3, 1],
        [5, 2],
        [8, 3]
      ]) +
      threshold(sameNation, [
        [2, 1],
        [5, 2],
        [8, 3]
      ]) +
      player.chemBonus
    );
  }

  function assignPositions(players, formation) {
    const positions = Array.isArray(formation) ? formation : formationPositions(formation);
    if (players.length !== positions.length || players.length > 15) {
      return {
        chemistry: 0,
        assignments: players.map((_, index) => ({
          playerIndex: index,
          position: positions[index] ?? "",
          inPosition: false
        }))
      };
    }
    const n = players.length;
    const weights = players.map(player => positions.map(position => {
      const fit = player.positions.includes(position);
      return fit ? baseChemistry(players, player) * 100 + 1 : 0;
    }));
    const u = Array(n + 1).fill(0);
    const v = Array(n + 1).fill(0);
    const p = Array(n + 1).fill(0);
    const way = Array(n + 1).fill(0);
    for (let i = 1; i <= n; i += 1) {
      p[0] = i;
      let j0 = 0;
      const minv = Array(n + 1).fill(Infinity);
      const used = Array(n + 1).fill(false);
      do {
        used[j0] = true;
        const i0 = p[j0];
        let delta = Infinity;
        let j1 = 0;
        for (let j = 1; j <= n; j += 1) {
          if (used[j]) continue;
          const current = -weights[i0 - 1][j - 1] - u[i0] - v[j];
          if (current < minv[j]) {
            minv[j] = current;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
        for (let j = 0; j <= n; j += 1) {
          if (used[j]) {
            u[p[j]] += delta;
            v[j] -= delta;
          } else minv[j] -= delta;
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0 !== 0);
    }
    const assignments = Array(n);
    let chemistry = 0;
    for (let slot = 1; slot <= n; slot += 1) {
      const playerIndex = p[slot] - 1;
      const player = players[playerIndex];
      const position = positions[slot - 1];
      const inPosition = player.positions.includes(position);
      const points = inPosition ? baseChemistry(players, player) : 0;
      chemistry += points;
      assignments[playerIndex] = {
        playerIndex,
        position,
        inPosition
      };
    }
    const active = assignments.filter(item => item.inPosition).map(item => players[item.playerIndex]);
    chemistry = active.reduce((total, player) => total + baseChemistry(active, player), 0);
    return {
      chemistry,
      assignments,
      approximate: active.length !== players.length
    };
  }

  function estimatedRating(players) {
    if (!players.length) return 0;
    return Math.round(players.reduce((sum, player) => sum + asNumber(player.rating), 0) / players.length);
  }

  function groupCounts(players, field) {
    const counts = new Map();
    for (const player of players) {
      const value = String(player[field] ?? "").trim();
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    }
    return counts;
  }

  function evaluateSquad(players, requirement = {}) {
    if (!Array.isArray(players) || players.length !== 11) return {
      valid: false,
      errors: ["阵容必须正好有 11 名球员。"],
      rating: 0,
      chemistry: 0,
      cost: 0,
      assignments: []
    };
    const errors = [];
    const ids = players.map(player => player.id);
    if (new Set(ids).size !== ids.length) errors.push("阵容中不能重复使用同一张球员卡。");
    const assets = players.map(player => player.assetId || player.id);
    if (new Set(assets).size !== assets.length) errors.push("同一名球员的不同卡片不能出现在同一套阵容中。");
    const rating = estimatedRating(players);
    const assigned = assignPositions(players, requirement.formation || "4-3-3");
    const chemistry = assigned.chemistry;
    const cost = players.reduce((sum, player) => sum + (player.owned ? 0 : asNumber(player.price)), 0);
    if (rating < asNumber(requirement.minRating)) errors.push(`平均评分 ${rating} 低于要求 ${requirement.minRating}。`);
    if (chemistry < asNumber(requirement.minChemistry)) errors.push(
      `估算化学反应 ${chemistry} 低于要求 ${requirement.minChemistry}。`);
    if (asNumber(requirement.budget) > 0 && cost > asNumber(requirement.budget)) errors.push(
      `市场估价 ${cost.toLocaleString()} 超出预算。`);
    if (requirement.quality && requirement.quality !== "any") {
      const required = String(requirement.quality).toLowerCase();
      if (players.some(player => itemQuality(player) !== required)) errors.push(`阵容需要全部为 ${required} 品质球员。`);
    }
    const constraints = [
      ["league", "maxSameLeague", "同联赛球员过多"],
      ["nation", "maxSameNation", "同国家球员过多"],
      ["club", "maxSameClub", "同俱乐部球员过多"]
    ];
    for (const [field, key, message] of constraints) {
      const max = asNumber(requirement[key], 11);
      if (max < 11 && players.some(player => !String(player[field] || "").trim())) errors.push(
        `无法核对 ${key}：部分球员缺少 ${field} 数据。`);
      if (max < 11 && [...groupCounts(players, field).values()].some(count => count > max)) errors.push(
        `${message}（最多 ${max} 名）。`);
    }
    const uniqueChecks = [
      ["league", "minUniqueLeagues", "联赛"],
      ["nation", "minUniqueNations", "国家/地区"],
      ["club", "minUniqueClubs", "俱乐部"]
    ];
    for (const [field, key, label] of uniqueChecks) {
      const min = asNumber(requirement[key]);
      if (min > 0 && groupCounts(players, field).size < min) errors.push(`不同${label}数量不足 ${min} 个。`);
    }
    return {
      valid: errors.length === 0,
      errors,
      rating,
      chemistry,
      cost,
      assignments: assigned.assignments
    };
  }

  function candidatePool(players, requirement, includeMarket, usedIds = new Set()) {
    const available = players.filter(player => !usedIds.has(player.id) && (player.owned || includeMarket));
    let pool = available;
    if (requirement.quality && requirement.quality !== "any") pool = pool.filter(player => itemQuality(player) ===
      String(requirement.quality).toLowerCase());
    if (pool.length > 150) {
      const ranked = [...pool].sort((a, b) => (a.owned ? 0 : a.price) - (b.owned ? 0 : b.price) || b.rating - a
        .rating);
      const high = [...pool].sort((a, b) => b.rating - a.rating || (a.owned ? 0 : a.price) - (b.owned ? 0 : b.price));
      const picked = new Map();
      for (const player of ranked.slice(0, 90).concat(high.slice(0, 90))) picked.set(player.id, player);
      pool = [...picked.values()];
    }
    return pool.sort((a, b) => (a.owned ? 0 : a.price) - (b.owned ? 0 : b.price) || b.rating - a.rating);
  }

  function canAdd(player, chosen, requirement) {
    const limits = [
      ["league", "maxSameLeague"],
      ["nation", "maxSameNation"],
      ["club", "maxSameClub"]
    ];
    for (const [field, key] of limits) {
      const max = asNumber(requirement[key], 11);
      const value = player[field];
      if (value && max < 11 && chosen.filter(item => item[field] === value).length >= max) return false;
    }
    return true;
  }

  function squadCost(players) {
    return players.reduce((sum, player) => sum + (player.owned ? 0 : asNumber(player.price)), 0);
  }

  function solveSquad(players, requirement = {}, includeMarket = true, usedIds = new Set()) {
    validateRequirement(requirement);
    const pool = candidatePool(players, requirement, includeMarket, usedIds);
    const poolReduced = pool.length < players.filter(player => !usedIds.has(player.id) && (player.owned ||
      includeMarket) && (!requirement.quality || requirement.quality === "any" || itemQuality(player) ===
      requirement.quality)).length;
    if (pool.length < 11) return {
      squad: null,
      evaluation: null,
      nodes: 0,
      reason: "可用球员少于 11 名。"
    };
    const limit = Math.min(80000, asNumber(requirement.nodeLimit, 50000));
    const deadline = Date.now() + 1250;
    const selected = [];
    let best = null;
    let nodes = 0;
    let stopped = false;
    const maxBudget = asNumber(requirement.budget);
    const ratingTarget = asNumber(requirement.minRating);

    function upperRating(start, needed, total) {
      if (needed <= 0) return total;
      const remaining = pool.slice(start).map(item => item.rating).sort((a, b) => b - a).slice(0, needed);
      if (remaining.length < needed) return -Infinity;
      return total + remaining.reduce((sum, value) => sum + value, 0);
    }

    function visit(start, ratingSum, cost) {
      nodes += 1;
      if (nodes >= limit || Date.now() > deadline) {
        stopped = true;
        return;
      }
      const needed = 11 - selected.length;
      if (needed === 0) {
        const evaluation = evaluateSquad(selected, requirement);
        if (!evaluation.valid) return;
        const objective = evaluation.cost * 100 + evaluation.rating * 2 - evaluation.chemistry * .05;
        if (!best || objective < best.objective) best = {
          squad: selected.slice(),
          evaluation,
          objective
        };
        return;
      }
      if (pool.length - start < needed) return;
      if (upperRating(start, needed, ratingSum) < (ratingTarget - .5) * 11) return;
      if (maxBudget > 0 && cost > maxBudget) return;
      if (best && cost > best.evaluation.cost) return;
      for (let index = start; index <= pool.length - needed; index += 1) {
        const player = pool[index];
        const nextCost = cost + (player.owned ? 0 : player.price);
        if (maxBudget > 0 && nextCost > maxBudget) continue;
        if (best && nextCost > best.evaluation.cost) continue;
        if (selected.some(item => item.id === player.id || (item.assetId || item.id) === (player.assetId || player
            .id))) continue;
        if (!canAdd(player, selected, requirement)) continue;
        selected.push(player);
        visit(index + 1, ratingSum + player.rating, nextCost);
        selected.pop();
        if (stopped) break;
      }
    }
    visit(0, 0, 0);
    return best ? {
      squad: best.squad,
      evaluation: best.evaluation,
      nodes,
      approximate: stopped || poolReduced
    } : {
      squad: null,
      evaluation: null,
      nodes,
      approximate: stopped || poolReduced,
      reason: stopped ? "搜索达到时间或计算上限，未找到符合条件的阵容。" : "没有找到满足全部条件的阵容。"
    };
  }

  function solveBatch(players, requirements, includeMarket = true, onProgress = () => {}) {
    const list = Array.isArray(requirements) ? requirements : [requirements];
    if (!list.length || list.length > 20) throw new Error("挑战数需要在 1 到 20 之间。");
    list.forEach(validateRequirement);
    // Greedy group planning: constrained squads first. This is not a global optimality proof.
    const order = list.map((requirement, index) => ({
      requirement,
      index
    })).sort((a, b) => asNumber(b.requirement.minRating) - asNumber(a.requirement.minRating) || asNumber(b
      .requirement.minChemistry) - asNumber(a.requirement.minChemistry));
    const used = new Set();
    const results = Array(list.length);
    order.forEach(({
      requirement,
      index
    }, done) => {
      const solved = solveSquad(players, requirement, includeMarket, used);
      if (solved.squad)
        for (const player of solved.squad) used.add(player.id);
      results[index] = {
        requirement,
        ...solved,
        groupApproximate: list.length > 1
      };
      onProgress({
        done: done + 1,
        total: list.length
      });
    });
    return results;
  }

  function findSwaps(players, squad, slot, requirement, includeMarket = true, count = 5, excludedIds = new Set()) {
    if (!Array.isArray(squad) || squad.length !== 11 || slot < 0 || slot >= squad.length) return [];
    const replaced = squad[slot];
    const squadIds = new Set(squad.map(player => player.id));
    squadIds.delete(replaced.id);
    const candidates = players.filter(player => player.id !== replaced.id && !squadIds.has(player.id) && !excludedIds
      .has(player.id) && (player.owned || includeMarket));
    const choices = [];
    for (const candidate of candidates) {
      const next = squad.slice();
      next[slot] = candidate;
      const evaluation = evaluateSquad(next, requirement);
      if (evaluation.valid) choices.push({
        player: candidate,
        evaluation,
        squad: next
      });
    }
    choices.sort((a, b) => a.evaluation.cost - b.evaluation.cost || b.player.rating - a.player.rating || b.evaluation
      .chemistry - a.evaluation.chemistry);
    return choices.slice(0, count);
  }

  function buildSquad(players, options = {}) {
    validateRequirement(options);
    const formation = formationPositions(options.formation);
    const marketAllowed = options.includeMarket !== false;
    let pool = players.filter(player => player.owned || marketAllowed);
    if (options.quality && options.quality !== "any") pool = pool.filter(player => itemQuality(player) === String(
      options.quality).toLowerCase());
    if (pool.length < 11) return {
      squad: null,
      reason: "可用球员少于 11 名。",
      nodes: 0
    };
    const budget = asNumber(options.budget);
    const minChemistry = asNumber(options.minChemistry);
    const byRole = formation.map(position => {
      const ordered = pool.filter(player => player.positions.includes(position)).map(player => ({
        player,
        position,
        score: roleScore(player, position),
        fit: player.positions.includes(position)
      }));
      ordered.sort((a, b) => (b.score + (b.fit ? 0 : -16)) - (a.score + (a.fit ? 0 : -16)) || (a.player.owned ?
        0 : a.player.price) - (b.player.owned ? 0 : b.player.price));
      const selected = new Map();
      for (const candidate of ordered.slice(0, 35)) selected.set(candidate.player.id, candidate);
      const cheapest = [...ordered].sort((a, b) => (a.player.owned ? 0 : a.player.price) - (b.player.owned ? 0 : b
        .player.price)).slice(0, 8);
      for (const candidate of cheapest) selected.set(candidate.player.id, candidate);
      for (const [field, key] of [
          ["club", "minUniqueClubs"],
          ["league", "minUniqueLeagues"],
          ["nation", "minUniqueNations"]
        ]) {
        const neededGroups = asNumber(options[key]);
        if (!neededGroups) continue;
        const bestByGroup = new Map();
        for (const candidate of ordered) {
          const group = String(candidate.player[field] ?? "").trim();
          if (group && !bestByGroup.has(group)) bestByGroup.set(group, candidate);
        }
        for (const candidate of [...bestByGroup.values()].slice(0, Math.min(24, neededGroups * 2))) {
          selected.set(candidate.player.id, candidate);
        }
      }
      return [...selected.values()].sort((a, b) => (b.score + (b.fit ? 0 : -16)) - (a.score + (a.fit ? 0 : -16)));
    });
    if (byRole.some(list => !list.length)) return {
      squad: null,
      reason: "缺少阵型所需位置的球员，请补充球员数据。",
      nodes: 0
    };
    const poolReduced = byRole.some((list, index) => list.length < pool.filter(player => player.positions.includes(
      formation[index])).length);
    const remainingScore = Array(formation.length + 1).fill(0);
    for (let i = formation.length - 1; i >= 0; i--) remainingScore[i] = remainingScore[i + 1] + Math.max(...byRole[i]
      .map(item => item.score));
    const selected = [];
    let best = null;
    let nodes = 0;
    const maxNodes = 80000;
    const deadline = Date.now() + 1250;
    let stopped = false;

    function visit(slot, cost, score) {
      nodes += 1;
      if (nodes >= maxNodes || Date.now() > deadline) {
        stopped = true;
        return;
      }
      if (slot === formation.length) {
        const evaluation = evaluateSquad(selected.map(item => item.player), {
          ...options,
          formation,
          budget,
          minChemistry
        });
        if (!evaluation.valid) return;
        const totalScore = score + evaluation.chemistry * .15;
        if (!best || totalScore > best.score) best = {
          squad: selected.slice(),
          evaluation,
          score: totalScore
        };
        return;
      }
      if (budget > 0 && cost > budget) return;
      if (best && score + remainingScore[slot] + 4.95 < best.score) return;
      const list = byRole[slot];
      for (const candidate of list) {
        const player = candidate.player;
        if (selected.some(item => item.player.id === player.id || (item.player.assetId || item.player.id) === (player
            .assetId || player.id))) continue;
        if (!canAdd(player, selected.map(item => item.player), options)) continue;
        const nextCost = cost + (player.owned ? 0 : player.price);
        if (budget > 0 && nextCost > budget) continue;
        const positionScore = candidate.score + (candidate.fit ? 0 : -16);
        selected.push({
          player,
          position: formation[slot],
          score: positionScore
        });
        visit(slot + 1, nextCost, score + positionScore);
        selected.pop();
        if (stopped) break;
      }
    }
    visit(0, 0, 0);
    if (!best) return {
      squad: null,
      reason: stopped ? "搜索达到计算上限，未找到符合预算和化学反应要求的阵容。" : "没有找到满足预算和化学反应要求的阵容。",
      nodes,
      approximate: stopped || poolReduced
    };
    return {
      squad: best.squad,
      evaluation: best.evaluation,
      score: best.score,
      nodes,
      approximate: stopped || poolReduced,
      formation
    };
  }

  root.FCSupporterCore = {
    FORMATIONS,
    validateRequirement,
    normalizePlayer,
    parsePlayersText,
    formationPositions,
    itemQuality,
    roleScore,
    estimatedRating,
    assignPositions,
    evaluateSquad,
    solveSquad,
    solveBatch,
    findSwaps,
    buildSquad
  };
})(typeof window !== "undefined" ? window : globalThis);
