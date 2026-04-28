import { registerUser, loginUser, logoutUser, getCurrentUser } from "./auth.js";
import {
  createFamilyGroup,
  joinFamilyByCode,
  getMyFamilies,
  seedStudyData,
  getCurrentUserId,
  getUserStudyData,
  updateFamilyName,
  regenerateFamilyInviteCode,
  dissolveFamilyGroup,
} from "./permissions.js";
import {
  createGame,
  getMyGames,
  getSnapshot,
  makeMove,
  endGame,
  undoGameMove,
  pieceLabel,
  getGame,
  toChineseNotation,
  analyzeGame,
  setManualReviewTag,
  createBattle,
  joinBattleByCode,
  getMyBattles,
  getBattleSnapshot,
  makeBattleMove,
  endBattle,
  undoBattleMove,
  getBattle,
  getBattleRole,
  getAiLevels,
} from "./game.js";
import { loadDb } from "./store.js";

const sessionBar = document.getElementById("session-bar");
const familyInfo = document.getElementById("family-info");
const permissionResult = document.getElementById("permission-result");
const manageFamilyName = document.getElementById("manage-family-name");
const renameFamilyBtn = document.getElementById("rename-family-btn");
const refreshInviteBtn = document.getElementById("refresh-invite-btn");
const dissolveFamilyBtn = document.getElementById("dissolve-family-btn");

const gameNameInput = document.getElementById("game-name");
const gameModeSelect = document.getElementById("game-mode");
const aiSideSelect = document.getElementById("ai-side");
const aiLevelSelect = document.getElementById("ai-level");
const createGameBtn = document.getElementById("create-game-btn");
const undoGameBtn = document.getElementById("undo-game-btn");
const endGameBtn = document.getElementById("end-game-btn");
const gameSelect = document.getElementById("game-select");
const boardStatus = document.getElementById("board-status");
const boardEl = document.getElementById("xiangqi-board");
const moveListEl = document.getElementById("move-list");
const reviewResultEl = document.getElementById("review-result");
const analyzeGameBtn = document.getElementById("analyze-game-btn");
const tagPlyInput = document.getElementById("tag-ply");
const tagTypeSelect = document.getElementById("tag-type");
const tagNoteInput = document.getElementById("tag-note");
const addTagBtn = document.getElementById("add-tag-btn");
const firstPlyBtn = document.getElementById("first-ply-btn");
const prevPlyBtn = document.getElementById("prev-ply-btn");
const nextPlyBtn = document.getElementById("next-ply-btn");
const lastPlyBtn = document.getElementById("last-ply-btn");
const battleNameInput = document.getElementById("battle-name");
const createBattleBtn = document.getElementById("create-battle-btn");
const undoBattleBtn = document.getElementById("undo-battle-btn");
const endBattleBtn = document.getElementById("end-battle-btn");
const joinBattleCodeInput = document.getElementById("join-battle-code");
const joinBattleBtn = document.getElementById("join-battle-btn");
const battleSelect = document.getElementById("battle-select");
const battleStatus = document.getElementById("battle-status");
const battleBoardEl = document.getElementById("battle-board-points");
const battleMoveListEl = document.getElementById("battle-move-list");
const battleFirstPlyBtn = document.getElementById("battle-first-ply-btn");
const battlePrevPlyBtn = document.getElementById("battle-prev-ply-btn");
const battleNextPlyBtn = document.getElementById("battle-next-ply-btn");
const battleLastPlyBtn = document.getElementById("battle-last-ply-btn");

const gameState = {
  gameId: null,
  ply: 0,
  selected: null, // [row,col]
};

const battleState = {
  battleId: null,
  ply: 0,
  selected: null,
  followLatest: true,
};

const BATTLE_SYNC_INTERVAL_ACTIVE_MS = 1200;
const BATTLE_SYNC_INTERVAL_IDLE_MS = 4000;
let battleSyncTimer = null;
let battleEventsSource = null;
let battleSyncFromEventTimer = null;

function getOwnedFamily() {
  const user = getCurrentUser();
  if (!user) return null;
  try {
    return getMyFamilies().find((f) => f.canManage) || null;
  } catch (_err) {
    return null;
  }
}

function renderSession() {
  const user = getCurrentUser();
  if (!user) {
    sessionBar.textContent = "当前未登录";
    return;
  }
  sessionBar.innerHTML = `当前用户：${user.name}（${user.email}） <button id="logout-btn">退出登录</button>`;
  document.getElementById("logout-btn").addEventListener("click", () => {
    logoutUser();
    gameState.gameId = null;
    gameState.ply = 0;
    gameState.selected = null;
    battleState.battleId = null;
    battleState.ply = 0;
    battleState.selected = null;
    battleState.followLatest = true;
    renderAll();
  });
}

function renderFamilyInfo() {
  const user = getCurrentUser();
  if (!user) {
    familyInfo.textContent = "登录后可查看家庭组信息。";
    renameFamilyBtn.disabled = true;
    refreshInviteBtn.disabled = true;
    dissolveFamilyBtn.disabled = true;
    return;
  }
  try {
    const families = getMyFamilies();
    if (families.length === 0) {
      familyInfo.textContent = "你还没有加入任何家庭组。";
      renameFamilyBtn.disabled = true;
      refreshInviteBtn.disabled = true;
      dissolveFamilyBtn.disabled = true;
      return;
    }
    const lines = families.map((f) => {
      const memberText = f.members.map((m) => `${m.name}(${m.role})`).join("、");
      return `家庭组：${f.name}\n邀请码：${f.inviteCode}\n我的角色：${f.myRole}\n创建者可维护：${
        f.canManage ? "是" : "否"
      }\n成员：${memberText}`;
    });
    familyInfo.textContent = lines.join("\n\n");
    const owned = getOwnedFamily();
    const canManage = Boolean(owned);
    renameFamilyBtn.disabled = !canManage;
    refreshInviteBtn.disabled = !canManage;
    dissolveFamilyBtn.disabled = !canManage;
    if (canManage && !manageFamilyName.value) {
      manageFamilyName.value = owned.name;
    }
  } catch (err) {
    familyInfo.textContent = err.message;
    renameFamilyBtn.disabled = true;
    refreshInviteBtn.disabled = true;
    dissolveFamilyBtn.disabled = true;
  }
}

function findAnyChildInMyFamily() {
  const db = loadDb();
  const me = getCurrentUser();
  if (!me) return null;
  const myFamilyIds = db.familyMembers.filter((m) => m.userId === me.id).map((m) => m.familyId);
  const childMember = db.familyMembers.find(
    (m) => myFamilyIds.includes(m.familyId) && m.userId !== me.id && m.role === "child",
  );
  return childMember ? childMember.userId : null;
}

function renderGameList() {
  const user = getCurrentUser();
  if (!user) {
    gameSelect.innerHTML = `<option value="">请先登录</option>`;
    return;
  }
  let games = [];
  try {
    games = getMyGames();
  } catch (err) {
    gameSelect.innerHTML = `<option value="">加载失败：${err.message}</option>`;
    return;
  }
  if (games.length === 0) {
    gameSelect.innerHTML = `<option value="">暂无对局，先新建一个</option>`;
    gameState.gameId = null;
    return;
  }
  gameSelect.innerHTML = games
    .map(
      (g) =>
        `<option value="${g.id}">${g.name}（${gameModeText(g.mode)} / ${gameStatusText(g.status)} / ${g.ply}步）</option>`,
    )
    .join("");
  if (!gameState.gameId || !games.some((g) => g.id === gameState.gameId)) {
    gameState.gameId = games[0].id;
  }
  gameSelect.value = gameState.gameId;
}

function battleStatusText(status) {
  if (status === "waiting") return "等待对手加入";
  if (status === "active") return "进行中";
  if (status === "finished") return "已结束";
  return status;
}

function sideText(side) {
  if (side === "r") return "红方";
  if (side === "b") return "黑方";
  return "观战";
}

function gameModeText(mode) {
  return mode === "ai" ? "人机对战" : "练习模式";
}

function gameStatusText(status) {
  if (status === "finished") return "已结束";
  return "进行中";
}

function describeScoreGap(gap) {
  const value = Number(gap || 0);
  if (value <= 0.35) return `几乎等同于最优着（差值 ${value.toFixed(2)}，约 0~0.5 个兵）。`;
  if (value <= 1.5) return `轻微偏差（差值 ${value.toFixed(2)}，约 1~2 个兵），通常是先手效率稍弱。`;
  if (value <= 3.6) return `中等偏差（差值 ${value.toFixed(2)}，约 2~4 个兵），常见于节奏慢一拍或漏掉更强先手。`;
  return `偏差较大（差值 ${value.toFixed(2)}，超过 4 个兵），通常会形成实质劣势。`;
}

function formatAssessment(assessment, latestMoveNotation = "") {
  if (!assessment) return "";
  const riskText = assessment.risks?.length ? assessment.risks.join("、") : "暂无";
  const moveText = latestMoveNotation || "无";
  const bestText = assessment.bestMoveNotation || "无";
  const threePlyText = assessment.threePly
    ? `\n三步预演：${
        assessment.threePly.line?.length ? assessment.threePly.line.join(" -> ") : "无有效主线"
      }\n三步局势变化：${
        assessment.threePly.netSwing > 0
          ? `对你有利 +${assessment.threePly.netSwing.toFixed(2)}`
          : `对你不利 ${assessment.threePly.netSwing.toFixed(2)}`
      }${
        assessment.threePly.movedPieceCaptured
          ? `\n预演提示：该子在第 ${assessment.threePly.capturePly} 手可能被直接吃掉。`
          : ""
      }`
    : "";
  const compareText =
    latestMoveNotation && assessment.bestMoveNotation
      ? latestMoveNotation === assessment.bestMoveNotation
        ? "对比：你这步就是参考最优。"
        : `对比：你走了「${latestMoveNotation}」，参考最优是「${assessment.bestMoveNotation}」。`
      : "对比：当前缺少可比对的完整信息。";
  return `最近一步：${moveText}\n质量：${assessment.qualityLabel}\n差值解读：${describeScoreGap(
    assessment.scoreGap,
  )}\n风险：${riskText}\n参考最优：${bestText}${threePlyText}\n${compareText}`;
}

function formatAssessmentInline(assessment) {
  if (!assessment) return "";
  const riskText = assessment.risks?.length ? `，风险:${assessment.risks.join("/")}` : "";
  return ` [${assessment.qualityLabel}${riskText}]`;
}

function renderBattleList() {
  const user = getCurrentUser();
  if (!user) {
    battleSelect.innerHTML = `<option value="">请先登录</option>`;
    battleState.battleId = null;
    battleState.followLatest = true;
    return;
  }
  let battles = [];
  try {
    battles = getMyBattles();
  } catch (err) {
    battleSelect.innerHTML = `<option value="">加载失败：${err.message}</option>`;
    battleState.battleId = null;
    battleState.followLatest = true;
    return;
  }
  if (battles.length === 0) {
    battleSelect.innerHTML = `<option value="">暂无对战，先创建或加入</option>`;
    battleState.battleId = null;
    return;
  }
  battleSelect.innerHTML = battles
    .map((b) => `<option value="${b.id}">${b.name}（${battleStatusText(b.status)} / ${b.ply}步）</option>`)
    .join("");
  if (!battleState.battleId || !battles.some((b) => b.id === battleState.battleId)) {
    battleState.battleId = battles[0].id;
    battleState.ply = Number.MAX_SAFE_INTEGER;
    battleState.selected = null;
    battleState.followLatest = true;
  }
  battleSelect.value = battleState.battleId;
}

function renderBoard() {
  const user = getCurrentUser();
  if (!user || !gameState.gameId) {
    boardEl.innerHTML = "";
    boardStatus.textContent = "请登录并新建对局。";
    undoGameBtn.disabled = true;
    renderMoveList();
    renderReviewResult();
    return;
  }
  try {
    const game = getGame(gameState.gameId);
    const snap = getSnapshot(gameState.gameId, gameState.ply);
    gameState.ply = snap.index;
    let modeLine = `模式：${gameModeText(snap.mode)}`;
    if (snap.mode === "ai") {
      const mySide = snap.aiSide === "r" ? "黑方" : "红方";
      modeLine += `（你执${mySide}，电脑${sideText(snap.aiSide)}，难度：${
        game.aiLevel || "normal"
      }）`;
    }
    const endLine =
      snap.status === "finished"
        ? `\n结果：${snap.winnerSide ? `${sideText(snap.winnerSide)}胜` : "手动结束"}`
        : "";
    const assessLine = snap.latestAssessment
      ? `\n最近一步评估：\n${formatAssessment(snap.latestAssessment, snap.latestMoveNotation)}`
      : "";
    const undoLine = `\n悔棋：已用 ${snap.undoUsed}/${snap.undoLimit}，剩余 ${snap.undoRemaining}`;
    boardStatus.textContent = `${modeLine}\n第 ${snap.index} 手 / 共 ${snap.max} 手，${
      snap.turn === "r" ? "红方" : "黑方"
    }走子。${snap.index < snap.max ? "（回放模式）" : "（录入模式）"}${endLine}${undoLine}${assessLine}`;
    boardEl.innerHTML = "";
    for (let row = 0; row < 10; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        const code = snap.board[row][col];
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = `cell ${code ? (code[0] === "r" ? "red" : "black") : "empty"}`;
        cell.style.left = `${(col / 8) * 100}%`;
        cell.style.top = `${(row / 9) * 100}%`;
        if (gameState.selected && gameState.selected[0] === row && gameState.selected[1] === col) {
          cell.classList.add("selected");
        }
        cell.textContent = code ? pieceLabel(code) : "";
        cell.addEventListener("click", () => onBoardCellClick(row, col, code, snap));
        boardEl.appendChild(cell);
      }
    }
    firstPlyBtn.disabled = snap.index === 0;
    prevPlyBtn.disabled = snap.index === 0;
    nextPlyBtn.disabled = snap.index === snap.max;
    lastPlyBtn.disabled = snap.index === snap.max;
    undoGameBtn.disabled = snap.max === 0 || snap.undoRemaining <= 0 || snap.index < snap.max;
  } catch (err) {
    boardStatus.textContent = err.message;
    undoGameBtn.disabled = true;
    renderMoveList();
    renderReviewResult();
  }
  renderMoveList();
  renderReviewResult();
}

function renderBattleBoard() {
  const user = getCurrentUser();
  if (!user || !battleState.battleId) {
    battleBoardEl.innerHTML = "";
    battleStatus.textContent = "请登录并创建/加入对战。";
    undoBattleBtn.disabled = true;
    renderBattleMoveList();
    return;
  }
  try {
    const battle = getBattle(battleState.battleId);
    const role = getBattleRole(battleState.battleId);
    const targetPly = battleState.followLatest ? Number.MAX_SAFE_INTEGER : battleState.ply;
    const snap = getBattleSnapshot(battleState.battleId, targetPly);
    battleState.ply = snap.index;

    const myTurnText = snap.turn === role ? "（轮到你）" : "（等待对手）";
    const winnerText =
      snap.status === "finished"
        ? `\n结果：${snap.winnerSide ? `${sideText(snap.winnerSide)}胜` : "手动结束"}`
        : "";
    const assessText = snap.latestAssessment
      ? `\n最近一步评估：\n${formatAssessment(snap.latestAssessment, snap.latestMoveNotation)}`
      : "";
    const undoText = `\n悔棋：已用 ${snap.undoUsed}/${snap.undoLimit}，剩余 ${snap.undoRemaining}`;
    battleStatus.textContent = `房间：${battle.name}\n邀请码：${battle.code}\n我的阵营：${sideText(
      role,
    )}\n状态：${battleStatusText(snap.status)}\n第 ${snap.index} 手 / 共 ${snap.max} 手，${
      snap.turn === "r" ? "红方" : "黑方"
    }走子。${battleState.followLatest ? myTurnText : "（回放模式）"}${winnerText}${undoText}${assessText}`;

    battleBoardEl.innerHTML = "";
    for (let row = 0; row < 10; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        const code = snap.board[row][col];
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = `cell ${code ? (code[0] === "r" ? "red" : "black") : "empty"}`;
        cell.style.left = `${(col / 8) * 100}%`;
        cell.style.top = `${(row / 9) * 100}%`;
        if (
          battleState.selected &&
          battleState.selected[0] === row &&
          battleState.selected[1] === col
        ) {
          cell.classList.add("selected");
        }
        cell.textContent = code ? pieceLabel(code) : "";
        cell.addEventListener("click", () => onBattleCellClick(row, col, code, snap, role));
        battleBoardEl.appendChild(cell);
      }
    }

    battleFirstPlyBtn.disabled = snap.index === 0;
    battlePrevPlyBtn.disabled = snap.index === 0;
    battleNextPlyBtn.disabled = snap.index === snap.max;
    battleLastPlyBtn.disabled = snap.index === snap.max;
    undoBattleBtn.disabled = snap.max === 0 || snap.undoRemaining <= 0 || snap.index < snap.max;
  } catch (err) {
    battleStatus.textContent = err.message;
    battleBoardEl.innerHTML = "";
    undoBattleBtn.disabled = true;
  }
  renderBattleMoveList();
}

function onBoardCellClick(row, col, code, snap) {
  if (snap.index < snap.max) {
    boardStatus.textContent = "当前在回放模式，请先回到最后一步再继续录入。";
    return;
  }
  if (snap.status === "finished") {
    boardStatus.textContent = "该对局已结束。";
    return;
  }
  if (!gameState.selected) {
    if (!code) return;
    if (code[0] !== snap.turn) {
      boardStatus.textContent = "未轮到该方走子。";
      return;
    }
    gameState.selected = [row, col];
    renderBoard();
    return;
  }
  const [fromRow, fromCol] = gameState.selected;
  try {
    makeMove(gameState.gameId, fromRow, fromCol, row, col);
    gameState.selected = null;
    const last = getSnapshot(gameState.gameId, Number.MAX_SAFE_INTEGER);
    gameState.ply = last.index;
    renderGameList();
    renderBoard();
  } catch (err) {
    boardStatus.textContent = err.message;
    gameState.selected = null;
    renderBoard();
  }
}

function onBattleCellClick(row, col, code, snap, role) {
  if (snap.index < snap.max) {
    battleStatus.textContent = "当前在回放模式，请先回到最后一步再继续走子。";
    return;
  }
  if (snap.status === "waiting") {
    battleStatus.textContent = "当前房间仍在等待对手加入。";
    return;
  }
  if (snap.status === "finished") {
    battleStatus.textContent = "该对战已结束，不能继续走子。";
    return;
  }
  if (!battleState.selected) {
    if (!code) return;
    if (code[0] !== snap.turn) {
      battleStatus.textContent = "未轮到该方走子。";
      return;
    }
    if (code[0] !== role) {
      battleStatus.textContent = "你只能操作自己一方的棋子。";
      return;
    }
    battleState.selected = [row, col];
    renderBattleBoard();
    return;
  }
  const [fromRow, fromCol] = battleState.selected;
  try {
    makeBattleMove(battleState.battleId, fromRow, fromCol, row, col);
    battleState.selected = null;
    battleState.ply = Number.MAX_SAFE_INTEGER;
    battleState.followLatest = true;
    renderBattleList();
    renderBattleBoard();
  } catch (err) {
    battleStatus.textContent = err.message;
    battleState.selected = null;
    renderBattleBoard();
  }
}

function renderMoveList() {
  const user = getCurrentUser();
  if (!user || !gameState.gameId) {
    moveListEl.textContent = "棋谱记录：暂无。";
    return;
  }
  try {
    const game = getGame(gameState.gameId);
    if (!game.moves.length) {
      moveListEl.textContent = "棋谱记录：暂无走子。";
      return;
    }
    const lines = ["棋谱记录："];
    for (let i = 0; i < game.moves.length; i += 2) {
      const redMove = game.moves[i];
      const blackMove = game.moves[i + 1];
      const round = Math.floor(i / 2) + 1;
      const redBoardBefore = game.snapshots[i] || null;
      const blackBoardBefore = game.snapshots[i + 1] || null;
      const redText = redMove ? toChineseNotation(redMove, redBoardBefore) : "";
      const blackText = blackMove ? toChineseNotation(blackMove, blackBoardBefore) : "";
      const redAssess = redMove ? formatAssessmentInline(redMove.assessment) : "";
      const blackAssess = blackMove ? formatAssessmentInline(blackMove.assessment) : "";
      lines.push(
        `${round}. ${redText}${redAssess}${blackText ? "    " + blackText + blackAssess : ""}`,
      );
    }
    moveListEl.textContent = lines.join("\n");
  } catch (err) {
    moveListEl.textContent = `棋谱记录加载失败：${err.message}`;
  }
}

function renderBattleMoveList() {
  const user = getCurrentUser();
  if (!user || !battleState.battleId) {
    battleMoveListEl.textContent = "对战棋谱：暂无。";
    return;
  }
  try {
    const battle = getBattle(battleState.battleId);
    if (!battle.moves.length) {
      battleMoveListEl.textContent = "对战棋谱：暂无走子。";
      return;
    }
    const lines = ["对战棋谱："];
    for (let i = 0; i < battle.moves.length; i += 2) {
      const redMove = battle.moves[i];
      const blackMove = battle.moves[i + 1];
      const round = Math.floor(i / 2) + 1;
      const redBoardBefore = battle.snapshots[i] || null;
      const blackBoardBefore = battle.snapshots[i + 1] || null;
      const redText = redMove ? toChineseNotation(redMove, redBoardBefore) : "";
      const blackText = blackMove ? toChineseNotation(blackMove, blackBoardBefore) : "";
      const redAssess = redMove ? formatAssessmentInline(redMove.assessment) : "";
      const blackAssess = blackMove ? formatAssessmentInline(blackMove.assessment) : "";
      lines.push(
        `${round}. ${redText}${redAssess}${blackText ? "    " + blackText + blackAssess : ""}`,
      );
    }
    battleMoveListEl.textContent = lines.join("\n");
  } catch (err) {
    battleMoveListEl.textContent = `对战棋谱加载失败：${err.message}`;
  }
}

function renderReviewResult() {
  const user = getCurrentUser();
  if (!user || !gameState.gameId) {
    reviewResultEl.textContent = "复盘结果：请先登录并选择对局。";
    return;
  }
  try {
    const report = analyzeGame(gameState.gameId);
    const lines = [];
    lines.push(`对局：${report.gameName}`);
    lines.push(`总手数：${report.totalPly}`);
    lines.push("");
    lines.push("高频问题：");
    if (!report.topIssues.length) lines.push("- 暂无");
    report.topIssues.forEach((x) => lines.push(`- ${x.tag} x ${x.count}`));
    lines.push("");
    lines.push("建议：");
    report.suggestions.forEach((s) => lines.push(`- ${s}`));
    lines.push("");
    lines.push("逐手摘要：");
    report.items.slice(0, 30).forEach((it) => {
      const sideText = it.side === "r" ? "红" : "黑";
      const auto = it.autoTags.length ? it.autoTags.join("、") : "无";
      const manual = it.manualTags.length
        ? it.manualTags.map((t) => `${t.tag}${t.note ? `(${t.note})` : ""}`).join("、")
        : "无";
      lines.push(`${it.ply}. ${sideText} ${it.notation} | 自动:${auto} | 手动:${manual}`);
    });
    if (report.items.length > 30) lines.push(`... 其余 ${report.items.length - 30} 手省略`);
    reviewResultEl.textContent = lines.join("\n");
  } catch (err) {
    reviewResultEl.textContent = `复盘结果加载失败：${err.message}`;
  }
}

function renderAll() {
  setupGameModeControls();
  renderSession();
  renderFamilyInfo();
  renderGameList();
  renderBoard();
  renderBattleList();
  renderBattleBoard();
  permissionResult.textContent = "";
}

function syncBattleIfNeeded() {
  if (!battleState.battleId) return;
  const user = getCurrentUser();
  if (!user) return;
  if (battleState.followLatest) {
    battleState.ply = Number.MAX_SAFE_INTEGER;
  }
  renderBattleList();
  renderBattleBoard();
}

function scheduleBattleSyncFromEvent() {
  if (battleSyncFromEventTimer) return;
  battleSyncFromEventTimer = setTimeout(() => {
    battleSyncFromEventTimer = null;
    try {
      syncBattleIfNeeded();
    } catch (_err) {
      // keep UI loop resilient
    }
  }, 80);
}

function restartBattleRealtimeChannel() {
  if (battleEventsSource) {
    try {
      battleEventsSource.close();
    } catch (_err) {
      // ignore
    }
    battleEventsSource = null;
  }
  if (typeof EventSource === "undefined") return;
  const source = new EventSource("/api/events");
  source.addEventListener("db-updated", () => {
    scheduleBattleSyncFromEvent();
  });
  source.addEventListener("ready", () => {
    scheduleBattleSyncFromEvent();
  });
  source.onerror = () => {
    if (source.readyState === EventSource.CLOSED) {
      setTimeout(() => {
        restartBattleRealtimeChannel();
      }, 1800);
    }
  };
  battleEventsSource = source;
}

function restartBattleAutoSyncLoop() {
  if (battleSyncTimer) {
    clearInterval(battleSyncTimer);
    battleSyncTimer = null;
  }
  const interval = document.hidden ? BATTLE_SYNC_INTERVAL_IDLE_MS : BATTLE_SYNC_INTERVAL_ACTIVE_MS;
  battleSyncTimer = setInterval(() => {
    try {
      syncBattleIfNeeded();
    } catch (_err) {
      // Ignore transient sync errors and keep loop alive.
    }
  }, interval);
}

function setupGameModeControls() {
  const levels = getAiLevels();
  if (!aiLevelSelect.options.length) {
    aiLevelSelect.innerHTML = levels
      .map((x) => `<option value="${x.id}">${x.label}</option>`)
      .join("");
    aiLevelSelect.value = "normal";
  }
  const aiEnabled = gameModeSelect.value === "ai";
  aiSideSelect.disabled = !aiEnabled;
  aiLevelSelect.disabled = !aiEnabled;
}

document.getElementById("register-form").addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    registerUser({
      name: document.getElementById("reg-name").value,
      email: document.getElementById("reg-email").value,
      password: document.getElementById("reg-password").value,
    });
    renderAll();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    loginUser({
      email: document.getElementById("login-email").value,
      password: document.getElementById("login-password").value,
    });
    renderAll();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("create-family-form").addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    createFamilyGroup(document.getElementById("family-name").value);
    renderAll();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("join-family-form").addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    joinFamilyByCode(document.getElementById("join-code").value, document.getElementById("join-role").value);
    renderAll();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("seed-data-btn").addEventListener("click", () => {
  try {
    seedStudyData();
    permissionResult.textContent = "已生成示例学习数据。";
  } catch (err) {
    permissionResult.textContent = err.message;
  }
});

document.getElementById("view-self-btn").addEventListener("click", () => {
  try {
    const myData = getUserStudyData(getCurrentUserId());
    permissionResult.textContent = `我的数据：\n${JSON.stringify(myData, null, 2)}`;
  } catch (err) {
    permissionResult.textContent = err.message;
  }
});

document.getElementById("view-child-btn").addEventListener("click", () => {
  try {
    const childId = findAnyChildInMyFamily();
    if (!childId) {
      permissionResult.textContent = "未找到孩子成员。请先让孩子账号加入家庭组。";
      return;
    }
    const childData = getUserStudyData(childId);
    permissionResult.textContent = `孩子数据（只读）：\n${JSON.stringify(childData, null, 2)}`;
  } catch (err) {
    permissionResult.textContent = err.message;
  }
});

renameFamilyBtn.addEventListener("click", () => {
  try {
    const owned = getOwnedFamily();
    if (!owned) throw new Error("只有家庭组创建者可以改名");
    updateFamilyName(owned.id, manageFamilyName.value);
    renderAll();
  } catch (err) {
    alert(err.message);
  }
});

refreshInviteBtn.addEventListener("click", () => {
  try {
    const owned = getOwnedFamily();
    if (!owned) throw new Error("只有家庭组创建者可以重置邀请码");
    regenerateFamilyInviteCode(owned.id);
    renderAll();
  } catch (err) {
    alert(err.message);
  }
});

dissolveFamilyBtn.addEventListener("click", () => {
  try {
    const owned = getOwnedFamily();
    if (!owned) throw new Error("只有家庭组创建者可以解散家庭组");
    const yes = confirm("确认解散家庭组？将移除成员群组关系，但保留个人学习数据。");
    if (!yes) return;
    dissolveFamilyGroup(owned.id);
    manageFamilyName.value = "";
    renderAll();
  } catch (err) {
    alert(err.message);
  }
});

createGameBtn.addEventListener("click", () => {
  try {
    const game = createGame(gameNameInput.value, {
      mode: gameModeSelect.value,
      aiSide: aiSideSelect.value,
      aiLevel: aiLevelSelect.value,
    });
    gameNameInput.value = "";
    gameState.gameId = game.id;
    gameState.ply = Number.MAX_SAFE_INTEGER;
    gameState.selected = null;
    renderAll();
  } catch (err) {
    alert(err.message);
  }
});

undoGameBtn.addEventListener("click", () => {
  try {
    if (!gameState.gameId) throw new Error("请先选择一个对局");
    const snap = getSnapshot(gameState.gameId, gameState.ply);
    if (snap.index < snap.max) throw new Error("请先回到最后一步再悔棋");
    undoGameMove(gameState.gameId);
    gameState.ply = Number.MAX_SAFE_INTEGER;
    gameState.selected = null;
    renderGameList();
    renderBoard();
  } catch (err) {
    alert(err.message);
  }
});

endGameBtn.addEventListener("click", () => {
  try {
    if (!gameState.gameId) throw new Error("请先选择一个对局");
    const yes = confirm("确认结束当前对局？");
    if (!yes) return;
    const keepRecord = confirm(
      "是否保存棋谱与复盘数据？\n点击“确定”：保存并结束。\n点击“取消”：不保存，删除该对局及其复盘数据。",
    );
    endGame(gameState.gameId, { keepRecord });
    gameState.gameId = null;
    gameState.ply = 0;
    gameState.selected = null;
    renderAll();
    alert(keepRecord ? "已结束并保存棋谱。可在列表回放。" : "已结束且未保存，棋谱与复盘数据已删除。");
  } catch (err) {
    alert(err.message);
  }
});

gameSelect.addEventListener("change", () => {
  gameState.gameId = gameSelect.value || null;
  gameState.ply = Number.MAX_SAFE_INTEGER;
  gameState.selected = null;
  renderBoard();
});

gameModeSelect.addEventListener("change", () => {
  setupGameModeControls();
});

firstPlyBtn.addEventListener("click", () => {
  gameState.ply = 0;
  gameState.selected = null;
  renderBoard();
});

prevPlyBtn.addEventListener("click", () => {
  gameState.ply = Math.max(0, gameState.ply - 1);
  gameState.selected = null;
  renderBoard();
});

nextPlyBtn.addEventListener("click", () => {
  gameState.ply += 1;
  gameState.selected = null;
  renderBoard();
});

lastPlyBtn.addEventListener("click", () => {
  gameState.ply = Number.MAX_SAFE_INTEGER;
  gameState.selected = null;
  renderBoard();
});

analyzeGameBtn.addEventListener("click", () => {
  renderReviewResult();
});

addTagBtn.addEventListener("click", () => {
  try {
    if (!gameState.gameId) throw new Error("请先选择对局");
    const ply = Number(tagPlyInput.value);
    if (!Number.isInteger(ply) || ply <= 0) throw new Error("请输入正确步号");
    setManualReviewTag(gameState.gameId, ply, tagTypeSelect.value, tagNoteInput.value);
    tagNoteInput.value = "";
    renderReviewResult();
  } catch (err) {
    alert(err.message);
  }
});

createBattleBtn.addEventListener("click", () => {
  try {
    const battle = createBattle(battleNameInput.value);
    battleNameInput.value = "";
    battleState.battleId = battle.id;
    battleState.ply = Number.MAX_SAFE_INTEGER;
    battleState.selected = null;
    battleState.followLatest = true;
    renderAll();
  } catch (err) {
    alert(err.message);
  }
});

undoBattleBtn.addEventListener("click", () => {
  try {
    if (!battleState.battleId) throw new Error("请先选择一个对战");
    const snap = getBattleSnapshot(battleState.battleId, battleState.ply);
    if (snap.index < snap.max) throw new Error("请先回到最后一步再悔棋");
    undoBattleMove(battleState.battleId);
    battleState.ply = Number.MAX_SAFE_INTEGER;
    battleState.selected = null;
    battleState.followLatest = true;
    renderBattleList();
    renderBattleBoard();
  } catch (err) {
    alert(err.message);
  }
});

endBattleBtn.addEventListener("click", () => {
  try {
    if (!battleState.battleId) throw new Error("请先选择一个对战");
    const yes = confirm("确认结束当前对战？");
    if (!yes) return;
    const keepRecord = confirm(
      "是否保存该对战棋谱？\n点击“确定”：保存并结束。\n点击“取消”：不保存，删除该对战及其分析数据。",
    );
    endBattle(battleState.battleId, { keepRecord });
    battleState.battleId = null;
    battleState.ply = 0;
    battleState.selected = null;
    battleState.followLatest = true;
    renderAll();
    alert(keepRecord ? "已结束并保存对战棋谱。" : "已结束且未保存，对战数据已删除。");
  } catch (err) {
    alert(err.message);
  }
});

joinBattleBtn.addEventListener("click", () => {
  try {
    const battle = joinBattleByCode(joinBattleCodeInput.value);
    joinBattleCodeInput.value = "";
    battleState.battleId = battle.id;
    battleState.ply = Number.MAX_SAFE_INTEGER;
    battleState.selected = null;
    battleState.followLatest = true;
    renderAll();
  } catch (err) {
    alert(err.message);
  }
});

battleSelect.addEventListener("change", () => {
  battleState.battleId = battleSelect.value || null;
  battleState.ply = Number.MAX_SAFE_INTEGER;
  battleState.selected = null;
  battleState.followLatest = true;
  renderBattleBoard();
});

battleFirstPlyBtn.addEventListener("click", () => {
  battleState.ply = 0;
  battleState.selected = null;
  battleState.followLatest = false;
  renderBattleBoard();
});

battlePrevPlyBtn.addEventListener("click", () => {
  battleState.ply = Math.max(0, battleState.ply - 1);
  battleState.selected = null;
  battleState.followLatest = false;
  renderBattleBoard();
});

battleNextPlyBtn.addEventListener("click", () => {
  battleState.ply += 1;
  battleState.selected = null;
  battleState.followLatest = false;
  renderBattleBoard();
});

battleLastPlyBtn.addEventListener("click", () => {
  battleState.ply = Number.MAX_SAFE_INTEGER;
  battleState.selected = null;
  battleState.followLatest = true;
  renderBattleBoard();
});

document.addEventListener("visibilitychange", () => {
  restartBattleAutoSyncLoop();
  if (!battleEventsSource || battleEventsSource.readyState === EventSource.CLOSED) {
    restartBattleRealtimeChannel();
  }
  if (!document.hidden) {
    syncBattleIfNeeded();
  }
});

window.addEventListener("focus", () => {
  syncBattleIfNeeded();
});

setupGameModeControls();
renderAll();
restartBattleAutoSyncLoop();
restartBattleRealtimeChannel();
