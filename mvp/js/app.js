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
  resignGame,
  undoGameMove,
  runAiTurnIfReady,
  pieceLabel,
  getGame,
  toChineseNotation,
  analyzeGame,
  createBattle,
  joinBattleById,
  getMyBattles,
  getBattleSnapshot,
  makeBattleMove,
  endBattle,
  undoBattleMove,
  getBattle,
  getBattleRole,
  getAiLevels,
  searchJoinableBattles,
  evaluateTrendForRed,
  getCurrentTurnHint,
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
const resignGameBtn = document.getElementById("resign-game-btn");
const endGameBtn = document.getElementById("end-game-btn");
const gameSelect = document.getElementById("game-select");
const gameSetupPanel = document.getElementById("game-setup-panel");
const gameLivePanel = document.getElementById("game-live-panel");
const gameActiveTitle = document.getElementById("game-active-title");
const gameActiveSubtitle = document.getElementById("game-active-subtitle");
const boardStatus = document.getElementById("board-status");
const boardEl = document.getElementById("xiangqi-board");
const moveListEl = document.getElementById("move-list");
const gameCoreMetaEl = document.getElementById("game-core-meta");
const recentOpponentMoveEl = document.getElementById("recent-opponent-move");
const recentSelfMoveEl = document.getElementById("recent-self-move");
const trendMarkerEl = document.getElementById("game-trend-marker");
const trendValueEl = document.getElementById("game-trend-value");
const trendBadgeEl = document.getElementById("game-trend-badge");
const moveDrawerEl = document.getElementById("move-drawer");
const toggleMoveDrawerBtn = document.getElementById("toggle-move-drawer-btn");
const closeMoveDrawerBtn = document.getElementById("close-move-drawer-btn");
const toggleHintBtn = document.getElementById("toggle-hint-btn");
const hintCardEl = document.getElementById("hint-card");
const hintContentEl = document.getElementById("hint-content");
const toggleSetupBtn = document.getElementById("toggle-setup-btn");
const reviewResultEl = document.getElementById("review-result");
const reviewGameSelect = document.getElementById("review-game-select");
const reviewSetupPanel = document.getElementById("review-setup-panel");
const reviewToggleSetupBtn = document.getElementById("review-toggle-setup-btn");
const reviewShowOverviewBtn = document.getElementById("review-show-overview-btn");
const reviewShowKeypointsBtn = document.getElementById("review-show-keypoints-btn");
const reviewShowAllBtn = document.getElementById("review-show-all-btn");
const reviewBoardEl = document.getElementById("review-board-points");
const reviewBoardStatus = document.getElementById("review-board-status");
const reviewTimelineEl = document.getElementById("review-timeline");
const reviewStepBannerEl = document.getElementById("review-step-banner");
const reviewFirstPlyBtn = document.getElementById("review-first-ply-btn");
const reviewPrevPlyBtn = document.getElementById("review-prev-ply-btn");
const reviewNextPlyBtn = document.getElementById("review-next-ply-btn");
const reviewLastPlyBtn = document.getElementById("review-last-ply-btn");
const analyzeGameBtn = document.getElementById("analyze-game-btn");
const firstPlyBtn = document.getElementById("first-ply-btn");
const prevPlyBtn = document.getElementById("prev-ply-btn");
const nextPlyBtn = document.getElementById("next-ply-btn");
const lastPlyBtn = document.getElementById("last-ply-btn");
const battleNameInput = document.getElementById("battle-name");
const createBattleBtn = document.getElementById("create-battle-btn");
const undoBattleBtn = document.getElementById("undo-battle-btn");
const endBattleBtn = document.getElementById("end-battle-btn");
const battleRoomQueryInput = document.getElementById("battle-room-query");
const battleRoomSelect = document.getElementById("battle-room-select");
const joinBattleBtn = document.getElementById("join-battle-btn");
const battleSelect = document.getElementById("battle-select");
const battleStatus = document.getElementById("battle-status");
const battleBoardEl = document.getElementById("battle-board-points");
const battleMoveListEl = document.getElementById("battle-move-list");
const battleFirstPlyBtn = document.getElementById("battle-first-ply-btn");
const battlePrevPlyBtn = document.getElementById("battle-prev-ply-btn");
const battleNextPlyBtn = document.getElementById("battle-next-ply-btn");
const battleLastPlyBtn = document.getElementById("battle-last-ply-btn");
const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
const overviewUser = document.getElementById("overview-user");
const overviewUserSub = document.getElementById("overview-user-sub");
const overviewFamily = document.getElementById("overview-family");
const overviewFamilySub = document.getElementById("overview-family-sub");
const overviewGames = document.getElementById("overview-games");
const overviewGamesSub = document.getElementById("overview-games-sub");
const overviewBattles = document.getElementById("overview-battles");
const overviewBattlesSub = document.getElementById("overview-battles-sub");
const overviewLastMove = document.getElementById("overview-last-move");
const overviewLastMoveSub = document.getElementById("overview-last-move-sub");
const overviewTurn = document.getElementById("overview-turn");
const overviewTurnSub = document.getElementById("overview-turn-sub");
const quickGoGameBtn = document.getElementById("quick-go-game");
const quickGoBattleBtn = document.getElementById("quick-go-battle");
const quickGoReviewBtn = document.getElementById("quick-go-review");
const quickGoFamilyBtn = document.getElementById("quick-go-family");
const pageViews = Array.from(document.querySelectorAll(".page-view"));
const gamePageView = document.getElementById("game-card");
const gameHudEl = document.querySelector("#game-live-panel .game-hud");

const gameState = {
  gameId: null,
  ply: 0,
  followLatest: true,
  selected: null, // [row,col]
};

const battleState = {
  battleId: null,
  ply: 0,
  selected: null,
  followLatest: true,
};

const reviewState = {
  gameId: null,
  ply: Number.MAX_SAFE_INTEGER,
  focusPly: null,
};

const renderCache = {
  gameBoardKey: "",
  battleBoardKey: "",
  reviewBoardKey: "",
};
const uiState = {
  showMoveDrawer: false,
  showHintCard: false,
  showSetupInGame: false,
  trendBias: 0,
  trendEvalKey: "",
  trendEvalScore: 0,
  hintCacheKey: "",
  hintCacheText: "暂无提示",
  reviewTimelineFilter: "all",
  reviewTimelineActivePly: null,
  reviewPanelMode: "overview", // overview | keypoints | step
  reviewSetupCollapsed: false,
};

const BATTLE_SYNC_INTERVAL_ACTIVE_MS = 12000;
const BATTLE_SYNC_INTERVAL_IDLE_MS = 20000;
let battleSyncTimer = null;
let aiWakeTimer = null;
let battleEventsSource = null;
let battleSyncFromEventTimer = null;
let trendBadgeTimer = null;
let iosScrollLockY = null;
let iosScrollLockUntil = 0;
const IOS_SAFARI =
  /iP(hone|ad|od)/.test(navigator.userAgent) &&
  /Safari/.test(navigator.userAgent) &&
  !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
const MOVE_FX_DURATION_MS = IOS_SAFARI ? 240 : 360;
const CHECK_CALLOUT_DURATION_MS = 2000;
let sfxAudioCtx = null;
let sfxUnlocked = false;
let sfxMasterGain = null;
const moveFxState = {
  game: { id: null, index: 0, checkToken: "" },
  battle: { id: null, index: 0, checkToken: "" },
};

function pointLeftPercent(col) {
  return `${(col / 8) * 100}%`;
}

function pointTopPercent(row) {
  return `${(row / 9) * 100}%`;
}

function boardMatrixKey(board) {
  return (board || [])
    .map((row) => row.join(","))
    .join("|");
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function setTrendBadge(text, tone = "warn", ms = 1900) {
  if (!trendBadgeEl || !text) return;
  trendBadgeEl.textContent = text;
  trendBadgeEl.dataset.tone = tone;
  trendBadgeEl.hidden = false;
  if (trendBadgeTimer) clearTimeout(trendBadgeTimer);
  trendBadgeTimer = setTimeout(() => {
    trendBadgeEl.hidden = true;
  }, ms);
}

function renderTrendBar(snap) {
  if (!trendMarkerEl || !trendValueEl || !snap) return;
  const key = boardMatrixKey(snap.board);
  if (uiState.trendEvalKey !== key) {
    uiState.trendEvalKey = key;
    uiState.trendEvalScore = evaluateTrendForRed(snap.board);
  }
  const redAdvantage = uiState.trendEvalScore;
  if (snap.latestAssessment && snap.latestMove) {
    const mover = snap.latestMove.piece?.[0] || snap.latestMove.side;
    const gap = Number(snap.latestAssessment.scoreGap || 0);
    if (snap.latestAssessment.quality === "mistake" && gap >= 2.2) {
      setTrendBadge(`${mover === "r" ? "红方" : "黑方"}失误`, "warn");
    } else if (snap.latestAssessment.brilliant === true) {
      setTrendBadge(`${mover === "r" ? "红方" : "黑方"}妙手`, "praise");
    }
  }
  const target = clamp(-Math.tanh(redAdvantage / 5.8), -1, 1);
  uiState.trendBias = uiState.trendBias * 0.62 + target * 0.38;
  trendMarkerEl.style.left = `${((uiState.trendBias + 1) / 2) * 100}%`;
  const absBias = Math.abs(uiState.trendBias);
  if (absBias < 0.07) {
    trendValueEl.textContent = "均势";
  } else {
    const side = uiState.trendBias < 0 ? "红优" : "黑优";
    trendValueEl.textContent = `${side} ${Math.round(absBias * 100)}%`;
  }
}

function formatMoveWithSide(move, boardBefore) {
  if (!move) return "--";
  const moveSide = move.side || move.piece?.[0] || "";
  const side = moveSide === "r" ? "红" : "黑";
  return `${side} ${toChineseNotation(move, boardBefore)}`;
}

function renderRecentQueue(game, snap) {
  if (!recentOpponentMoveEl || !recentSelfMoveEl) return;
  if (!game || !snap || !Array.isArray(game.moves) || game.moves.length === 0) {
    recentOpponentMoveEl.textContent = "--";
    recentSelfMoveEl.textContent = "--";
    return;
  }
  const maxIndex = Math.max(0, Math.min(snap.index, game.moves.length));
  const slice = game.moves.slice(0, maxIndex);
  if (!slice.length) {
    recentOpponentMoveEl.textContent = "--";
    recentSelfMoveEl.textContent = "--";
    return;
  }
  if (snap.mode === "ai") {
    const mySide = snap.aiSide === "r" ? "b" : "r";
    let opponentText = "--";
    let selfText = "--";
    for (let i = slice.length - 1; i >= 0; i -= 1) {
      const mv = slice[i];
      const mvSide = mv.side || mv.piece?.[0] || "";
      const text = formatMoveWithSide(mv, game.snapshots?.[i] || null);
      if (mvSide && mvSide !== mySide && opponentText === "--") {
        opponentText = text;
      } else if (mvSide && mvSide === mySide && selfText === "--") {
        selfText = text;
      }
      if (opponentText !== "--" && selfText !== "--") break;
    }
    recentOpponentMoveEl.textContent = opponentText;
    recentSelfMoveEl.textContent = selfText;
    return;
  }
  const lastIdx = slice.length - 1;
  const prevIdx = slice.length - 2;
  recentOpponentMoveEl.textContent = formatMoveWithSide(slice[lastIdx], game.snapshots?.[lastIdx] || null);
  recentSelfMoveEl.textContent =
    prevIdx >= 0 ? formatMoveWithSide(slice[prevIdx], game.snapshots?.[prevIdx] || null) : "--";
}

function finalizeGameWithSavePrompt({ endReasonText = "对局已结束。" } = {}) {
  if (!gameState.gameId) return;
  const keepRecord = confirm(
    "是否保存棋谱与复盘数据？\n点击“确定”：保存并结束。\n点击“取消”：不保存，删除该对局及其复盘数据。",
  );
  endGame(gameState.gameId, { keepRecord });
  gameState.gameId = null;
  gameState.ply = 0;
  gameState.followLatest = true;
  gameState.selected = null;
  uiState.showSetupInGame = false;
  uiState.showHintCard = false;
  uiState.showMoveDrawer = false;
  uiState.hintCacheKey = "";
  uiState.hintCacheText = "暂无提示";
  renderAll();
  alert(
    keepRecord
      ? `${endReasonText} 已保存棋谱，可在历史里回放。`
      : `${endReasonText} 未保存，棋谱与复盘数据已删除。`,
  );
}

function formatHintDetail(hint, { freeze = false } = {}) {
  if (!hint) return "暂无提示";
  const lines = [];
  lines.push(`参考最优（你方下一步）：${hint.bestMoveNotation || "无"}`);
  const lineText = hint.previewLine?.length ? hint.previewLine.join(" -> ") : "无有效主线";
  lines.push(`关键预演（${Math.min(5, Math.max(2, hint.previewPly || 2))}步内）：${lineText}`);
  if (Array.isArray(hint.impactDetails) && hint.impactDetails.length) {
    lines.push(`局势影响：${hint.impactDetails.join("；")}`);
  } else {
    lines.push("局势影响：暂无明显战术变化。");
  }
  if (freeze) lines.push("提示已锁定：等待电脑走棋后刷新。");
  return lines.join("\n");
}

function updateGamePanelVisibility(hasActiveGame) {
  const showSetup = !hasActiveGame || uiState.showSetupInGame;
  if (gameSetupPanel) gameSetupPanel.hidden = !showSetup;
  if (hintCardEl) {
    hintCardEl.hidden = !uiState.showHintCard;
    hintCardEl.style.display = uiState.showHintCard ? "block" : "none";
  }
  if (moveDrawerEl) {
    moveDrawerEl.hidden = !uiState.showMoveDrawer;
    moveDrawerEl.style.display = uiState.showMoveDrawer ? "grid" : "none";
  }
  if (toggleSetupBtn) {
    toggleSetupBtn.disabled = !hasActiveGame;
    toggleSetupBtn.textContent = showSetup ? "收起设置" : "设置";
  }
  if (toggleHintBtn) {
    toggleHintBtn.textContent = uiState.showHintCard ? "隐藏提示" : "电脑提示";
  }
  if (toggleMoveDrawerBtn) {
    toggleMoveDrawerBtn.textContent = uiState.showMoveDrawer ? "收起棋谱" : "棋谱";
  }
}

function mountHintCardNearHud() {
  if (!hintCardEl || !gameHudEl) return;
  if (hintCardEl.parentElement !== gameHudEl) {
    gameHudEl.appendChild(hintCardEl);
  }
}

function updateReviewControls() {
  if (reviewSetupPanel) reviewSetupPanel.hidden = !!uiState.reviewSetupCollapsed;
  if (reviewToggleSetupBtn) {
    reviewToggleSetupBtn.textContent = uiState.reviewSetupCollapsed ? "选局" : "收起选局";
  }
  if (reviewShowOverviewBtn) {
    reviewShowOverviewBtn.classList.toggle("is-active", uiState.reviewPanelMode === "overview");
  }
  if (reviewShowKeypointsBtn) {
    reviewShowKeypointsBtn.classList.toggle("is-active", uiState.reviewPanelMode === "keypoints");
  }
  if (reviewShowAllBtn) {
    reviewShowAllBtn.classList.toggle("is-active", uiState.reviewPanelMode === "step");
  }
}

function gameBoardRenderKey(snap) {
  return [boardMatrixKey(snap.board), snap.checkedSide || ""].join("::");
}

function battleBoardRenderKey(snap) {
  return [boardMatrixKey(snap.board), snap.checkedSide || ""].join("::");
}

function reviewBoardRenderKey(snap) {
  return [boardMatrixKey(snap.board), snap.checkedSide || ""].join("::");
}

function getLiveGameSnapshot() {
  if (!gameState.gameId) return null;
  const targetPly = gameState.followLatest ? Number.MAX_SAFE_INTEGER : gameState.ply;
  return getSnapshot(gameState.gameId, targetPly);
}

function getLiveBattleSnapshot() {
  if (!battleState.battleId) return null;
  const targetPly = battleState.followLatest ? Number.MAX_SAFE_INTEGER : battleState.ply;
  return getBattleSnapshot(battleState.battleId, targetPly);
}

function lockIosScrollPosition(durationMs = 800) {
  if (!IOS_SAFARI) return;
  iosScrollLockY = window.scrollY;
  iosScrollLockUntil = Date.now() + Math.max(120, durationMs);
}

function enforceIosScrollLock() {
  if (!IOS_SAFARI) return;
  if (!Number.isFinite(iosScrollLockY) || Date.now() > iosScrollLockUntil) {
    iosScrollLockY = null;
    iosScrollLockUntil = 0;
    return;
  }
  const y = iosScrollLockY;
  window.scrollTo(0, y);
  requestAnimationFrame(() => window.scrollTo(0, y));
}

function createFxNode(className, row, col, text = "") {
  const node = document.createElement("div");
  node.className = className;
  node.style.left = pointLeftPercent(col);
  node.style.top = pointTopPercent(row);
  if (text) node.textContent = text;
  return node;
}

function findCellNode(boardPointsEl, row, col) {
  return boardPointsEl?.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`) || null;
}

function findPiecePoint(board, pieceCode) {
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === pieceCode) return [row, col];
    }
  }
  return null;
}

function syncBoardSelection(boardPointsEl, selected) {
  if (!boardPointsEl) return;
  boardPointsEl.querySelectorAll(".cell.selected").forEach((node) => node.classList.remove("selected"));
  if (!Array.isArray(selected)) return;
  const [row, col] = selected;
  const node = findCellNode(boardPointsEl, row, col);
  node?.classList.add("selected");
}

function syncThinkingBubble(boardPointsEl, snap) {
  if (!boardPointsEl) return;
  boardPointsEl.querySelectorAll(".thinking-bubble").forEach((node) => node.remove());
  if (!(snap?.mode === "ai" && snap.aiThinking)) return;
  const kingPoint = findPiecePoint(snap.board, `${snap.turn}K`);
  if (!kingPoint) return;
  const [kingRow, kingCol] = kingPoint;
  const bubble = createFxNode("thinking-bubble", kingRow, kingCol, "思考中");
  boardPointsEl.appendChild(bubble);
}

function ensureSfxContext() {
  if (!sfxAudioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    sfxAudioCtx = new Ctx();
    const compressor = sfxAudioCtx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.2;
    sfxMasterGain = sfxAudioCtx.createGain();
    sfxMasterGain.gain.value = 1.2;
    compressor.connect(sfxMasterGain).connect(sfxAudioCtx.destination);
  }
  if (sfxAudioCtx.state === "suspended") {
    sfxAudioCtx.resume().catch(() => {});
  }
  return sfxAudioCtx;
}

function sfxDestination(ctx) {
  return sfxMasterGain || ctx.destination;
}

function refreshSfxStatus() {
  const sfxStatus = document.getElementById("sfx-status");
  if (!sfxStatus) return;
  const ctx = sfxAudioCtx;
  if (!ctx) {
    sfxStatus.textContent = "音效状态：未初始化";
    return;
  }
  const stateText =
    ctx.state === "running" ? "运行中" : ctx.state === "suspended" ? "被挂起" : ctx.state;
  sfxStatus.textContent = `音效状态：${sfxUnlocked ? "已解锁" : "未解锁"} / ${stateText}`;
}

function unlockSfxFromGesture({ preview = false } = {}) {
  const ctx = ensureSfxContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  if (!sfxUnlocked) {
    sfxUnlocked = true;
    const t = ctx.currentTime + 0.01;
    // Warm-up tone to satisfy iOS audio activation chain.
    playSine(ctx, t, 440, 0.02, preview ? 0.028 : 0.00012);
  }
  refreshSfxStatus();
  if (preview) {
    playMoveSfx(80);
    playCaptureSfx(360);
    playCheckSfx(760);
  }
}

function playSine(ctx, when, freq, duration, gain = 0.06) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(g).connect(sfxDestination(ctx));
  osc.start(when);
  osc.stop(when + duration + 0.01);
}

function playNoiseBurst(ctx, when, duration = 0.16, gain = 0.05) {
  const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / size);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 700;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2600;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  src.connect(hp).connect(lp).connect(g).connect(sfxDestination(ctx));
  src.start(when);
  src.stop(when + duration + 0.01);
}

function playWoodClick(ctx, when, { pitch = 220, gain = 0.13, sharp = 1 } = {}) {
  const body = ctx.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(pitch, when);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.0001, when);
  bodyGain.gain.exponentialRampToValueAtTime(gain, when + 0.008);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.11);

  const click = ctx.createOscillator();
  click.type = "square";
  click.frequency.setValueAtTime(pitch * (2.7 + sharp * 0.35), when);
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.0001, when);
  clickGain.gain.exponentialRampToValueAtTime(gain * (0.45 + sharp * 0.15), when + 0.003);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.032);

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 180;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3600;

  body.connect(bodyGain).connect(hp).connect(lp).connect(sfxDestination(ctx));
  click.connect(clickGain).connect(hp).connect(lp).connect(sfxDestination(ctx));
  body.start(when);
  click.start(when);
  body.stop(when + 0.12);
  click.stop(when + 0.04);
}

function playMoveSfx(delayMs = 0) {
  const ctx = ensureSfxContext();
  if (!ctx || !sfxUnlocked) return;
  refreshSfxStatus();
  const t = ctx.currentTime + Math.max(0, delayMs) / 1000;
  playWoodClick(ctx, t, { pitch: 250, gain: 0.11, sharp: 1.1 });
  playWoodClick(ctx, t + 0.02, { pitch: 198, gain: 0.065, sharp: 0.8 });
}

function playCaptureSfx(delayMs = 0) {
  const ctx = ensureSfxContext();
  if (!ctx || !sfxUnlocked) return;
  refreshSfxStatus();
  const t = ctx.currentTime + Math.max(0, delayMs) / 1000;
  playWoodClick(ctx, t, { pitch: 190, gain: 0.15, sharp: 0.75 });
  playWoodClick(ctx, t + 0.03, { pitch: 145, gain: 0.11, sharp: 0.55 });
  playNoiseBurst(ctx, t + 0.012, 0.14, 0.1);
}

function playCheckSfx(delayMs = 0) {
  const ctx = ensureSfxContext();
  if (!ctx || !sfxUnlocked) return;
  refreshSfxStatus();
  const t = ctx.currentTime + Math.max(0, delayMs) / 1000;
  playWoodClick(ctx, t, { pitch: 320, gain: 0.12, sharp: 1.25 });
  playWoodClick(ctx, t + 0.11, { pitch: 430, gain: 0.14, sharp: 1.35 });
}

function showCheckCallout(boardPointsEl) {
  const host = boardPointsEl?.closest(".xiangqi-board");
  if (!host) return;
  const old = host.querySelector(".check-callout");
  if (old) old.remove();
  const node = document.createElement("div");
  node.className = "check-callout";
  node.textContent = "将军";
  host.appendChild(node);
  setTimeout(() => node.remove(), CHECK_CALLOUT_DURATION_MS);
}

function spawnCaptureParticles(boardPointsEl, row, col, count = 14) {
  for (let i = 0; i < count; i += 1) {
    const p = createFxNode("capture-particle", row, col);
    const angle = Math.random() * Math.PI * 2;
    const dist = 22 + Math.random() * 34;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const rot = -110 + Math.random() * 220;
    const delay = Math.random() * 70;
    p.style.setProperty("--dx", `${dx.toFixed(1)}px`);
    p.style.setProperty("--dy", `${dy.toFixed(1)}px`);
    p.style.setProperty("--rot", `${rot.toFixed(1)}deg`);
    p.style.animationDelay = `${delay.toFixed(0)}ms`;
    boardPointsEl.appendChild(p);
    setTimeout(() => p.remove(), 640);
  }
}

function spawnMoveFx(boardPointsEl, move, { checkAlert = false } = {}) {
  if (!boardPointsEl || !move) return;
  const [fromRow, fromCol] = move.from;
  const [toRow, toCol] = move.to;
  const toCell = findCellNode(boardPointsEl, toRow, toCol);
  if (toCell) toCell.classList.add("anim-hidden");
  const ghost = createFxNode(
    `move-ghost ${move.piece?.[0] === "r" ? "red" : "black"}`,
    fromRow,
    fromCol,
    pieceLabel(move.piece || ""),
  );
  boardPointsEl.appendChild(ghost);
  requestAnimationFrame(() => {
    ghost.classList.add("moving");
    ghost.style.left = pointLeftPercent(toCol);
    ghost.style.top = pointTopPercent(toRow);
  });
  const impactDelayMs = Math.max(130, MOVE_FX_DURATION_MS - 120);
  if (move.captured) {
    playCaptureSfx(impactDelayMs);
  } else {
    playMoveSfx(impactDelayMs);
  }
  setTimeout(() => {
    ghost.remove();
    toCell?.classList.remove("anim-hidden");
  }, MOVE_FX_DURATION_MS + 140);

  if (move.captured) {
    setTimeout(() => {
      const burst = createFxNode("capture-burst", toRow, toCol);
      const shock = createFxNode("capture-shockwave", toRow, toCol);
      boardPointsEl.appendChild(burst);
      if (!IOS_SAFARI) {
        boardPointsEl.appendChild(shock);
      }
      spawnCaptureParticles(boardPointsEl, toRow, toCol, IOS_SAFARI ? 8 : 16);
      setTimeout(() => burst.remove(), 440);
      setTimeout(() => shock.remove(), 520);
    }, impactDelayMs);
  }

  if (checkAlert) {
    setTimeout(() => {
      const flash = createFxNode("check-flash", toRow, toCol);
      boardPointsEl.appendChild(flash);
      setTimeout(() => flash.remove(), 420);
      showCheckCallout(boardPointsEl);
      playCheckSfx();
    }, Math.max(150, MOVE_FX_DURATION_MS - 120));
  }
}

function maybeAnimateLatestMove(scope, ownerId, snap, boardPointsEl) {
  const state = moveFxState[scope];
  if (!state) return;
  const checkToken = snap.inCheck ? `${ownerId}:${snap.index}:${snap.checkedSide}` : "";
  if (state.id !== ownerId) {
    state.id = ownerId;
    state.index = snap.index;
    state.checkToken = checkToken;
    if (snap.inCheck) {
      showCheckCallout(boardPointsEl);
      playCheckSfx(50);
    }
    return;
  }
  if (snap.index <= state.index) {
    state.index = snap.index;
    if (snap.inCheck && state.checkToken !== checkToken) {
      showCheckCallout(boardPointsEl);
      playCheckSfx(50);
      state.checkToken = checkToken;
    }
    return;
  }
  if (snap.index === snap.max && snap.latestMove) {
    if (snap.inCheck) state.checkToken = checkToken;
    spawnMoveFx(boardPointsEl, snap.latestMove, { checkAlert: snap.inCheck });
  } else if (snap.inCheck && state.checkToken !== checkToken) {
    showCheckCallout(boardPointsEl);
    playCheckSfx(50);
    state.checkToken = checkToken;
  }
  state.index = snap.index;
}

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
    sessionBar.innerHTML = `<button id="session-login-btn" class="session-cta" type="button">当前未登录，点击登录</button>`;
    document.getElementById("session-login-btn")?.addEventListener("click", () => {
      activateView("auth-card");
      document.getElementById("login-email")?.focus();
    });
    return;
  }
  const avatar = (user.name || user.email || "U").trim().slice(0, 1).toUpperCase();
  sessionBar.innerHTML = `<span class="session-avatar">${avatar}</span><span class="session-userline">${user.name}</span><button id="logout-btn">退出</button>`;
  document.getElementById("logout-btn").addEventListener("click", () => {
    logoutUser();
    gameState.gameId = null;
    gameState.ply = 0;
    gameState.followLatest = true;
    gameState.selected = null;
    battleState.battleId = null;
    battleState.ply = 0;
    battleState.selected = null;
    battleState.followLatest = true;
    uiState.hintCacheKey = "";
    uiState.hintCacheText = "暂无提示";
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
    uiState.hintCacheKey = "";
    uiState.hintCacheText = "暂无提示";
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
    gameState.followLatest = true;
    uiState.hintCacheKey = "";
    uiState.hintCacheText = "暂无提示";
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
    uiState.hintCacheKey = "";
    uiState.hintCacheText = "暂无提示";
  }
  gameSelect.value = gameState.gameId;
}

function renderReviewGameOptions() {
  if (!reviewGameSelect) return;
  const user = getCurrentUser();
  if (!user) {
    reviewGameSelect.innerHTML = `<option value="">请先登录</option>`;
    reviewState.gameId = null;
    reviewState.ply = Number.MAX_SAFE_INTEGER;
    reviewState.focusPly = null;
    return;
  }
  let finishedGames = [];
  try {
    finishedGames = getMyGames().filter((game) => game.status === "finished");
  } catch (err) {
    reviewGameSelect.innerHTML = `<option value="">加载失败：${err.message}</option>`;
    reviewState.gameId = null;
    reviewState.ply = Number.MAX_SAFE_INTEGER;
    reviewState.focusPly = null;
    return;
  }
  if (!finishedGames.length) {
    reviewGameSelect.innerHTML = `<option value="">暂无已结束棋局</option>`;
    reviewState.gameId = null;
    reviewState.ply = Number.MAX_SAFE_INTEGER;
    reviewState.focusPly = null;
    return;
  }
  reviewGameSelect.innerHTML = finishedGames
    .map(
      (game) =>
        `<option value="${game.id}">${game.name}（${gameModeText(game.mode)} / ${game.ply}步）</option>`,
    )
    .join("");
  const preferredId =
    reviewState.gameId && finishedGames.some((game) => game.id === reviewState.gameId)
      ? reviewState.gameId
      : finishedGames[0].id;
  const changed = preferredId !== reviewState.gameId;
  reviewState.gameId = preferredId;
  if (changed) {
    reviewState.ply = Number.MAX_SAFE_INTEGER;
    reviewState.focusPly = null;
    uiState.reviewTimelineActivePly = null;
  }
  reviewGameSelect.value = preferredId;
}

function renderGameWorkspace() {
  if (!gameSetupPanel || !gameLivePanel) return;
  const activeViewId = document.querySelector(".page-view.is-active")?.id || "";
  const user = getCurrentUser();
  if (!user || !gameState.gameId) {
    gamePageView?.classList.remove("immersive");
    uiState.showSetupInGame = false;
    gameLivePanel.classList.remove("live-focused");
    if (gameActiveTitle) gameActiveTitle.textContent = "当前对局";
    if (gameActiveSubtitle) {
      gameActiveSubtitle.textContent = "开始一盘新棋，或从历史对局进入回放。";
    }
    if (gameCoreMetaEl) gameCoreMetaEl.textContent = "未进入对局";
    uiState.trendEvalKey = "";
    uiState.trendEvalScore = 0;
    if (recentOpponentMoveEl) recentOpponentMoveEl.textContent = "--";
    if (recentSelfMoveEl) recentSelfMoveEl.textContent = "--";
    updateGamePanelVisibility(false);
    updateBoardViewLock(activeViewId);
    return;
  }
  try {
    const game = getGame(gameState.gameId);
    const isActiveGame = (game.status || "active") === "active";
    gamePageView?.classList.toggle("immersive", isActiveGame);
    gameLivePanel.classList.toggle("live-focused", isActiveGame);
    if (gameActiveTitle) gameActiveTitle.textContent = game.name || "当前对局";
    if (gameActiveSubtitle) {
      const modeText = game.mode === "ai" ? "人机对战" : "练习模式";
      const statusText = game.status === "finished" ? "已结束，可回放与复盘。" : "对局进行中。";
      gameActiveSubtitle.textContent = `${modeText} · ${statusText}`;
    }
    updateGamePanelVisibility(isActiveGame);
    updateBoardViewLock(activeViewId);
  } catch (_err) {
    gamePageView?.classList.remove("immersive");
    updateGamePanelVisibility(false);
    gameLivePanel.classList.remove("live-focused");
    updateBoardViewLock(activeViewId);
  }
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

function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

function shouldLockBoardView(viewId) {
  return false;
}

function updateBoardViewLock(viewId) {
  document.body.classList.remove("board-view-lock");
}

function activateView(viewId, { updateHash = true } = {}) {
  const targetId = pageViews.some((view) => view.id === viewId) ? viewId : "home-card";
  pageViews.forEach((view) => {
    view.classList.toggle("is-active", view.id === targetId);
  });
  navButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.target === targetId);
  });
  if (updateHash) {
    history.replaceState(null, "", `#${targetId}`);
  }
  updateBoardViewLock(targetId);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function latestMoveSummaryFromGame(game) {
  if (!game || !game.moves?.length) return null;
  const idx = game.moves.length - 1;
  const move = game.moves[idx];
  const boardBefore = game.snapshots[idx] || null;
  return {
    text: toChineseNotation(move, boardBefore),
    side: move.side === "r" ? "红方" : "黑方",
    gameName: game.name,
    quality: move.assessment?.qualityLabel || "",
  };
}

function findLatestMoveSummary(games, battles) {
  const gameCandidates = [...games].sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
  );
  for (const g of gameCandidates) {
    const x = latestMoveSummaryFromGame(g);
    if (x) return x;
  }
  const battleCandidates = [...battles].sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
  );
  for (const b of battleCandidates) {
    const x = latestMoveSummaryFromGame(b);
    if (x) return x;
  }
  return null;
}

function renderHomeOverview() {
  if (!overviewUser) return;
  const user = getCurrentUser();
  if (!user) {
    overviewUser.textContent = "未登录";
    overviewUserSub.textContent = "登录后可开始训练";
    overviewFamily.textContent = "0";
    overviewFamilySub.textContent = "未加入家庭组";
    overviewGames.textContent = "0";
    overviewGamesSub.textContent = "进行中 0";
    overviewBattles.textContent = "0";
    overviewBattlesSub.textContent = "进行中 0";
    overviewLastMove.textContent = "暂无";
    overviewLastMoveSub.textContent = "开始一盘新棋吧";
    overviewTurn.textContent = "暂无对局";
    overviewTurnSub.textContent = "请先登录并创建对局";
    return;
  }
  let families = [];
  let games = [];
  let battles = [];
  try {
    families = getMyFamilies();
  } catch (_err) {
    families = [];
  }
  try {
    games = getMyGames();
  } catch (_err) {
    games = [];
  }
  try {
    battles = getMyBattles();
  } catch (_err) {
    battles = [];
  }
  const activeGames = games.filter((x) => (x.status || "active") === "active").length;
  const activeBattles = battles.filter((x) => (x.status || "waiting") !== "finished").length;

  overviewUser.textContent = user.name || user.email;
  overviewUserSub.textContent = user.email || "当前已登录";
  overviewFamily.textContent = String(families.length);
  overviewFamilySub.textContent = families.length ? `家庭组：${families[0].name}` : "未加入家庭组";
  overviewGames.textContent = String(games.length);
  overviewGamesSub.textContent = `进行中 ${activeGames}`;
  overviewBattles.textContent = String(battles.length);
  overviewBattlesSub.textContent = `进行中 ${activeBattles}`;

  const latest = findLatestMoveSummary(games, battles);
  if (latest) {
    overviewLastMove.textContent = latest.text;
    overviewLastMoveSub.textContent = `${latest.gameName} · ${latest.side}${
      latest.quality ? ` · ${latest.quality}` : ""
    }`;
  } else {
    overviewLastMove.textContent = "暂无";
    overviewLastMoveSub.textContent = "开始一盘新棋吧";
  }

  if (gameState.gameId) {
    try {
      const snap = getSnapshot(gameState.gameId, Number.MAX_SAFE_INTEGER);
      const turnText = snap.turn === "r" ? "红方" : "黑方";
      overviewTurn.textContent = `${turnText}走子`;
      overviewTurnSub.textContent = snap.aiThinking
        ? "电脑思考中"
        : snap.status === "finished"
          ? "当前对局已结束"
          : "当前对局进行中";
      return;
    } catch (_err) {
      // fall through
    }
  }
  overviewTurn.textContent = "暂无对局";
  overviewTurnSub.textContent = "可从首页下方快速进入功能区";
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
  const qualityText = assessment.brilliant ? `${assessment.qualityLabel}（妙手）` : assessment.qualityLabel;
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
  return `最近一步：${moveText}\n质量：${qualityText}\n差值解读：${describeScoreGap(
    assessment.scoreGap,
  )}\n风险：${riskText}\n参考最优：${bestText}${threePlyText}\n${compareText}`;
}

function formatAssessmentInline(assessment) {
  if (!assessment) return "";
  const qualityText = assessment.brilliant ? `${assessment.qualityLabel}|妙手` : assessment.qualityLabel;
  const riskText = assessment.risks?.length ? `，风险:${assessment.risks.join("/")}` : "";
  return ` [${qualityText}${riskText}]`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function describeImpactFromAssessment(assessment) {
  if (!assessment) return "信息不足";
  const tags = [];
  const risks = Array.isArray(assessment.risks) ? assessment.risks : [];
  if (assessment.brilliant) tags.push("形成主动先手");
  if (assessment.quality === "mistake") tags.push("局势波动较大");
  if (risks.includes("落点可能被吃")) tags.push("落点可能被吃");
  if (risks.includes("下一步可能被将")) tags.push("下一步可能被将");
  if (assessment.threePly?.movedPieceCaptured) {
    tags.push(`预演第${assessment.threePly.capturePly}手可能被反吃`);
  }
  if (assessment.threePly?.netSwing >= 1.2) tags.push("后续局面偏主动");
  else if (assessment.threePly?.netSwing <= -1.2) tags.push("后续局面偏被动");
  if (!tags.length) tags.push("局面总体平稳");
  return tags.join("；");
}

function reviewCoachAdvice(item, assessment) {
  if (assessment?.quality === "mistake") {
    return "建议重摆该节点，先做“将军-吃子-威胁”三步检查，再与参考最优对照。";
  }
  if (assessment?.risks?.includes("下一步可能被将")) {
    return "优先处理王城安全，先防将再争先。";
  }
  if (assessment?.risks?.length) {
    return "建议先计算交换净值，再决定是否执行该计划。";
  }
  if (assessment?.brilliant) {
    return "这是高质量主动手，建议记录触发条件，迁移到相似局面。";
  }
  if (item?.autoTags?.includes("反复调子")) {
    return "该阶段有调子往返迹象，后续同类局面可优先选择带先手的转化。";
  }
  return "可行但仍可优化，下一次优先比较先手效率更高的候选手。";
}

function shouldIncludeTimelineMark(item, assessment, filter) {
  const risks = Array.isArray(item?.risks) ? item.risks : [];
  if (filter === "best") return assessment?.quality === "best";
  if (filter === "inaccuracy") return assessment?.quality === "inaccuracy";
  if (filter === "mistake") return assessment?.quality === "mistake";
  if (filter === "risk") return risks.length > 0;
  return assessment?.quality === "mistake" || risks.length > 0 || assessment?.brilliant;
}

function timelineTone(item, assessment) {
  const risks = Array.isArray(item?.risks) ? item.risks : [];
  if (assessment?.quality === "mistake") return "mistake";
  if (risks.length > 0) return "risk";
  if (assessment?.quality === "inaccuracy") return "inaccuracy";
  return "best";
}

function buildTimelineModel(report, game, filter) {
  const total = Math.max(1, report.totalPly);
  const marks = [];
  for (const item of report.items) {
    const assessment = game.moves[item.ply - 1]?.assessment || null;
    if (!shouldIncludeTimelineMark(item, assessment, filter)) continue;
    marks.push({
      ply: item.ply,
      side: item.side,
      notation: item.notation,
      qualityLabel: assessment?.brilliant ? `${item.qualityLabel}·妙手` : item.qualityLabel,
      impact: describeImpactFromAssessment(assessment),
      tone: timelineTone(item, assessment),
    });
  }
  return { total, marks };
}

function buildReviewHtml(report, game) {
  const issueRows = report.topIssues.length
    ? report.topIssues.map((x) => `<li>${escapeHtml(x.tag)} × ${x.count}</li>`).join("")
    : "<li>暂无明显高频问题</li>";
  const suggestionRows = report.suggestions.length
    ? report.suggestions.map((x) => `<li>${escapeHtml(x)}</li>`).join("")
    : "<li>暂无</li>";
  const filter = uiState.reviewTimelineFilter || "all";

  const keyRows = report.keyMoments.length
    ? report.keyMoments
        .slice(0, 6)
        .map((km) => {
          const idx = km.ply - 1;
          const item = report.items[idx];
          const assessment = game.moves[idx]?.assessment || null;
          const from = Math.max(1, km.ply - 2);
          const to = Math.min(report.items.length, km.ply + 2);
          const around = [];
          for (let p = from; p <= to; p += 1) {
            const pt = report.items[p - 1];
            if (pt) around.push(`${p}. ${pt.side === "r" ? "红" : "黑"}${pt.notation}`);
          }
          const lineText = assessment?.threePly?.line?.length
            ? assessment.threePly.line.join(" -> ")
            : "暂无稳定预演线";
          const activeClass = reviewState.focusPly === km.ply ? " is-focus" : "";
          return `<article class="review-key-node${activeClass}">
            <h5>第 ${km.ply} 手 · ${km.side === "r" ? "红方" : "黑方"} ${escapeHtml(km.notation)}</h5>
            <button type="button" class="review-jump-btn compact-btn" data-review-ply="${km.ply}">跳到该手局面</button>
            <p><strong>局势影响：</strong>${escapeHtml(describeImpactFromAssessment(assessment))}</p>
            <p><strong>关键窗口：</strong>${escapeHtml(around.join(" ｜ "))}</p>
            <p><strong>推演：</strong>${escapeHtml(lineText)}</p>
            <p><strong>复盘指导：</strong>${escapeHtml(reviewCoachAdvice(item, assessment))}</p>
          </article>`;
        })
        .join("")
    : `<p class="review-empty">暂无明显关键节点，建议先从“有更优/失误”的走法做专项复盘。</p>`;

  const overviewHtml = `
    <details class="review-section" open>
      <summary>总览</summary>
      <div class="review-section-body">
        <p class="review-headline">${escapeHtml(report.gameName)} · ${gameModeText(report.mode)} · ${gameStatusText(
          report.status,
        )} · 共 ${report.totalPly} 手</p>
        <div class="review-kpi-grid">
          <button type="button" class="review-filter-chip${filter === "best" ? " is-active" : ""}" data-review-filter="best"><span>最优</span><strong>${report.quality.best}</strong></button>
          <button type="button" class="review-filter-chip${filter === "inaccuracy" ? " is-active" : ""}" data-review-filter="inaccuracy"><span>有更优</span><strong>${report.quality.inaccuracy}</strong></button>
          <button type="button" class="review-filter-chip${filter === "mistake" ? " is-active" : ""}" data-review-filter="mistake"><span>失误</span><strong>${report.quality.mistake}</strong></button>
          <button type="button" class="review-filter-chip${filter === "risk" ? " is-active" : ""}" data-review-filter="risk"><span>风险点</span><strong>${report.risks.materialLoss + report.risks.checkThreat}</strong></button>
        </div>
        <button type="button" class="compact-btn review-filter-reset${filter === "all" ? " is-active" : ""}" data-review-filter="all">显示全部关键点</button>
        <p>开局：最优 ${report.phases.opening.best} / 有更优 ${report.phases.opening.inaccuracy} / 失误 ${report.phases.opening.mistake}</p>
        <p>中局：最优 ${report.phases.middlegame.best} / 有更优 ${report.phases.middlegame.inaccuracy} / 失误 ${report.phases.middlegame.mistake}</p>
        <p>收官：最优 ${report.phases.endgame.best} / 有更优 ${report.phases.endgame.inaccuracy} / 失误 ${report.phases.endgame.mistake}</p>
        <div class="review-two-col">
          <section><h5>高频问题</h5><ul>${issueRows}</ul></section>
          <section><h5>训练建议</h5><ul>${suggestionRows}</ul></section>
        </div>
      </div>
    </details>`;

  const keypointsHtml = `
    <details class="review-section" open>
      <summary>关键节点重点复盘</summary>
      <div class="review-section-body review-key-list">
        ${keyRows}
      </div>
    </details>`;
  const stepHtml = `
    <details class="review-section" open>
      <summary>Step By Step</summary>
      <div class="review-section-body">
        <p class="review-note">用下方按钮逐手切换。当前一步的信息显示在左侧棋盘下的信息条。</p>
        <p class="review-note">建议节奏：先看一步质量和影响，再结合时间轴关键点做对照。</p>
      </div>
    </details>`;

  if (uiState.reviewPanelMode === "keypoints") return keypointsHtml;
  if (uiState.reviewPanelMode === "step") return stepHtml;
  return overviewHtml;
}

function buildReviewTimelineHtml(report, game) {
  const filter = uiState.reviewTimelineFilter || "all";
  const timeline = buildTimelineModel(report, game, filter);
  if (!timeline.marks.some((m) => m.ply === uiState.reviewTimelineActivePly)) {
    uiState.reviewTimelineActivePly = timeline.marks[0]?.ply || null;
  }
  const activeMark = timeline.marks.find((m) => m.ply === uiState.reviewTimelineActivePly) || null;
  const markerRows = timeline.marks
    .map((m) => {
      const left = timeline.total <= 1 ? 50 : ((m.ply - 1) / (timeline.total - 1)) * 100;
      const activeClass = m.ply === uiState.reviewTimelineActivePly ? " is-active" : "";
      return `<button type="button" class="timeline-mark tone-${m.tone}${activeClass}" data-review-marker="${m.ply}" style="left:${left.toFixed(
        2,
      )}%;" title="第 ${m.ply} 手 ${escapeHtml(m.notation)}"></button>`;
    })
    .join("");
  const timelinePopup = activeMark
    ? `<div class="timeline-popup">
        <p><strong>第 ${activeMark.ply} 手</strong> · ${activeMark.side === "r" ? "红方" : "黑方"} ${escapeHtml(activeMark.notation)}</p>
        <p>质量：${escapeHtml(activeMark.qualityLabel || "未评估")}</p>
        <p>影响：${escapeHtml(activeMark.impact)}</p>
        <button type="button" class="compact-btn" data-review-ply="${activeMark.ply}">跳到该手局面</button>
      </div>`
    : `<p class="review-empty">当前筛选下暂无标记点。</p>`;
  return `<div class="review-timeline-track">
      <div class="review-timeline-line"></div>
      ${markerRows}
    </div>
    ${timelinePopup}`;
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

function renderBattleRoomOptions() {
  if (!battleRoomSelect) return;
  const user = getCurrentUser();
  if (!user) {
    battleRoomSelect.innerHTML = `<option value="">请先登录</option>`;
    joinBattleBtn.disabled = true;
    return;
  }
  try {
    const rooms = searchJoinableBattles(battleRoomQueryInput?.value || "");
    if (!rooms.length) {
      battleRoomSelect.innerHTML = `<option value="">没有匹配的可加入房间</option>`;
      joinBattleBtn.disabled = true;
      return;
    }
    const currentValue = battleRoomSelect.value;
    battleRoomSelect.innerHTML = rooms
      .map(
        (room) =>
          `<option value="${room.id}">${room.name} · 创建人 ${room.creatorName} · ${battleStatusText(
            room.status,
          )} · 邀请码 ${room.code}</option>`,
      )
      .join("");
    battleRoomSelect.value = rooms.some((room) => room.id === currentValue) ? currentValue : rooms[0].id;
    joinBattleBtn.disabled = false;
  } catch (err) {
    battleRoomSelect.innerHTML = `<option value="">加载失败：${err.message}</option>`;
    joinBattleBtn.disabled = true;
  }
}

function renderBoard() {
  const user = getCurrentUser();
  if (!user || !gameState.gameId) {
    clearAiWakeTimer();
    renderCache.gameBoardKey = "";
    boardEl.innerHTML = "";
    boardStatus.textContent = "请先新建对局，或从历史对局进入回放。";
    uiState.hintCacheKey = "";
    uiState.hintCacheText = "暂无提示";
    if (hintContentEl) hintContentEl.textContent = "暂无提示";
    undoGameBtn.disabled = true;
    if (resignGameBtn) resignGameBtn.disabled = true;
    renderMoveList();
    renderReviewResult();
    renderHomeOverview();
    renderGameWorkspace();
    return;
  }
  try {
    const game = getGame(gameState.gameId);
    const targetPly = gameState.followLatest ? Number.MAX_SAFE_INTEGER : gameState.ply;
    const snap = getSnapshot(gameState.gameId, targetPly);
    gameState.ply = snap.index;
    let modeLine = `模式:${gameModeText(snap.mode)}`;
    const mySideInAi = snap.aiSide === "r" ? "b" : "r";
    if (snap.mode === "ai") {
      const mySide = snap.aiSide === "r" ? "黑方" : "红方";
      modeLine += `（你执${mySide} / 电脑${sideText(snap.aiSide)} / 难度:${
        game.aiLevel || "normal"
      }）`;
      if (snap.aiThinking) {
        const secs = Math.max(0.1, snap.aiThinkMsLeft / 1000).toFixed(1);
        modeLine += ` · 电脑思考中 ${secs}s`;
        if (snap.turn === snap.aiSide) {
          scheduleAiWake(snap.aiThinkMsLeft + 35);
        }
      }
      if (!snap.aiThinking && snap.turn !== snap.aiSide) {
        clearAiWakeTimer();
      }
    }
    const endLine =
      snap.status === "finished"
        ? `\n结果：${snap.winnerSide ? `${sideText(snap.winnerSide)}胜` : "手动结束"}`
        : "";
    const undoLine = `悔棋 ${snap.undoUsed}/${snap.undoLimit}`;
    const checkLine = snap.inCheck ? ` · ${sideText(snap.checkedSide)}被将` : "";
    const turnLine = `第${snap.index}手/共${snap.max}手 · ${snap.turn === "r" ? "红方" : "黑方"}走子${
      snap.index < snap.max ? "（回放）" : ""
    }`;
    boardStatus.textContent = `${turnLine} · ${undoLine}${checkLine}${endLine}`;
    if (gameCoreMetaEl) {
      gameCoreMetaEl.textContent = `${modeLine}\n${turnLine}\n悔棋：已用 ${snap.undoUsed}/${snap.undoLimit}，剩余 ${snap.undoRemaining}`;
    }
    if (hintContentEl) {
      const isLive = snap.index === snap.max && snap.status !== "finished";
      const canRefreshHintNow = isLive && (snap.mode !== "ai" || snap.turn === mySideInAi) && !snap.aiThinking;
      const hintKey = `${game.id}::${boardMatrixKey(snap.board)}::${snap.turn}::${game.aiLevel || "normal"}`;
      if (canRefreshHintNow && uiState.hintCacheKey !== hintKey) {
        const hint = getCurrentTurnHint(game.id, { maxPreviewPly: 5 });
        uiState.hintCacheKey = hintKey;
        uiState.hintCacheText = hint ? formatHintDetail(hint) : "当前无可用提示。";
      } else if (!canRefreshHintNow && !uiState.hintCacheText) {
        uiState.hintCacheText = "等待当前回合结束后刷新提示。";
      }
      const freezeHint = snap.mode === "ai" && snap.turn !== mySideInAi;
      if (freezeHint && uiState.hintCacheText && !uiState.hintCacheText.includes("提示已锁定")) {
        hintContentEl.textContent = `${uiState.hintCacheText}\n提示已锁定：等待电脑走棋后刷新。`;
      } else {
        hintContentEl.textContent = uiState.hintCacheText || "暂无提示";
      }
    }
    renderTrendBar(snap);
    renderRecentQueue(game, snap);
    const statusSummary = `${modeLine}\n第 ${snap.index} 手 / 共 ${snap.max} 手，${
      snap.turn === "r" ? "红方" : "黑方"
    }走子。${snap.index < snap.max ? "（回放模式）" : "（录入模式）"}${endLine}\n${undoLine}${checkLine}`;
    const boardKey = gameBoardRenderKey(snap);
    if (renderCache.gameBoardKey !== boardKey) {
      renderCache.gameBoardKey = boardKey;
      boardEl.innerHTML = "";
      for (let row = 0; row < 10; row += 1) {
        for (let col = 0; col < 9; col += 1) {
          const code = snap.board[row][col];
          const cell = document.createElement("button");
          cell.type = "button";
          cell.tabIndex = -1;
          cell.dataset.row = String(row);
          cell.dataset.col = String(col);
          cell.className = `cell ${code ? (code[0] === "r" ? "red" : "black") : "empty"}`;
          cell.style.left = pointLeftPercent(col);
          cell.style.top = pointTopPercent(row);
          if (
            gameState.selected &&
            gameState.selected[0] === row &&
            gameState.selected[1] === col
          ) {
            cell.classList.add("selected");
          }
          if (code && snap.checkedSide && code === `${snap.checkedSide}K`) {
            cell.classList.add("checked-king");
          }
          cell.textContent = code ? pieceLabel(code) : "";
          boardEl.appendChild(cell);
        }
      }
    }
    syncBoardSelection(boardEl, gameState.selected);
    syncThinkingBubble(boardEl, snap);
    maybeAnimateLatestMove("game", game.id, snap, boardEl);
    firstPlyBtn.disabled = snap.index === 0;
    prevPlyBtn.disabled = snap.index === 0;
    nextPlyBtn.disabled = snap.index === snap.max;
    lastPlyBtn.disabled = snap.index === snap.max;
    undoGameBtn.disabled = snap.max === 0 || snap.undoRemaining <= 0 || snap.index < snap.max;
    if (resignGameBtn) resignGameBtn.disabled = snap.status === "finished";
    boardStatus.dataset.fullText = statusSummary;
    enforceIosScrollLock();
  } catch (err) {
    renderCache.gameBoardKey = "";
    boardStatus.textContent = err.message;
    if (gameCoreMetaEl) gameCoreMetaEl.textContent = err.message;
    if (recentOpponentMoveEl) recentOpponentMoveEl.textContent = "--";
    if (recentSelfMoveEl) recentSelfMoveEl.textContent = "--";
    uiState.hintCacheKey = "";
    uiState.hintCacheText = "暂无提示";
    if (hintContentEl) hintContentEl.textContent = "暂无提示";
    undoGameBtn.disabled = true;
    if (resignGameBtn) resignGameBtn.disabled = true;
    enforceIosScrollLock();
    renderMoveList();
    renderReviewResult();
  }
  renderMoveList();
  renderReviewResult();
  renderHomeOverview();
  renderGameWorkspace();
}

function renderBattleBoard() {
  const user = getCurrentUser();
  if (!user || !battleState.battleId) {
    battleBoardEl.innerHTML = "";
    renderCache.battleBoardKey = "";
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
    const checkText = snap.inCheck ? `\n警告：${sideText(snap.checkedSide)}正在被将军。` : "";
    battleStatus.textContent = `房间：${battle.name}\n邀请码：${battle.code}\n我的阵营：${sideText(
      role,
    )}\n状态：${battleStatusText(snap.status)}\n第 ${snap.index} 手 / 共 ${snap.max} 手，${
      snap.turn === "r" ? "红方" : "黑方"
    }走子。${battleState.followLatest ? myTurnText : "（回放模式）"}${winnerText}${undoText}${checkText}${assessText}`;

    const boardKey = battleBoardRenderKey(snap);
    if (renderCache.battleBoardKey !== boardKey) {
      renderCache.battleBoardKey = boardKey;
      battleBoardEl.innerHTML = "";
      for (let row = 0; row < 10; row += 1) {
        for (let col = 0; col < 9; col += 1) {
          const code = snap.board[row][col];
          const cell = document.createElement("button");
          cell.type = "button";
          cell.tabIndex = -1;
          cell.dataset.row = String(row);
          cell.dataset.col = String(col);
          cell.className = `cell ${code ? (code[0] === "r" ? "red" : "black") : "empty"}`;
          cell.style.left = pointLeftPercent(col);
          cell.style.top = pointTopPercent(row);
          if (
            battleState.selected &&
            battleState.selected[0] === row &&
            battleState.selected[1] === col
          ) {
            cell.classList.add("selected");
          }
          if (code && snap.checkedSide && code === `${snap.checkedSide}K`) {
            cell.classList.add("checked-king");
          }
          cell.textContent = code ? pieceLabel(code) : "";
          battleBoardEl.appendChild(cell);
        }
      }
    }
    syncBoardSelection(battleBoardEl, battleState.selected);
    maybeAnimateLatestMove("battle", battle.id, snap, battleBoardEl);

    battleFirstPlyBtn.disabled = snap.index === 0;
    battlePrevPlyBtn.disabled = snap.index === 0;
    battleNextPlyBtn.disabled = snap.index === snap.max;
    battleLastPlyBtn.disabled = snap.index === snap.max;
    undoBattleBtn.disabled = snap.max === 0 || snap.undoRemaining <= 0 || snap.index < snap.max;
    enforceIosScrollLock();
  } catch (err) {
    renderCache.battleBoardKey = "";
    battleStatus.textContent = err.message;
    battleBoardEl.innerHTML = "";
    undoBattleBtn.disabled = true;
    enforceIosScrollLock();
  }
  renderBattleMoveList();
  renderHomeOverview();
}

function onBoardCellClick(row, col, code, snap) {
  unlockSfxFromGesture();
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
  if (fromRow === row && fromCol === col) {
    gameState.selected = null;
    renderBoard();
    return;
  }
  if (code && code[0] === snap.turn) {
    gameState.selected = [row, col];
    renderBoard();
    return;
  }
  try {
    lockIosScrollPosition(850);
    makeMove(gameState.gameId, fromRow, fromCol, row, col);
    gameState.selected = null;
    gameState.followLatest = true;
    const last = getSnapshot(gameState.gameId, Number.MAX_SAFE_INTEGER);
    gameState.ply = last.index;
    renderGameList();
    renderBoard();
    enforceIosScrollLock();
  } catch (err) {
    boardStatus.textContent = err.message;
    gameState.selected = null;
    renderBoard();
  }
}

function onBattleCellClick(row, col, code, snap, role) {
  unlockSfxFromGesture();
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
  if (fromRow === row && fromCol === col) {
    battleState.selected = null;
    renderBattleBoard();
    return;
  }
  if (code && code[0] === snap.turn) {
    if (code[0] !== role) {
      battleStatus.textContent = "你只能操作自己一方的棋子。";
      return;
    }
    battleState.selected = [row, col];
    renderBattleBoard();
    return;
  }
  try {
    lockIosScrollPosition(850);
    makeBattleMove(battleState.battleId, fromRow, fromCol, row, col);
    battleState.selected = null;
    battleState.ply = Number.MAX_SAFE_INTEGER;
    battleState.followLatest = true;
    renderBattleList();
    renderBattleBoard();
    enforceIosScrollLock();
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
  if (!user || !reviewState.gameId) {
    reviewResultEl.innerHTML = `<p class="review-empty">复盘结果：请先登录，并选择一盘已结束棋局。</p>`;
    if (reviewTimelineEl) reviewTimelineEl.innerHTML = `<p class="review-empty">时间轴：等待分析结果。</p>`;
    if (reviewStepBannerEl) reviewStepBannerEl.textContent = "当前：终局局面";
    if (reviewBoardEl) reviewBoardEl.innerHTML = "";
    if (reviewBoardStatus) reviewBoardStatus.textContent = "复盘棋盘：选择一盘已结束对局后显示。";
    if (reviewFirstPlyBtn) reviewFirstPlyBtn.disabled = true;
    if (reviewPrevPlyBtn) reviewPrevPlyBtn.disabled = true;
    if (reviewNextPlyBtn) reviewNextPlyBtn.disabled = true;
    if (reviewLastPlyBtn) reviewLastPlyBtn.disabled = true;
    renderCache.reviewBoardKey = "";
    return;
  }
  try {
    const report = analyzeGame(reviewState.gameId);
    const game = getGame(reviewState.gameId);
    const targetPly = Number.isFinite(reviewState.ply) ? reviewState.ply : Number.MAX_SAFE_INTEGER;
    const snap = getSnapshot(reviewState.gameId, targetPly);
    reviewState.ply = snap.index;
    const boardKey = reviewBoardRenderKey(snap);
    if (reviewBoardEl && renderCache.reviewBoardKey !== boardKey) {
      renderCache.reviewBoardKey = boardKey;
      reviewBoardEl.innerHTML = "";
      for (let row = 0; row < 10; row += 1) {
        for (let col = 0; col < 9; col += 1) {
          const code = snap.board[row][col];
          const cell = document.createElement("div");
          cell.className = `cell ${code ? (code[0] === "r" ? "red" : "black") : "empty"}`;
          cell.style.left = pointLeftPercent(col);
          cell.style.top = pointTopPercent(row);
          if (code && snap.checkedSide && code === `${snap.checkedSide}K`) {
            cell.classList.add("checked-king");
          }
          cell.textContent = code ? pieceLabel(code) : "";
          reviewBoardEl.appendChild(cell);
        }
      }
    }
    if (reviewBoardStatus) {
      const turnText = snap.turn === "r" ? "红方" : "黑方";
      const atText = snap.index === snap.max ? "终局快照" : `第 ${snap.index} 手局面`;
      reviewBoardStatus.textContent = `复盘棋盘：${atText}\n总手数：${snap.max} 手\n当前轮到：${turnText}\n提示：点击关键节点可跳转对应手数。`;
    }
    if (reviewTimelineEl) reviewTimelineEl.innerHTML = buildReviewTimelineHtml(report, game);
    if (reviewStepBannerEl) {
      const currentMove = snap.index > 0 ? game.moves[snap.index - 1] : null;
      const currentAssessment = currentMove?.assessment || null;
      const moveText = currentMove ? toChineseNotation(currentMove, game.snapshots[snap.index - 1] || null) : "开局";
      const qualityText = currentAssessment
        ? `${currentAssessment.qualityLabel}${currentAssessment.brilliant ? "·妙手" : ""}`
        : "未评估";
      const impactText = currentAssessment ? describeImpactFromAssessment(currentAssessment) : "局面初始化";
      reviewStepBannerEl.textContent = `第 ${snap.index}/${snap.max} 手 · ${snap.index > 0 ? moveText : "开局局面"} · 质量：${qualityText} · 影响：${impactText}`;
    }
    if (reviewFirstPlyBtn) reviewFirstPlyBtn.disabled = snap.index === 0;
    if (reviewPrevPlyBtn) reviewPrevPlyBtn.disabled = snap.index === 0;
    if (reviewNextPlyBtn) reviewNextPlyBtn.disabled = snap.index === snap.max;
    if (reviewLastPlyBtn) reviewLastPlyBtn.disabled = snap.index === snap.max;
    reviewResultEl.innerHTML = buildReviewHtml(report, game);
    updateReviewControls();
  } catch (err) {
    if (reviewTimelineEl) reviewTimelineEl.innerHTML = `<p class="review-empty">时间轴：加载失败。</p>`;
    reviewResultEl.innerHTML = `<p class="review-empty">复盘结果加载失败：${escapeHtml(err.message)}</p>`;
  }
}

function renderAll() {
  setupGameModeControls();
  renderSession();
  renderFamilyInfo();
  renderGameList();
  renderReviewGameOptions();
  renderReviewResult();
  renderBoard();
  renderBattleRoomOptions();
  renderBattleList();
  renderBattleBoard();
  renderHomeOverview();
  updateReviewControls();
  refreshIcons();
  permissionResult.textContent = "";
}

function clearAiWakeTimer() {
  if (!aiWakeTimer) return;
  clearTimeout(aiWakeTimer);
  aiWakeTimer = null;
}

function scheduleAiWake(ms) {
  clearAiWakeTimer();
  aiWakeTimer = setTimeout(() => {
    aiWakeTimer = null;
    syncAiIfNeeded({ forceRender: true });
  }, Math.max(20, ms));
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

function syncAiIfNeeded({ forceRender = false } = {}) {
  if (!gameState.gameId) return;
  const user = getCurrentUser();
  if (!user) return;
  try {
    const game = getGame(gameState.gameId);
    if (game.mode !== "ai" || game.status !== "active") {
      clearAiWakeTimer();
      return;
    }
    let movedOrThinking = false;
    let pendingThinkMs = 0;
    if (game.turn === game.aiSide) {
      const res = runAiTurnIfReady(gameState.gameId);
      if (res.resigned) {
        renderGameList();
        renderBoard();
        finalizeGameWithSavePrompt({ endReasonText: "电脑已认输。" });
        return;
      }
      movedOrThinking = Boolean(res.moved || res.aiThinking);
      if (res.aiThinking) {
        try {
          const snap = getSnapshot(gameState.gameId, Number.MAX_SAFE_INTEGER);
          pendingThinkMs = Math.max(40, snap.aiThinkMsLeft + 40);
        } catch (_err) {
          pendingThinkMs = 220;
        }
      }
    }
    if (movedOrThinking || forceRender) {
      renderGameList();
      renderBoard();
    }
    if (pendingThinkMs > 0) {
      scheduleAiWake(pendingThinkMs);
    } else {
      clearAiWakeTimer();
    }
  } catch (_err) {
    // Keep UI loop resilient.
    clearAiWakeTimer();
  }
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
    if (battleEventsSource && battleEventsSource.readyState === EventSource.OPEN) return;
    try {
      syncBattleIfNeeded();
    } catch (_err) {
      // Ignore transient sync errors and keep loop alive.
    }
  }, interval);
}

function restartAiAutoSyncLoop() {
  if (document.hidden) {
    clearAiWakeTimer();
    return;
  }
  syncAiIfNeeded({ forceRender: false });
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

function setupNavigation() {
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      activateView(btn.dataset.target || "home-card");
    });
  });
  quickGoGameBtn?.addEventListener("click", () => activateView("game-card"));
  quickGoBattleBtn?.addEventListener("click", () => activateView("battle-card"));
  quickGoReviewBtn?.addEventListener("click", () => activateView("review-card"));
  quickGoFamilyBtn?.addEventListener("click", () => activateView("family-card"));
}

toggleMoveDrawerBtn?.addEventListener("click", () => {
  uiState.showMoveDrawer = !uiState.showMoveDrawer;
  updateGamePanelVisibility(Boolean(gameState.gameId));
});

closeMoveDrawerBtn?.addEventListener("click", () => {
  uiState.showMoveDrawer = false;
  updateGamePanelVisibility(Boolean(gameState.gameId));
});

toggleHintBtn?.addEventListener("click", () => {
  uiState.showHintCard = !uiState.showHintCard;
  updateGamePanelVisibility(Boolean(gameState.gameId));
});

toggleSetupBtn?.addEventListener("click", () => {
  if (!gameState.gameId) return;
  uiState.showSetupInGame = !uiState.showSetupInGame;
  updateGamePanelVisibility(true);
});

function getCellFromEvent(event) {
  return event.target?.closest?.(".cell") || null;
}

function handleGameBoardTap(event) {
  const cell = getCellFromEvent(event);
  if (!cell) return;
  event.preventDefault?.();
  cell.blur?.();
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return;
  const snap = getLiveGameSnapshot();
  if (!snap) return;
  const code = snap.board?.[row]?.[col] || "";
  onBoardCellClick(row, col, code, snap);
}

function handleBattleBoardTap(event) {
  const cell = getCellFromEvent(event);
  if (!cell) return;
  event.preventDefault?.();
  cell.blur?.();
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return;
  const snap = getLiveBattleSnapshot();
  if (!snap || !battleState.battleId) return;
  const role = getBattleRole(battleState.battleId);
  const code = snap.board?.[row]?.[col] || "";
  onBattleCellClick(row, col, code, snap, role);
}

let lastGameTouchAt = 0;
let lastBattleTouchAt = 0;

boardEl?.addEventListener(
  "touchstart",
  (event) => {
    lastGameTouchAt = Date.now();
    handleGameBoardTap(event);
  },
  { passive: false },
);

boardEl?.addEventListener("click", (event) => {
  if (Date.now() - lastGameTouchAt < 450) return;
  handleGameBoardTap(event);
});

battleBoardEl?.addEventListener(
  "touchstart",
  (event) => {
    lastBattleTouchAt = Date.now();
    handleBattleBoardTap(event);
  },
  { passive: false },
);

battleBoardEl?.addEventListener("click", (event) => {
  if (Date.now() - lastBattleTouchAt < 450) return;
  handleBattleBoardTap(event);
});

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
    unlockSfxFromGesture();
    const game = createGame(gameNameInput.value, {
      mode: gameModeSelect.value,
      aiSide: aiSideSelect.value,
      aiLevel: aiLevelSelect.value,
    });
    gameNameInput.value = "";
    gameState.gameId = game.id;
    gameState.ply = Number.MAX_SAFE_INTEGER;
    gameState.followLatest = true;
    gameState.selected = null;
    uiState.showSetupInGame = false;
    uiState.showHintCard = false;
    uiState.showMoveDrawer = false;
    uiState.hintCacheKey = "";
    uiState.hintCacheText = "暂无提示";
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
    gameState.followLatest = true;
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
    finalizeGameWithSavePrompt({ endReasonText: "对局已结束。" });
  } catch (err) {
    alert(err.message);
  }
});

resignGameBtn?.addEventListener("click", () => {
  try {
    if (!gameState.gameId) throw new Error("请先选择一个对局");
    const yes = confirm("确认认输？");
    if (!yes) return;
    const live = getSnapshot(gameState.gameId, Number.MAX_SAFE_INTEGER);
    const resignSide =
      live.mode === "ai"
        ? live.aiSide === "r"
          ? "b"
          : "r"
        : live.turn;
    resignGame(gameState.gameId, { side: resignSide });
    renderGameList();
    renderBoard();
    finalizeGameWithSavePrompt({ endReasonText: `${sideText(resignSide)}认输。` });
  } catch (err) {
    alert(err.message);
  }
});

gameSelect.addEventListener("change", () => {
  gameState.gameId = gameSelect.value || null;
  gameState.ply = Number.MAX_SAFE_INTEGER;
  gameState.followLatest = true;
  gameState.selected = null;
  uiState.hintCacheKey = "";
  uiState.hintCacheText = "暂无提示";
  renderBoard();
  restartAiAutoSyncLoop();
});

gameModeSelect.addEventListener("change", () => {
  setupGameModeControls();
});

firstPlyBtn.addEventListener("click", () => {
  gameState.ply = 0;
  gameState.followLatest = false;
  gameState.selected = null;
  renderBoard();
});

prevPlyBtn.addEventListener("click", () => {
  gameState.ply = Math.max(0, gameState.ply - 1);
  gameState.followLatest = false;
  gameState.selected = null;
  renderBoard();
});

nextPlyBtn.addEventListener("click", () => {
  gameState.ply += 1;
  gameState.followLatest = false;
  gameState.selected = null;
  renderBoard();
});

lastPlyBtn.addEventListener("click", () => {
  gameState.ply = Number.MAX_SAFE_INTEGER;
  gameState.followLatest = true;
  gameState.selected = null;
  renderBoard();
});

analyzeGameBtn.addEventListener("click", () => {
  reviewState.ply = Number.MAX_SAFE_INTEGER;
  reviewState.focusPly = null;
  uiState.reviewTimelineActivePly = null;
  uiState.reviewPanelMode = "overview";
  uiState.reviewSetupCollapsed = true;
  renderReviewResult();
  updateReviewControls();
});

reviewToggleSetupBtn?.addEventListener("click", () => {
  uiState.reviewSetupCollapsed = !uiState.reviewSetupCollapsed;
  updateReviewControls();
});

reviewShowOverviewBtn?.addEventListener("click", () => {
  uiState.reviewPanelMode = "overview";
  renderReviewResult();
});

reviewShowKeypointsBtn?.addEventListener("click", () => {
  uiState.reviewPanelMode = "keypoints";
  renderReviewResult();
});

reviewShowAllBtn?.addEventListener("click", () => {
  uiState.reviewPanelMode = "step";
  renderReviewResult();
});

reviewFirstPlyBtn?.addEventListener("click", () => {
  reviewState.ply = 0;
  reviewState.focusPly = null;
  renderCache.reviewBoardKey = "";
  renderReviewResult();
});

reviewPrevPlyBtn?.addEventListener("click", () => {
  reviewState.ply = Math.max(0, reviewState.ply - 1);
  reviewState.focusPly = null;
  renderCache.reviewBoardKey = "";
  renderReviewResult();
});

reviewNextPlyBtn?.addEventListener("click", () => {
  reviewState.ply += 1;
  reviewState.focusPly = null;
  renderCache.reviewBoardKey = "";
  renderReviewResult();
});

reviewLastPlyBtn?.addEventListener("click", () => {
  reviewState.ply = Number.MAX_SAFE_INTEGER;
  reviewState.focusPly = null;
  renderCache.reviewBoardKey = "";
  renderReviewResult();
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
    restartAiAutoSyncLoop();
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

battleRoomQueryInput?.addEventListener("input", () => {
  renderBattleRoomOptions();
});

joinBattleBtn.addEventListener("click", () => {
  try {
    const selectedBattleId = battleRoomSelect?.value || "";
    if (!selectedBattleId) throw new Error("请先从列表里选择一个房间");
    const battle = joinBattleById(selectedBattleId);
    battleState.battleId = battle.id;
    battleState.ply = Number.MAX_SAFE_INTEGER;
    battleState.selected = null;
    battleState.followLatest = true;
    renderAll();
    restartAiAutoSyncLoop();
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

reviewGameSelect?.addEventListener("change", () => {
  reviewState.gameId = reviewGameSelect.value || null;
  reviewState.ply = Number.MAX_SAFE_INTEGER;
  reviewState.focusPly = null;
  uiState.reviewTimelineActivePly = null;
  uiState.reviewPanelMode = "overview";
  uiState.reviewSetupCollapsed = false;
  renderCache.reviewBoardKey = "";
  renderReviewResult();
  updateReviewControls();
});

reviewResultEl?.addEventListener("click", (event) => {
  const filterBtn = event.target?.closest?.("[data-review-filter]");
  if (filterBtn) {
    const filter = String(filterBtn.dataset.reviewFilter || "all");
    uiState.reviewTimelineFilter = ["all", "best", "inaccuracy", "mistake", "risk"].includes(filter)
      ? filter
      : "all";
    uiState.reviewTimelineActivePly = null;
    renderReviewResult();
    return;
  }
  const markerBtn = event.target?.closest?.("[data-review-marker]");
  if (markerBtn) {
    const ply = Number(markerBtn.dataset.reviewMarker || "");
    if (!Number.isInteger(ply) || ply <= 0) return;
    uiState.reviewTimelineActivePly = ply;
    renderReviewResult();
    return;
  }
  const btn = event.target?.closest?.("[data-review-ply]");
  if (!btn) return;
  const ply = Number(btn.dataset.reviewPly || "");
  if (!Number.isInteger(ply) || ply <= 0) return;
  reviewState.ply = ply;
  reviewState.focusPly = ply;
  uiState.reviewTimelineActivePly = ply;
  renderCache.reviewBoardKey = "";
  renderReviewResult();
});

reviewTimelineEl?.addEventListener("click", (event) => {
  const markerBtn = event.target?.closest?.("[data-review-marker]");
  if (markerBtn) {
    const ply = Number(markerBtn.dataset.reviewMarker || "");
    if (!Number.isInteger(ply) || ply <= 0) return;
    uiState.reviewTimelineActivePly = ply;
    renderReviewResult();
    return;
  }
  const jumpBtn = event.target?.closest?.("[data-review-ply]");
  if (!jumpBtn) return;
  const ply = Number(jumpBtn.dataset.reviewPly || "");
  if (!Number.isInteger(ply) || ply <= 0) return;
  reviewState.ply = ply;
  reviewState.focusPly = ply;
  uiState.reviewTimelineActivePly = ply;
  renderCache.reviewBoardKey = "";
  renderReviewResult();
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
  restartAiAutoSyncLoop();
  restartBattleAutoSyncLoop();
  if (!battleEventsSource || battleEventsSource.readyState === EventSource.CLOSED) {
    restartBattleRealtimeChannel();
  }
  if (!document.hidden) {
    syncAiIfNeeded({ forceRender: true });
    syncBattleIfNeeded();
  }
});

window.addEventListener("focus", () => {
  syncAiIfNeeded({ forceRender: true });
  syncBattleIfNeeded();
});

const unlockEvents = ["pointerdown", "touchstart", "mousedown", "keydown", "click"];
unlockEvents.forEach((evt) => {
  document.addEventListener(
    evt,
    () => {
      unlockSfxFromGesture();
    },
    { passive: true },
  );
});

window.addEventListener("pageshow", () => {
  if (sfxAudioCtx && sfxAudioCtx.state === "suspended") {
    sfxAudioCtx.resume().catch(() => {});
  }
  refreshSfxStatus();
});

setupGameModeControls();
setupNavigation();
if (IOS_SAFARI) {
  document.body.classList.add("ios-safari-perf");
}
mountHintCardNearHud();
renderAll();
activateView(window.location.hash?.slice(1) || "home-card", { updateHash: false });
restartAiAutoSyncLoop();
restartBattleAutoSyncLoop();
restartBattleRealtimeChannel();
refreshSfxStatus();
