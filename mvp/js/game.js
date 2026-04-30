import { loadDb, saveDb, nextId } from "./store.js";

function requireCurrentUser() {
  const db = loadDb();
  const userId = db.sessions.currentUserId;
  if (!userId) throw new Error("请先登录");
  return { db, userId };
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function createEmptyBoard() {
  return Array.from({ length: 10 }, () => Array(9).fill(""));
}

export function createInitialBoard() {
  const board = createEmptyBoard();
  // Black side
  board[0] = ["bR", "bN", "bB", "bA", "bK", "bA", "bB", "bN", "bR"];
  board[2][1] = "bC";
  board[2][7] = "bC";
  board[3][0] = "bP";
  board[3][2] = "bP";
  board[3][4] = "bP";
  board[3][6] = "bP";
  board[3][8] = "bP";

  // Red side
  board[9] = ["rR", "rN", "rB", "rA", "rK", "rA", "rB", "rN", "rR"];
  board[7][1] = "rC";
  board[7][7] = "rC";
  board[6][0] = "rP";
  board[6][2] = "rP";
  board[6][4] = "rP";
  board[6][6] = "rP";
  board[6][8] = "rP";
  return board;
}

export function createBoardFromPieces(pieces) {
  const board = createEmptyBoard();
  for (const item of pieces || []) {
    if (!item) continue;
    const { row, col, code } = item;
    if (!inBoard(row, col)) throw new Error(`棋子坐标非法: (${row}, ${col})`);
    if (!code || typeof code !== "string") throw new Error("棋子编码非法");
    board[row][col] = code;
  }
  return board;
}

export function pieceLabel(code) {
  const map = {
    rK: "帅",
    rA: "仕",
    rB: "相",
    rN: "马",
    rR: "车",
    rC: "炮",
    rP: "兵",
    bK: "将",
    bA: "士",
    bB: "象",
    bN: "马",
    bR: "车",
    bC: "砲",
    bP: "卒",
  };
  return map[code] || "";
}

function fileNumber(col, side) {
  // Red: from its right to left, screen left->right is 9..1.
  // Black: screen left->right is 1..9.
  return side === "r" ? 9 - col : col + 1;
}

function numeralBySide(side, n) {
  if (side === "r") {
    const cjk = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
    return cjk[n] || String(n);
  }
  return String(n);
}

function actionWord(side, fromRow, toRow, fromCol, toCol) {
  if (fromRow === toRow) return "平";
  const forward = side === "r" ? toRow < fromRow : toRow > fromRow;
  return forward ? "进" : "退";
}

function notationPieceChar(code) {
  const map = {
    rR: "车",
    rN: "马",
    rB: "相",
    rA: "仕",
    rK: "帅",
    rC: "炮",
    rP: "兵",
    bR: "车",
    bN: "马",
    bB: "象",
    bA: "士",
    bK: "将",
    bC: "砲",
    bP: "卒",
  };
  return map[code] || "";
}

function moveDestinationText(code, fromRow, toRow, fromCol, toCol) {
  const side = code[0];
  const type = code[1];
  const act = actionWord(side, fromRow, toRow, fromCol, toCol);
  if (act === "平") return numeralBySide(side, fileNumber(toCol, side));
  const useFileTarget = type === "N" || type === "B" || type === "A";
  if (useFileTarget) return numeralBySide(side, fileNumber(toCol, side));
  return numeralBySide(side, Math.abs(toRow - fromRow));
}

function sideForwardOrder(side, rowA, rowB) {
  // Front piece is closer to enemy side.
  // Red enemy is upward (smaller row), black enemy is downward (larger row).
  return side === "r" ? rowA - rowB : rowB - rowA;
}

function sameFileSameTypePieces(board, piece, col) {
  const side = piece[0];
  const type = piece[1];
  const result = [];
  for (let r = 0; r < 10; r += 1) {
    const p = board[r][col];
    if (p && p[0] === side && p[1] === type) {
      result.push([r, col]);
    }
  }
  return result.sort((a, b) => sideForwardOrder(side, a[0], b[0]));
}

function frontMiddleBackLabel(index, total) {
  if (total <= 1) return "";
  if (total === 2) return index === 0 ? "前" : "后";
  if (total === 3) return ["前", "中", "后"][index] || "";
  if (total === 4) return ["前", "二", "三", "后"][index] || "";
  // 5 pawns max in Xiangqi
  return ["前", "二", "三", "四", "后"][index] || "";
}

function notationSubject(piece, fromRow, fromCol, boardBefore) {
  const type = piece[1];
  const pieceChar = notationPieceChar(piece);
  if (!boardBefore) {
    return {
      subject: `${pieceChar}${numeralBySide(piece[0], fileNumber(fromCol, piece[0]))}`,
      usedDisambiguation: false,
    };
  }
  // In common Xiangqi notation, advisor/elephant are usually clear by move pattern.
  if (type === "A" || type === "B") {
    return {
      subject: `${pieceChar}${numeralBySide(piece[0], fileNumber(fromCol, piece[0]))}`,
      usedDisambiguation: false,
    };
  }
  const sameFilePieces = sameFileSameTypePieces(boardBefore, piece, fromCol);
  if (sameFilePieces.length <= 1) {
    return {
      subject: `${pieceChar}${numeralBySide(piece[0], fileNumber(fromCol, piece[0]))}`,
      usedDisambiguation: false,
    };
  }
  const idx = sameFilePieces.findIndex((x) => x[0] === fromRow && x[1] === fromCol);
  const posLabel = frontMiddleBackLabel(idx, sameFilePieces.length);
  if (!posLabel) {
    return {
      subject: `${pieceChar}${numeralBySide(piece[0], fileNumber(fromCol, piece[0]))}`,
      usedDisambiguation: false,
    };
  }
  return {
    subject: `${posLabel}${pieceChar}`,
    usedDisambiguation: true,
  };
}

export function toChineseNotation(move, boardBefore = null) {
  const { from, to, piece } = move;
  const [fr, fc] = from;
  const [tr, tc] = to;
  const side = piece[0];
  const subjectInfo = notationSubject(piece, fr, fc, boardBefore);
  const part1 = subjectInfo.subject;
  const part3 = actionWord(side, fr, tr, fc, tc);
  const part4 = moveDestinationText(piece, fr, tr, fc, tc);
  return `${part1}${part3}${part4}`;
}

export function buildRawMove(board, fromRow, fromCol, toRow, toCol) {
  const piece = board?.[fromRow]?.[fromCol];
  if (!piece) throw new Error("起点没有棋子");
  return {
    from: [fromRow, fromCol],
    to: [toRow, toCol],
    piece,
    captured: board?.[toRow]?.[toCol] || "",
  };
}

export function assessMoveForRegression(
  boardBefore,
  rawMove,
  { side = rawMove?.piece?.[0], evalDepth = 2, externalBestMove = null } = {},
) {
  if (!side) throw new Error("缺少走棋方 side");
  const assessment = assessMove(
    cloneBoard(boardBefore),
    rawMove,
    side,
    evalDepth,
    null,
    externalBestMove ? { move: externalBestMove } : null,
  );
  return {
    ...assessment,
    riskMaterialLossLabel: RISK_MATERIAL_LOSS,
  };
}

function inBoard(row, col) {
  return row >= 0 && row < 10 && col >= 0 && col < 9;
}

function inPalace(side, row, col) {
  const inCols = col >= 3 && col <= 5;
  if (!inCols) return false;
  if (side === "r") return row >= 7 && row <= 9;
  return row >= 0 && row <= 2;
}

function countBetween(board, fromRow, fromCol, toRow, toCol) {
  if (fromRow !== toRow && fromCol !== toCol) return -1;
  let count = 0;
  if (fromRow === toRow) {
    const step = fromCol < toCol ? 1 : -1;
    for (let c = fromCol + step; c !== toCol; c += step) {
      if (board[fromRow][c]) count += 1;
    }
    return count;
  }
  const step = fromRow < toRow ? 1 : -1;
  for (let r = fromRow + step; r !== toRow; r += step) {
    if (board[r][fromCol]) count += 1;
  }
  return count;
}

function findGeneral(board, side) {
  for (let r = 0; r < 10; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c] === `${side}K`) return [r, c];
    }
  }
  return null;
}

function canPieceMoveBasic(board, fromRow, fromCol, toRow, toCol, piece) {
  if (!inBoard(fromRow, fromCol) || !inBoard(toRow, toCol)) return false;
  const side = piece[0];
  const type = piece[1];
  const target = board[toRow][toCol];
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;
  const adr = Math.abs(dr);
  const adc = Math.abs(dc);

  switch (type) {
    case "R": {
      if (fromRow !== toRow && fromCol !== toCol) return false;
      return countBetween(board, fromRow, fromCol, toRow, toCol) === 0;
    }
    case "C": {
      if (fromRow !== toRow && fromCol !== toCol) return false;
      const between = countBetween(board, fromRow, fromCol, toRow, toCol);
      if (target) return between === 1;
      return between === 0;
    }
    case "N": {
      if (!((adr === 2 && adc === 1) || (adr === 1 && adc === 2))) return false;
      const legRow = adr === 2 ? fromRow + dr / 2 : fromRow;
      const legCol = adc === 2 ? fromCol + dc / 2 : fromCol;
      return !board[legRow][legCol];
    }
    case "B": {
      if (!(adr === 2 && adc === 2)) return false;
      if (side === "r" && toRow <= 4) return false;
      if (side === "b" && toRow >= 5) return false;
      const eyeRow = fromRow + dr / 2;
      const eyeCol = fromCol + dc / 2;
      return !board[eyeRow][eyeCol];
    }
    case "A": {
      if (!(adr === 1 && adc === 1)) return false;
      return inPalace(side, toRow, toCol);
    }
    case "K": {
      // Flying general capture.
      if (target && target === `${side === "r" ? "b" : "r"}K` && fromCol === toCol) {
        return countBetween(board, fromRow, fromCol, toRow, toCol) === 0;
      }
      if (adr + adc !== 1) return false;
      return inPalace(side, toRow, toCol);
    }
    case "P": {
      const crossed = side === "r" ? fromRow <= 4 : fromRow >= 5;
      if (side === "r") {
        if (dr === -1 && dc === 0) return true;
        if (crossed && dr === 0 && adc === 1) return true;
        return false;
      }
      if (dr === 1 && dc === 0) return true;
      if (crossed && dr === 0 && adc === 1) return true;
      return false;
    }
    default:
      return false;
  }
}

function applyMove(board, fromRow, fromCol, toRow, toCol) {
  const next = cloneBoard(board);
  next[toRow][toCol] = next[fromRow][fromCol];
  next[fromRow][fromCol] = "";
  return next;
}

function isInCheck(board, side) {
  const general = findGeneral(board, side);
  if (!general) return true;
  const [gRow, gCol] = general;
  const enemy = side === "r" ? "b" : "r";
  for (let r = 0; r < 10; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const piece = board[r][c];
      if (!piece || piece[0] !== enemy) continue;
      if (canPieceMoveBasic(board, r, c, gRow, gCol, piece)) return true;
    }
  }
  return false;
}

function validateMoveOrThrow(board, fromRow, fromCol, toRow, toCol, turn) {
  if (!inBoard(fromRow, fromCol) || !inBoard(toRow, toCol)) {
    throw new Error("坐标超出棋盘范围");
  }
  if (fromRow === toRow && fromCol === toCol) {
    throw new Error("起点终点不能相同");
  }

  const fromPiece = board[fromRow][fromCol];
  const toPiece = board[toRow][toCol];
  if (!fromPiece) throw new Error("起点没有棋子");
  if (fromPiece[0] !== turn) throw new Error("未轮到该方走子");
  if (toPiece && toPiece[0] === fromPiece[0]) throw new Error("不能吃己方棋子");
  if (!canPieceMoveBasic(board, fromRow, fromCol, toRow, toCol, fromPiece)) {
    throw new Error("该步不符合此棋子走法");
  }

  const after = applyMove(board, fromRow, fromCol, toRow, toCol);
  if (isInCheck(after, turn)) {
    throw new Error("该步会导致己方将/帅被将军");
  }
}

function pieceValue(piece) {
  const type = piece?.[1];
  const values = {
    K: 1000,
    R: 9,
    N: 4,
    C: 4,
    B: 2,
    A: 2,
    P: 1,
  };
  return values[type] || 0;
}

function countSideByType(board, side) {
  const counts = { K: 0, R: 0, N: 0, C: 0, B: 0, A: 0, P: 0 };
  for (let r = 0; r < 10; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const p = board[r][c];
      if (!p || p[0] !== side) continue;
      counts[p[1]] = (counts[p[1]] || 0) + 1;
    }
  }
  return counts;
}

function countBoardPieces(board) {
  let n = 0;
  for (let r = 0; r < 10; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c]) n += 1;
    }
  }
  return n;
}

function contextualPieceValue(
  board,
  piece,
  row,
  col,
  sideCounts = null,
  enemyCounts = null,
  totalPieces = null,
) {
  if (!piece) return 0;
  const side = piece[0];
  const enemy = oppositeSide(side);
  const me = sideCounts || countSideByType(board, side);
  const opp = enemyCounts || countSideByType(board, enemy);
  const pieces = Number.isFinite(totalPieces) ? totalPieces : countBoardPieces(board);
  const type = piece[1];
  let value = pieceValue(piece);

  if (type === "P") {
    const crossed = side === "r" ? row <= 4 : row >= 5;
    const adv = side === "r" ? 9 - row : row;
    value += crossed ? 0.85 : 0.05;
    if (crossed) value += Math.max(0, (adv - 5) * 0.1);
    return value;
  }

  if (type === "R") {
    if (pieces <= 14) value += 0.35;
    return value;
  }

  if (type === "N") {
    if (pieces <= 14) value += 0.25;
    return value;
  }

  if (type === "C") {
    if (pieces >= 24) value += 0.2;
    if (pieces <= 14) value -= 0.25;
    if (me.R === 0 && opp.R > 0) value += 0.35;
    if (me.C <= 1 && opp.R >= 2) value += 0.25;
    if ((me.A + me.B) === 0) value -= 0.2;
    return value;
  }

  if (type === "A") {
    if (opp.R >= 2) value += 0.2;
    return value;
  }

  if (type === "B") {
    if (opp.C >= 2) value += 0.2;
    return value;
  }

  return value;
}

const AI_LEVELS = {
  beginner: {
    id: "beginner",
    label: "入门",
    thinkDepth: 1,
    evalDepth: 1,
    randomness: 0.45,
    topPool: 4,
  },
  normal: {
    id: "normal",
    label: "标准",
    thinkDepth: 2,
    evalDepth: 2,
    randomness: 0.2,
    topPool: 2,
  },
  hard: {
    id: "hard",
    label: "进阶",
    thinkDepth: 2,
    evalDepth: 3,
    randomness: 0.05,
    topPool: 1,
  },
};
const ASSESSMENT_ENGINE_VERSION = "xqwlight-v3";
const RISK_MATERIAL_LOSS = "落点净亏风险";
const RISK_THREE_PLY = "三步预演存在战术亏损";
const UNDO_LIMIT_PER_USER = 3;
const AI_THINK_MAX_MS = 15000;

export function getAssessmentRiskLabels() {
  return {
    materialLoss: RISK_MATERIAL_LOSS,
    checkThreat: "下一步可能被将",
    threePlyLoss: RISK_THREE_PLY,
  };
}

function oppositeSide(side) {
  return side === "r" ? "b" : "r";
}

function getUndoUsed(owner, userId) {
  const map = owner?.undoUsedByUser || {};
  return Number(map[userId] || 0);
}

function getUndoRemaining(owner, userId) {
  return Math.max(0, UNDO_LIMIT_PER_USER - getUndoUsed(owner, userId));
}

function bumpUndoUsed(owner, userId) {
  if (!owner.undoUsedByUser || typeof owner.undoUsedByUser !== "object") {
    owner.undoUsedByUser = {};
  }
  owner.undoUsedByUser[userId] = getUndoUsed(owner, userId) + 1;
}

function trimOwnerMoves(owner, keepMoveCount) {
  const keep = Math.max(0, Math.min(keepMoveCount, owner.moves.length));
  owner.moves = owner.moves.slice(0, keep);
  owner.snapshots = owner.snapshots.slice(0, keep + 1);
}

function getAiLevelConfig(levelId) {
  return AI_LEVELS[levelId] || AI_LEVELS.normal;
}

export function getAiLevels() {
  return Object.values(AI_LEVELS).map((x) => ({ ...x }));
}

function hasXqwlightEngine() {
  return typeof globalThis.Position === "function" && typeof globalThis.Search === "function";
}

function codeToFenChar(code) {
  const map = {
    rK: "K",
    rA: "A",
    rB: "B",
    rN: "N",
    rR: "R",
    rC: "C",
    rP: "P",
    bK: "k",
    bA: "a",
    bB: "b",
    bN: "n",
    bR: "r",
    bC: "c",
    bP: "p",
  };
  return map[code] || "";
}

function boardToFen(board, sideToMove) {
  const rows = [];
  for (let r = 0; r < 10; r += 1) {
    let row = "";
    let empty = 0;
    for (let c = 0; c < 9; c += 1) {
      const code = board[r][c];
      if (!code) {
        empty += 1;
        continue;
      }
      if (empty > 0) {
        row += String(empty);
        empty = 0;
      }
      row += codeToFenChar(code);
    }
    if (empty > 0) row += String(empty);
    rows.push(row);
  }
  return `${rows.join("/")} ${sideToMove === "r" ? "w" : "b"}`;
}

function decodeXqwlightMove(mv) {
  const src = mv & 255;
  const dst = mv >> 8;
  const fromRow = (src >> 4) - 3;
  const fromCol = (src & 15) - 3;
  const toRow = (dst >> 4) - 3;
  const toCol = (dst & 15) - 3;
  if (!inBoard(fromRow, fromCol) || !inBoard(toRow, toCol)) return null;
  return { fromRow, fromCol, toRow, toCol };
}

function xqwlightSearchProfile(levelId, forAssessment = false) {
  if (forAssessment) {
    if (levelId === "hard") return { depth: 3, millis: 220, hashLevel: 15 };
    if (levelId === "beginner") return { depth: 2, millis: 70, hashLevel: 14 };
    return { depth: 2, millis: 120, hashLevel: 15 };
  }
  if (levelId === "hard") return { depth: 4, millis: 500, hashLevel: 16 };
  if (levelId === "beginner") return { depth: 2, millis: 100, hashLevel: 14 };
  return { depth: 3, millis: 250, hashLevel: 15 };
}

function xqwlightFindBestMove(board, side, levelId, forAssessment = false) {
  if (!hasXqwlightEngine()) return null;
  try {
    const fen = boardToFen(board, side);
    const pos = new globalThis.Position();
    pos.fromFen(fen);
    const profile = xqwlightSearchProfile(levelId, forAssessment);
    const search = new globalThis.Search(pos, profile.hashLevel);
    const mv = search.searchMain(profile.depth, profile.millis);
    if (!mv) return null;
    const decoded = decodeXqwlightMove(mv);
    if (!decoded) return null;
    const piece = board[decoded.fromRow]?.[decoded.fromCol];
    if (!piece || piece[0] !== side) return null;
    return {
      from: [decoded.fromRow, decoded.fromCol],
      to: [decoded.toRow, decoded.toCol],
      piece,
      captured: board[decoded.toRow]?.[decoded.toCol] || "",
    };
  } catch (_err) {
    return null;
  }
}

function evaluateBoardForSide(board, side) {
  const enemy = oppositeSide(side);
  const totalPieces = countBoardPieces(board);
  const rCounts = countSideByType(board, "r");
  const bCounts = countSideByType(board, "b");
  let score = 0;
  for (let r = 0; r < 10; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const p = board[r][c];
      if (!p) continue;
      const sideCounts = p[0] === "r" ? rCounts : bCounts;
      const enemyCounts = p[0] === "r" ? bCounts : rCounts;
      const v = contextualPieceValue(board, p, r, c, sideCounts, enemyCounts, totalPieces);
      score += p[0] === side ? v : -v;
    }
  }
  if (isInCheck(board, side)) score -= 1.2;
  if (isInCheck(board, enemy)) score += 1.2;
  return score;
}

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function evaluateTrendForRed(board) {
  if (!Array.isArray(board) || board.length !== 10) return 0;
  const base = evaluateBoardForSide(board, "r");
  const redMobility = generateLegalMoves(board, "r").length;
  const blackMobility = generateLegalMoves(board, "b").length;
  const mobility = clampValue((redMobility - blackMobility) / 26, -1.2, 1.2);
  let kingPressure = 0;
  if (isInCheck(board, "r")) kingPressure -= 1.4;
  if (isInCheck(board, "b")) kingPressure += 1.4;
  if (canGiveCheckInOne(board, "r", "b")) kingPressure += 0.55;
  if (canGiveCheckInOne(board, "b", "r")) kingPressure -= 0.55;
  const totalPieces = countBoardPieces(board);
  const phaseScale = totalPieces > 24 ? 0.92 : totalPieces > 14 ? 1.0 : 1.08;
  const score = base * phaseScale + mobility + kingPressure;
  return Number(score.toFixed(2));
}

function moveOrderHeuristic(move) {
  const capturedV = pieceValue(move.captured || "");
  const pieceV = pieceValue(move.piece || "");
  const [toRow, toCol] = move.to;
  const centerDist = Math.abs(toCol - 4) + Math.abs(toRow - 4.5);
  return capturedV * 10 - pieceV * 0.2 - centerDist * 0.1;
}

function generateLegalMoves(board, turn) {
  const moves = [];
  for (let fr = 0; fr < 10; fr += 1) {
    for (let fc = 0; fc < 9; fc += 1) {
      const fromPiece = board[fr][fc];
      if (!fromPiece || fromPiece[0] !== turn) continue;
      for (let tr = 0; tr < 10; tr += 1) {
        for (let tc = 0; tc < 9; tc += 1) {
          try {
            validateMoveOrThrow(board, fr, fc, tr, tc, turn);
            moves.push({
              from: [fr, fc],
              to: [tr, tc],
              piece: fromPiece,
              captured: board[tr][tc] || "",
            });
          } catch (_err) {
            // ignore illegal candidates
          }
        }
      }
    }
  }
  moves.sort((a, b) => moveOrderHeuristic(b) - moveOrderHeuristic(a));
  return moves;
}

function sameMove(a, b) {
  return (
    a &&
    b &&
    a.from[0] === b.from[0] &&
    a.from[1] === b.from[1] &&
    a.to[0] === b.to[0] &&
    a.to[1] === b.to[1]
  );
}

function negamax(board, turn, depth, alpha, beta) {
  if (depth <= 0) return evaluateBoardForSide(board, turn);
  const legalMoves = generateLegalMoves(board, turn);
  if (!legalMoves.length) {
    return isInCheck(board, turn) ? -9999 - depth : 0;
  }
  let best = -Infinity;
  for (const mv of legalMoves) {
    const after = applyMove(board, mv.from[0], mv.from[1], mv.to[0], mv.to[1]);
    const score = -negamax(after, oppositeSide(turn), depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function rankMoves(board, turn, depth) {
  const legalMoves = generateLegalMoves(board, turn);
  if (!legalMoves.length) return [];
  const effectiveDepth = Math.max(1, Math.min(3, depth || 1));
  const scored = legalMoves.map((mv) => {
    const after = applyMove(board, mv.from[0], mv.from[1], mv.to[0], mv.to[1]);
    const score = -negamax(after, oppositeSide(turn), effectiveDepth - 1, -Infinity, Infinity);
    return { move: mv, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function legalCapturesToSquare(board, row, col, bySide) {
  const target = board[row][col];
  if (!target || target[0] === bySide) return [];
  const captures = [];
  for (let fr = 0; fr < 10; fr += 1) {
    for (let fc = 0; fc < 9; fc += 1) {
      const p = board[fr][fc];
      if (!p || p[0] !== bySide) continue;
      try {
        validateMoveOrThrow(board, fr, fc, row, col, bySide);
        captures.push({
          from: [fr, fc],
          to: [row, col],
          piece: p,
          captured: target,
        });
      } catch (_err) {
        // continue
      }
    }
  }
  return captures;
}

function canGiveCheckInOne(board, attackerSide, defenderSide) {
  const moves = generateLegalMoves(board, attackerSide);
  for (const mv of moves) {
    const after = applyMove(board, mv.from[0], mv.from[1], mv.to[0], mv.to[1]);
    if (isInCheck(after, defenderSide)) return true;
  }
  return false;
}

function classifyGap(gap) {
  if (gap <= 0.35) return { key: "best", label: "最优" };
  if (gap <= 1.5) return { key: "good", label: "可行" };
  if (gap <= 3.6) return { key: "inaccuracy", label: "有更优" };
  return { key: "mistake", label: "失误" };
}

function shouldDownrankOpeningMistake(boardBefore, boardAfter, rawMove, side) {
  if (!rawMove || rawMove.captured) return false;
  if (countBoardPieces(boardBefore) < 30) return false;
  if (isInCheck(boardBefore, side)) return false;
  if (isInCheck(boardAfter, side)) return false;
  // Keep opening labels conservative when no tactical events happened yet.
  return true;
}

function isLegalMove(board, move, side) {
  if (!move) return false;
  try {
    validateMoveOrThrow(
      board,
      move.from[0],
      move.from[1],
      move.to[0],
      move.to[1],
      side,
    );
    return true;
  } catch (_err) {
    return false;
  }
}

function findScoreInRanked(scoredMoves, move) {
  const hit = scoredMoves.find((x) => sameMove(x.move, move));
  return hit ? hit.score : null;
}

function scoreMoveByFallback(boardBefore, move, side, evalDepth, preRanked = null) {
  if (!move || !isLegalMove(boardBefore, move, side)) return -Infinity;
  const scoredMoves = preRanked || rankMoves(boardBefore, side, evalDepth);
  const fromRanked = findScoreInRanked(scoredMoves, move);
  if (typeof fromRanked === "number") return fromRanked;
  const effectiveDepth = Math.max(1, Math.min(3, evalDepth || 1));
  const boardAfter = applyMove(
    boardBefore,
    move.from[0],
    move.from[1],
    move.to[0],
    move.to[1],
  );
  return -negamax(boardAfter, oppositeSide(side), effectiveDepth - 1, -Infinity, Infinity);
}

function bestRecaptureValue(boardAfterEnemyCapture, row, col, side) {
  const recaptures = legalCapturesToSquare(boardAfterEnemyCapture, row, col, side);
  if (!recaptures.length) return 0;
  let best = 0;
  for (const mv of recaptures) {
    const gain = contextualPieceValue(
      boardAfterEnemyCapture,
      mv.captured || "",
      mv.to[0],
      mv.to[1],
    );
    if (gain > best) best = gain;
  }
  return best;
}

function estimateImmediateNetLoss(boardAfter, row, col, side, gainedMaterial = 0) {
  const target = boardAfter[row]?.[col];
  if (!target || target[0] !== side) return 0;
  const enemy = oppositeSide(side);
  const enemyCaptures = legalCapturesToSquare(boardAfter, row, col, enemy);
  if (!enemyCaptures.length) return 0;
  const selfValue = contextualPieceValue(boardAfter, target, row, col);
  let worstLoss = 0;
  for (const cap of enemyCaptures) {
    const boardAfterEnemyCapture = applyMove(
      boardAfter,
      cap.from[0],
      cap.from[1],
      cap.to[0],
      cap.to[1],
    );
    const recaptureValue = bestRecaptureValue(boardAfterEnemyCapture, row, col, side);
    const netLoss = Math.max(0, selfValue - recaptureValue - gainedMaterial);
    if (netLoss > worstLoss) worstLoss = netLoss;
  }
  return worstLoss;
}

function pickBestForecastMove(board, side, levelId = "normal") {
  const external = xqwlightFindBestMove(board, side, levelId, true);
  if (external && isLegalMove(board, external, side)) return external;
  const levelCfg = getAiLevelConfig(levelId);
  const ranked = rankMoves(board, side, Math.max(2, levelCfg.evalDepth || 2));
  return ranked[0]?.move || null;
}

function moveNotationSafe(move, boardBefore) {
  if (!move) return "";
  try {
    return toChineseNotation(move, boardBefore);
  } catch (_err) {
    return "";
  }
}

function forecastThreePly(boardBefore, rawMove, side) {
  const boardAfterMyMove = applyMove(
    boardBefore,
    rawMove.from[0],
    rawMove.from[1],
    rawMove.to[0],
    rawMove.to[1],
  );
  const enemy = oppositeSide(side);
  const enemyMove1 = pickBestForecastMove(boardAfterMyMove, enemy, "normal");
  if (!enemyMove1) {
    return {
      line: [],
      netSwing: 0,
      movedPieceCaptured: false,
      capturePly: 0,
    };
  }
  const boardAfterEnemy1 = applyMove(
    boardAfterMyMove,
    enemyMove1.from[0],
    enemyMove1.from[1],
    enemyMove1.to[0],
    enemyMove1.to[1],
  );
  const myMove2 = pickBestForecastMove(boardAfterEnemy1, side, "normal");
  const boardAfterMy2 = myMove2
    ? applyMove(boardAfterEnemy1, myMove2.from[0], myMove2.from[1], myMove2.to[0], myMove2.to[1])
    : boardAfterEnemy1;
  const enemyMove3 = pickBestForecastMove(boardAfterMy2, enemy, "normal");
  const boardAfterEnemy3 = enemyMove3
    ? applyMove(
        boardAfterMy2,
        enemyMove3.from[0],
        enemyMove3.from[1],
        enemyMove3.to[0],
        enemyMove3.to[1],
      )
    : boardAfterMy2;

  const movedPieceCapturedPly1 =
    enemyMove1.to[0] === rawMove.to[0] &&
    enemyMove1.to[1] === rawMove.to[1] &&
    enemyMove1.captured === rawMove.piece;
  const movedPieceCapturedPly3 = Boolean(
    !movedPieceCapturedPly1 &&
      myMove2 &&
      enemyMove3 &&
      enemyMove3.to[0] === myMove2.to[0] &&
      enemyMove3.to[1] === myMove2.to[1] &&
      enemyMove3.captured === myMove2.piece,
  );
  const movedPieceCaptured = movedPieceCapturedPly1 || movedPieceCapturedPly3;
  const capturePly = movedPieceCapturedPly1 ? 1 : movedPieceCapturedPly3 ? 3 : 0;
  const beforeEval = evaluateBoardForSide(boardBefore, side);
  const afterEval = evaluateBoardForSide(boardAfterEnemy3, side);
  const netSwing = Number((afterEval - beforeEval).toFixed(2));
  const line = [
    moveNotationSafe(enemyMove1, boardAfterMyMove),
    moveNotationSafe(myMove2, boardAfterEnemy1),
    moveNotationSafe(enemyMove3, boardAfterMy2),
  ].filter(Boolean);

  return {
    line,
    netSwing,
    movedPieceCaptured,
    capturePly,
  };
}

function forecastFlexibleLine(boardBefore, firstMove, side, levelId = "normal", maxPreviewPly = 5) {
  const limit = Math.max(2, Math.min(5, Number(maxPreviewPly) || 5));
  const enemy = oppositeSide(side);
  const line = [];
  let board = applyMove(
    boardBefore,
    firstMove.from[0],
    firstMove.from[1],
    firstMove.to[0],
    firstMove.to[1],
  );
  const beforeEval = evaluateBoardForSide(boardBefore, side);
  let movedPieceCaptured = false;
  let capturePly = 0;
  line.push(moveNotationSafe(firstMove, boardBefore));

  let turn = enemy;
  let clarityTriggered = false;
  for (let ply = 2; ply <= limit; ply += 1) {
    const mv = pickBestForecastMove(board, turn, levelId);
    if (!mv) break;
    line.push(moveNotationSafe(mv, board));
    const nextBoard = applyMove(board, mv.from[0], mv.from[1], mv.to[0], mv.to[1]);
    if (
      !movedPieceCaptured &&
      mv.to[0] === firstMove.to[0] &&
      mv.to[1] === firstMove.to[1] &&
      mv.captured === firstMove.piece
    ) {
      movedPieceCaptured = true;
      capturePly = ply;
      clarityTriggered = true;
    }
    if (!clarityTriggered && (mv.captured || isInCheck(nextBoard, oppositeSide(turn)))) {
      clarityTriggered = true;
    }
    board = nextBoard;
    turn = oppositeSide(turn);
    const swingNow = evaluateBoardForSide(board, side) - beforeEval;
    if (ply >= 3 && clarityTriggered && Math.abs(swingNow) >= 1.2) break;
    if (ply >= 4 && Math.abs(swingNow) >= 2.6) break;
  }

  const netSwing = Number((evaluateBoardForSide(board, side) - beforeEval).toFixed(2));
  return {
    line: line.filter(Boolean),
    lineLength: line.length,
    netSwing,
    movedPieceCaptured,
    capturePly,
  };
}

function buildHintImpactDetails(boardBefore, firstMove, side, lineEval) {
  const details = [];
  const enemy = oppositeSide(side);
  const boardAfter = applyMove(
    boardBefore,
    firstMove.from[0],
    firstMove.from[1],
    firstMove.to[0],
    firstMove.to[1],
  );
  const gainValue = contextualPieceValue(
    boardBefore,
    firstMove.captured || "",
    firstMove.to[0],
    firstMove.to[1],
  );
  const immediateNetLoss = estimateImmediateNetLoss(
    boardAfter,
    firstMove.to[0],
    firstMove.to[1],
    side,
    gainValue,
  );
  if (isInCheck(boardAfter, enemy)) details.push("可直接将军");
  if (gainValue > 0) {
    details.push(`可得子（约 ${gainValue.toFixed(1)} 子力）`);
  }
  if (immediateNetLoss >= 1) {
    details.push(`落点可能被吃（净亏约 ${immediateNetLoss.toFixed(1)}）`);
  } else if (immediateNetLoss > 0.25) {
    details.push(`落点有兑子风险（净亏约 ${immediateNetLoss.toFixed(1)}）`);
  } else {
    details.push("落点相对安全");
  }
  if (canGiveCheckInOne(boardAfter, enemy, side)) {
    details.push("对手下一步有将军手段，需优先防将");
  }
  if (lineEval?.movedPieceCaptured) {
    details.push(`预演显示该子在第 ${lineEval.capturePly} 手可能被吃`);
  }
  if (lineEval) {
    if (lineEval.netSwing >= 1.2) details.push("后续局面更主动");
    else if (lineEval.netSwing <= -1.2) details.push("后续局面偏被动");
    else details.push("后续局面大体均衡");
  }
  return details;
}

function buildCurrentTurnHint(board, side, levelId = "normal", maxPreviewPly = 5) {
  const externalBest = xqwlightFindBestMove(board, side, levelId, true);
  const levelCfg = getAiLevelConfig(levelId);
  const ranked = rankMoves(board, side, Math.max(levelCfg.evalDepth || 2, 2));
  let bestMove = externalBest && isLegalMove(board, externalBest, side) ? externalBest : null;
  if (!bestMove) bestMove = ranked[0]?.move || null;
  if (!bestMove) return null;
  const notation = toChineseNotation(bestMove, board);
  const lineEval = forecastFlexibleLine(board, bestMove, side, levelId, maxPreviewPly);
  const impactDetails = buildHintImpactDetails(board, bestMove, side, lineEval);
  return {
    side,
    bestMove: {
      from: [...bestMove.from],
      to: [...bestMove.to],
      piece: bestMove.piece,
      captured: bestMove.captured || "",
    },
    bestMoveNotation: notation,
    previewLine: lineEval.line,
    previewPly: lineEval.lineLength,
    impactDetails,
    lineEval,
    engine: bestMove === externalBest ? "xqwlight+fallback" : "fallback",
  };
}

function assessMove(boardBefore, rawMove, side, evalDepth, preRanked = null, externalBest = null) {
  const scoredMoves = preRanked || rankMoves(boardBefore, side, evalDepth);
  const fallbackBest = scoredMoves[0] || null;
  const externalBestMove = externalBest?.move || null;
  const hasExternalBest = Boolean(externalBestMove && isLegalMove(boardBefore, externalBestMove, side));
  const bestMove = hasExternalBest ? externalBestMove : fallbackBest?.move || null;
  const bestScore = scoreMoveByFallback(boardBefore, bestMove, side, evalDepth, scoredMoves);
  const playedScore = scoreMoveByFallback(boardBefore, rawMove, side, evalDepth, scoredMoves);
  const safeBestScore = Number.isFinite(bestScore) ? bestScore : 0;
  const safePlayedScore = Number.isFinite(playedScore) ? playedScore : safeBestScore;
  const scoreGap = Math.max(0, safeBestScore - safePlayedScore);
  let quality = classifyGap(scoreGap);
  if (rawMove.captured && rawMove.captured[1] === "K") {
    quality = { key: "best", label: "最优" };
  } else if (bestMove && sameMove(bestMove, rawMove)) {
    quality = { key: "best", label: "最优" };
  } else if (hasExternalBest) {
    // External engine and fallback disagree: keep label conservative.
    if (quality.key === "best") {
      quality = { key: "inaccuracy", label: "有更优" };
    }
    if (quality.key === "mistake" && scoreGap < 6) {
      quality = { key: "inaccuracy", label: "有更优" };
    }
  }

  const boardAfter = applyMove(
    boardBefore,
    rawMove.from[0],
    rawMove.from[1],
    rawMove.to[0],
    rawMove.to[1],
  );
  const enemy = oppositeSide(side);
  const risks = [];
  const gainedMaterial = contextualPieceValue(
    boardBefore,
    rawMove.captured || "",
    rawMove.to[0],
    rawMove.to[1],
  );
  const immediateNetLoss = estimateImmediateNetLoss(
    boardAfter,
    rawMove.to[0],
    rawMove.to[1],
    side,
    gainedMaterial,
  );
  if (immediateNetLoss >= 1) {
    risks.push(RISK_MATERIAL_LOSS);
  }
  if (canGiveCheckInOne(boardAfter, enemy, side)) {
    risks.push("下一步可能被将");
  }
  const threePly = forecastThreePly(boardBefore, rawMove, side);
  if (threePly.movedPieceCaptured || threePly.netSwing <= -1.8) {
    risks.push(RISK_THREE_PLY);
  }
  if (
    quality.key === "best" &&
    threePly.movedPieceCaptured &&
    threePly.netSwing <= -0.5 &&
    !(rawMove.captured && rawMove.captured[1] === "K")
  ) {
    quality = { key: "inaccuracy", label: "有更优" };
  }
  if (quality.key === "mistake" && shouldDownrankOpeningMistake(boardBefore, boardAfter, rawMove, side)) {
    quality = { key: "inaccuracy", label: "有更优" };
  }

  return {
    quality: quality.key,
    qualityLabel: quality.label,
    scoreGap: Number(scoreGap.toFixed(2)),
    evalDepth,
    risks,
    immediateNetLoss: Number(immediateNetLoss.toFixed(2)),
    threePly,
    bestMoveNotation: bestMove ? toChineseNotation(bestMove, boardBefore) : "",
    engineVersion: ASSESSMENT_ENGINE_VERSION,
    engine: hasExternalBest ? "xqwlight+fallback" : "fallback",
  };
}

function pickAiMove(scoredMoves, levelConfig) {
  if (!scoredMoves.length) return null;
  const poolSize = Math.max(1, Math.min(levelConfig.topPool || 1, scoredMoves.length));
  if (Math.random() < (levelConfig.randomness || 0)) {
    const idx = Math.floor(Math.random() * poolSize);
    return scoredMoves[idx].move;
  }
  return scoredMoves[0].move;
}

function appendMoveWithAssessment(
  owner,
  boardBefore,
  rawMove,
  evalDepth,
  preRanked = null,
  externalBest = null,
) {
  const assessment = assessMove(
    boardBefore,
    rawMove,
    rawMove.piece[0],
    evalDepth,
    preRanked,
    externalBest,
  );
  owner.moves.push({
    ...rawMove,
    notation: toChineseNotation(rawMove, boardBefore),
    assessment,
  });
}

function settleAfterMove(owner, capturedPiece, side) {
  if (capturedPiece && capturedPiece[1] === "K") {
    owner.status = "finished";
    owner.winnerSide = side;
    return;
  }
  owner.turn = oppositeSide(owner.turn);
}

function isAssessmentOutdated(assessment) {
  return !assessment || assessment.engineVersion !== ASSESSMENT_ENGINE_VERSION;
}

function recalcOwnerAssessments(owner, levelId = "normal") {
  if (!Array.isArray(owner.moves) || !Array.isArray(owner.snapshots)) return false;
  let changed = false;
  for (let i = 0; i < owner.moves.length; i += 1) {
    const move = owner.moves[i];
    if (!move || !Array.isArray(move.from) || !Array.isArray(move.to) || !move.piece) continue;
    if (!isAssessmentOutdated(move.assessment)) continue;
    const boardBefore = owner.snapshots[i];
    if (!boardBefore) continue;
    const side = move.piece[0];
    const evalDepth = getAiLevelConfig(levelId).evalDepth;
    const externalBest = xqwlightFindBestMove(boardBefore, side, levelId, true);
    const assessment = assessMove(
      boardBefore,
      move,
      side,
      evalDepth,
      null,
      externalBest ? { move: externalBest } : null,
    );
    move.notation = toChineseNotation(move, boardBefore);
    move.assessment = assessment;
    changed = true;
  }
  return changed;
}

function maybePlayAiTurn(game) {
  if (game.mode !== "ai") return false;
  if (game.status !== "active") return false;
  if (game.turn !== game.aiSide) return false;
  const level = getAiLevelConfig(game.aiLevel);
  const boardBefore = cloneBoard(game.snapshots[game.snapshots.length - 1]);
  const externalBest = xqwlightFindBestMove(boardBefore, game.turn, level.id, false);
  const ranked = rankMoves(boardBefore, game.turn, level.thinkDepth);
  if (!ranked.length && !externalBest) {
    game.status = "finished";
    game.winnerSide = oppositeSide(game.turn);
    return false;
  }
  let aiMove = externalBest;
  if (!aiMove) {
    aiMove = pickAiMove(ranked, level);
  } else if (Math.random() < (level.randomness || 0)) {
    // On easier levels, keep some diversity even with strong-engine baseline.
    const fallback = pickAiMove(ranked, level);
    if (fallback) aiMove = fallback;
  }
  if (!aiMove) return false;
  const boardAfter = applyMove(
    boardBefore,
    aiMove.from[0],
    aiMove.from[1],
    aiMove.to[0],
    aiMove.to[1],
  );
  appendMoveWithAssessment(
    game,
    boardBefore,
    aiMove,
    level.evalDepth,
    ranked,
    externalBest ? { move: externalBest } : null,
  );
  game.snapshots.push(boardAfter);
  settleAfterMove(game, aiMove.captured || "", aiMove.piece[0]);
  return true;
}

function shouldAiResign(game) {
  if (!game || game.mode !== "ai" || game.status !== "active") return false;
  const board = cloneBoard(game.snapshots[game.snapshots.length - 1]);
  const aiSide = game.aiSide || "b";
  const evalForAi = evaluateBoardForSide(board, aiSide);
  if (evalForAi > -11.5) return false;
  if (game.moves.length < 10) return false;
  if (canGiveCheckInOne(board, aiSide, oppositeSide(aiSide))) return false;
  return true;
}

function clearAiThinkState(game) {
  delete game.aiThinkDueAt;
  delete game.aiThinkStartedAt;
  delete game.aiThinkDurationMs;
}

function computeAiThinkMs(game) {
  const level = getAiLevelConfig(game.aiLevel);
  let baseMin = 1000;
  let baseMax = 2600;
  if (level.id === "normal") {
    baseMin = 2400;
    baseMax = 5200;
  } else if (level.id === "hard") {
    baseMin = 5000;
    baseMax = 9800;
  }
  const base = baseMin + Math.floor(Math.random() * Math.max(1, baseMax - baseMin + 1));
  const board = game.snapshots[game.snapshots.length - 1];
  const aiSide = game.aiSide || "b";
  const evalForAi = evaluateBoardForSide(board, aiSide);
  const disadvantage = Math.max(0, -evalForAi);
  const disadvantageBonus = Math.min(5000, Math.round(disadvantage * 620));
  return Math.min(AI_THINK_MAX_MS, base + disadvantageBonus);
}

function scheduleAiThinkIfNeeded(game) {
  if (game.mode !== "ai") return false;
  if (game.status !== "active") return false;
  if (game.turn !== game.aiSide) return false;
  const now = Date.now();
  const dueAtTs = game.aiThinkDueAt ? new Date(game.aiThinkDueAt).getTime() : 0;
  if (Number.isFinite(dueAtTs) && dueAtTs > now) return false;
  const thinkMs = computeAiThinkMs(game);
  game.aiThinkStartedAt = new Date(now).toISOString();
  game.aiThinkDurationMs = thinkMs;
  game.aiThinkDueAt = new Date(now + thinkMs).toISOString();
  return true;
}

function getOrCreateReviewBucket(db, gameId) {
  let review = db.reviews.find((r) => r.gameId === gameId);
  if (!review) {
    review = { gameId, tags: [], updatedAt: new Date().toISOString() };
    db.reviews.push(review);
  }
  return review;
}

export function setManualReviewTag(gameId, plyIndex, tag, note = "") {
  const { db, userId } = requireCurrentUser();
  const game = db.games.find((g) => g.id === gameId && g.userId === userId);
  if (!game) throw new Error("对局不存在或无权限");
  if (plyIndex < 1 || plyIndex > game.moves.length) throw new Error("步号超出范围");
  const cleanTag = (tag || "").trim();
  if (!cleanTag) throw new Error("标签不能为空");
  const review = getOrCreateReviewBucket(db, gameId);
  const existing = review.tags.find((t) => t.plyIndex === plyIndex && t.tag === cleanTag);
  if (existing) {
    existing.note = (note || "").trim();
    existing.updatedAt = new Date().toISOString();
  } else {
    review.tags.push({
      id: nextId("rt"),
      plyIndex,
      tag: cleanTag,
      note: (note || "").trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  review.updatedAt = new Date().toISOString();
  saveDb(db);
}

export function getManualReviewTags(gameId) {
  const { db, userId } = requireCurrentUser();
  const game = db.games.find((g) => g.id === gameId && g.userId === userId);
  if (!game) throw new Error("对局不存在或无权限");
  const review = db.reviews.find((r) => r.gameId === gameId);
  return review ? [...review.tags].sort((a, b) => a.plyIndex - b.plyIndex) : [];
}

export function analyzeGame(gameId) {
  const { db, userId } = requireCurrentUser();
  const game = db.games.find((g) => g.id === gameId && g.userId === userId);
  if (!game) throw new Error("对局不存在或无权限");
  const manualTags = getManualReviewTags(gameId);
  const manualByPly = new Map();
  manualTags.forEach((t) => {
    if (!manualByPly.has(t.plyIndex)) manualByPly.set(t.plyIndex, []);
    manualByPly.get(t.plyIndex).push(t);
  });

  const items = [];
  const quality = { best: 0, inaccuracy: 0, mistake: 0 };
  const risks = { materialLoss: 0, checkThreat: 0 };
  const tactics = { gainMaterial: 0 };
  const phases = {
    opening: { best: 0, inaccuracy: 0, mistake: 0 },
    middlegame: { best: 0, inaccuracy: 0, mistake: 0 },
    endgame: { best: 0, inaccuracy: 0, mistake: 0 },
  };
  for (let i = 0; i < game.moves.length; i += 1) {
    const move = game.moves[i];
    const ply = i + 1;
    const side = move.piece[0];
    const before = game.snapshots[i];
    const after = game.snapshots[i + 1];
    const tags = [];
    const assessmentQuality = move.assessment?.quality || "";
    const assessmentRisks = Array.isArray(move.assessment?.risks) ? move.assessment.risks : [];

    if (move.captured) {
      const v = pieceValue(move.captured);
      tactics.gainMaterial += 1;
      if (v >= 4) tags.push("战术得子");
      else tags.push("得子");
    }

    if (i >= 2) {
      const prevSameSide = game.moves[i - 2];
      if (
        prevSameSide &&
        prevSameSide.piece === move.piece &&
        prevSameSide.from[0] === move.to[0] &&
        prevSameSide.from[1] === move.to[1] &&
        prevSameSide.to[0] === move.from[0] &&
        prevSameSide.to[1] === move.from[1]
      ) {
        tags.push("反复调子");
      }
    }

    if (isInCheck(before, side) && !isInCheck(after, side)) {
      tags.push("应将");
    }

    if (i + 1 < game.moves.length) {
      const opp = game.moves[i + 1];
      if (
        opp.to[0] === move.to[0] &&
        opp.to[1] === move.to[1] &&
        opp.captured === move.piece
      ) {
        tags.push("送子风险");
      }
    }
    if (assessmentQuality === "best") tags.push("最优着法");
    if (assessmentQuality === "mistake") tags.push("明显失误");
    if (assessmentRisks.length) {
      if (
        assessmentRisks.includes(RISK_MATERIAL_LOSS) ||
        assessmentRisks.includes("落点可能被吃") ||
        assessmentRisks.includes(RISK_THREE_PLY)
      ) {
        tags.push("送子风险");
        risks.materialLoss += 1;
      }
      if (assessmentRisks.includes("下一步可能被将")) {
        tags.push("被将风险");
        risks.checkThreat += 1;
      }
    }

    if (assessmentQuality === "best") quality.best += 1;
    else if (assessmentQuality === "mistake") quality.mistake += 1;
    else if (assessmentQuality === "inaccuracy") quality.inaccuracy += 1;

    const phase =
      ply <= 12 ? phases.opening : ply <= 30 ? phases.middlegame : phases.endgame;
    if (assessmentQuality === "best") phase.best += 1;
    else if (assessmentQuality === "mistake") phase.mistake += 1;
    else if (assessmentQuality === "inaccuracy") phase.inaccuracy += 1;

    const mergedManual = manualByPly.get(ply) || [];
    const uniqueTags = [...new Set(tags)];
    items.push({
      ply,
      side,
      notation: toChineseNotation(move, before),
      autoTags: uniqueTags,
      manualTags: mergedManual,
      quality: assessmentQuality,
      qualityLabel: move.assessment?.qualityLabel || "未评估",
      risks: assessmentRisks,
      scoreGap: Number(move.assessment?.scoreGap || 0),
    });
  }

  const keyMoments = items
    .filter(
      (item) =>
        item.quality === "mistake" ||
        item.risks.length > 0 ||
        item.manualTags.length > 0 ||
        item.autoTags.includes("战术得子"),
    )
    .slice(0, 8)
    .map((item) => ({
      ply: item.ply,
      side: item.side,
      notation: item.notation,
      qualityLabel: item.qualityLabel,
      autoTags: item.autoTags,
      manualTags: item.manualTags,
    }));

  const tagCounter = new Map();
  items.forEach((it) => {
    it.autoTags.forEach((t) => tagCounter.set(t, (tagCounter.get(t) || 0) + 1));
    it.manualTags.forEach((t) => tagCounter.set(t.tag, (tagCounter.get(t.tag) || 0) + 1));
  });
  const topIssues = [...tagCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));

  const suggestions = [];
  if (tagCounter.get("送子风险")) suggestions.push("优先训练“子力安全检查”：每步先看落点是否出现净亏交换。");
  if (tagCounter.get("反复调子")) suggestions.push("减少无效调子：同子二次往返前先确认是否带来实质收益。");
  if (tagCounter.get("应将")) suggestions.push("在受将场景下优先考虑“先解将，再争先”。");
  if (quality.mistake >= 3) suggestions.push("先把明显失误最多的 3 手单独重摆一遍，比泛看全盘更容易提升。");
  if (risks.checkThreat >= 2) suggestions.push("补一轮“将军前后 1 手”专项训练，强化先看将再看吃子的习惯。");
  if (suggestions.length === 0) suggestions.push("先补充手动标签，系统会给出更精准建议。");

  return {
    gameId,
    gameName: game.name,
    mode: game.mode || "practice",
    status: game.status || "active",
    totalPly: game.moves.length,
    items,
    quality,
    risks,
    tactics,
    phases,
    manualTagCount: manualTags.length,
    keyMoments,
    topIssues,
    suggestions,
  };
}

export function createGame(name, options = {}) {
  const { db, userId } = requireCurrentUser();
  if (!Array.isArray(db.games)) db.games = [];
  const mode = options.mode === "ai" ? "ai" : "practice";
  const aiSide = mode === "ai" ? (options.aiSide === "r" ? "r" : "b") : null;
  const aiLevel = mode === "ai" ? getAiLevelConfig(options.aiLevel).id : null;
  const game = {
    id: nextId("g"),
    userId,
    name: (name || "").trim() || `对局 ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode, // practice | ai
    aiSide,
    aiLevel,
    status: "active", // active | finished
    winnerSide: null,
    turn: "r",
    undoUsedByUser: { [userId]: 0 },
    aiThinkDueAt: null,
    aiThinkStartedAt: null,
    aiThinkDurationMs: null,
    moves: [],
    snapshots: [createInitialBoard()],
  };
  // If AI takes red, schedule delayed opening move.
  scheduleAiThinkIfNeeded(game);
  db.games.push(game);
  saveDb(db);
  return game;
}

export function getMyGames() {
  const { db, userId } = requireCurrentUser();
  const games = Array.isArray(db.games) ? db.games : [];
  return games
    .filter((g) => g.userId === userId)
    .map((g) => ({
      id: g.id,
      name: g.name,
      mode: g.mode || "practice",
      aiSide: g.aiSide || null,
      aiLevel: g.aiLevel || null,
      status: g.status || "active",
      ply: g.moves.length,
      updatedAt: g.updatedAt,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getGame(gameId) {
  const { db, userId } = requireCurrentUser();
  const game = db.games.find((g) => g.id === gameId && g.userId === userId);
  if (!game) throw new Error("对局不存在或无权限");
  const levelId = game.aiLevel || "normal";
  if (recalcOwnerAssessments(game, levelId)) {
    game.updatedAt = new Date().toISOString();
    saveDb(db);
  }
  return game;
}

export function getSnapshot(gameId, plyIndex) {
  const { userId } = requireCurrentUser();
  const game = getGame(gameId);
  const max = game.snapshots.length - 1;
  const index = Math.max(0, Math.min(plyIndex, max));
  const move = index > 0 ? game.moves[index - 1] : null;
  const board = cloneBoard(game.snapshots[index]);
  const turn = index === max ? game.turn : index % 2 === 0 ? "r" : "b";
  const inCheck = isInCheck(board, turn);
  const now = Date.now();
  const thinkDue = game.aiThinkDueAt ? new Date(game.aiThinkDueAt).getTime() : 0;
  const aiThinking = Boolean(
    game.mode === "ai" &&
      game.status === "active" &&
      turn === game.aiSide &&
      index === max &&
      thinkDue > now,
  );
  return {
    board,
    index,
    max,
    turn,
    mode: game.mode || "practice",
    aiSide: game.aiSide || null,
    aiLevel: game.aiLevel || null,
    status: game.status || "active",
    winnerSide: game.winnerSide || null,
    aiThinking,
    aiThinkMsLeft: aiThinking ? Math.max(0, thinkDue - now) : 0,
    aiThinkDueAt: game.aiThinkDueAt || null,
    undoUsed: getUndoUsed(game, userId),
    undoRemaining: getUndoRemaining(game, userId),
    undoLimit: UNDO_LIMIT_PER_USER,
    inCheck,
    checkedSide: inCheck ? turn : null,
    latestMove: move
      ? {
          from: [...move.from],
          to: [...move.to],
          piece: move.piece,
          captured: move.captured || "",
        }
      : null,
    latestMoveNotation: move?.notation || null,
    latestAssessment: move?.assessment || null,
  };
}

export function getCurrentTurnHint(gameId, { maxPreviewPly = 5 } = {}) {
  const game = getGame(gameId);
  const board = cloneBoard(game.snapshots[game.snapshots.length - 1]);
  const side = game.turn;
  const levelId = game.aiLevel || "normal";
  return buildCurrentTurnHint(board, side, levelId, maxPreviewPly);
}

export function makeMove(gameId, fromRow, fromCol, toRow, toCol) {
  const { db, userId } = requireCurrentUser();
  const game = db.games.find((g) => g.id === gameId && g.userId === userId);
  if (!game) throw new Error("对局不存在或无权限");
  if ((game.status || "active") === "finished") throw new Error("该对局已结束");
  clearAiThinkState(game);

  const boardBefore = cloneBoard(game.snapshots[game.snapshots.length - 1]);
  validateMoveOrThrow(boardBefore, fromRow, fromCol, toRow, toCol, game.turn);
  const fromPiece = boardBefore[fromRow]?.[fromCol];
  const toPiece = boardBefore[toRow]?.[toCol];
  const rawMove = {
    from: [fromRow, fromCol],
    to: [toRow, toCol],
    piece: fromPiece,
    captured: toPiece || "",
  };
  const evalDepth = getAiLevelConfig(game.aiLevel).evalDepth;
  const externalBest = xqwlightFindBestMove(boardBefore, rawMove.piece[0], game.aiLevel, true);
  appendMoveWithAssessment(
    game,
    boardBefore,
    rawMove,
    evalDepth,
    null,
    externalBest ? { move: externalBest } : null,
  );
  const boardAfter = applyMove(boardBefore, fromRow, fromCol, toRow, toCol);
  game.snapshots.push(boardAfter);
  settleAfterMove(game, toPiece || "", rawMove.piece[0]);
  scheduleAiThinkIfNeeded(game);
  game.updatedAt = new Date().toISOString();
  saveDb(db);
  return game;
}

export function runAiTurnIfReady(gameId) {
  const { db, userId } = requireCurrentUser();
  const game = db.games.find((g) => g.id === gameId && g.userId === userId);
  if (!game) throw new Error("对局不存在或无权限");
  if (game.mode !== "ai" || game.status !== "active") {
    clearAiThinkState(game);
    saveDb(db);
    return { moved: false, aiThinking: false, aiThinkMsLeft: 0 };
  }
  if (game.turn !== game.aiSide) {
    clearAiThinkState(game);
    saveDb(db);
    return { moved: false, aiThinking: false, aiThinkMsLeft: 0 };
  }
  if (!game.aiThinkDueAt) {
    scheduleAiThinkIfNeeded(game);
    game.updatedAt = new Date().toISOString();
    saveDb(db);
  }
  const now = Date.now();
  const dueAt = game.aiThinkDueAt ? new Date(game.aiThinkDueAt).getTime() : now;
  const msLeft = Math.max(0, dueAt - now);
  if (msLeft > 0) {
    return { moved: false, aiThinking: true, aiThinkMsLeft: msLeft, resigned: false };
  }

  if (shouldAiResign(game)) {
    game.status = "finished";
    game.winnerSide = oppositeSide(game.aiSide || "b");
    clearAiThinkState(game);
    game.updatedAt = new Date().toISOString();
    saveDb(db);
    return {
      moved: false,
      aiThinking: false,
      aiThinkMsLeft: 0,
      resigned: true,
      resignedSide: game.aiSide || "b",
      winnerSide: game.winnerSide,
    };
  }

  const moved = maybePlayAiTurn(game);
  clearAiThinkState(game);
  game.updatedAt = new Date().toISOString();
  saveDb(db);
  return { moved, aiThinking: false, aiThinkMsLeft: 0, resigned: false };
}

export function endGame(gameId, { keepRecord = true } = {}) {
  const { db, userId } = requireCurrentUser();
  const gameIndex = db.games.findIndex((g) => g.id === gameId && g.userId === userId);
  if (gameIndex < 0) throw new Error("对局不存在或无权限");
  const game = db.games[gameIndex];
  clearAiThinkState(game);
  if (keepRecord) {
    game.status = "finished";
    if (game.winnerSide !== "r" && game.winnerSide !== "b") {
      game.winnerSide = null;
    }
    game.updatedAt = new Date().toISOString();
  } else {
    db.games.splice(gameIndex, 1);
    db.reviews = (db.reviews || []).filter((x) => x.gameId !== gameId);
  }
  saveDb(db);
  return { keepRecord };
}

export function resignGame(gameId, { side = null } = {}) {
  const { db, userId } = requireCurrentUser();
  const game = db.games.find((g) => g.id === gameId && g.userId === userId);
  if (!game) throw new Error("对局不存在或无权限");
  if ((game.status || "active") === "finished") throw new Error("该对局已结束");
  clearAiThinkState(game);
  const resignSide = side || (game.mode === "ai" ? oppositeSide(game.aiSide || "b") : game.turn);
  if (resignSide !== "r" && resignSide !== "b") throw new Error("认输方非法");
  game.status = "finished";
  game.winnerSide = oppositeSide(resignSide);
  game.updatedAt = new Date().toISOString();
  saveDb(db);
  return { resignedSide: resignSide, winnerSide: game.winnerSide };
}

export function undoGameMove(gameId) {
  const { db, userId } = requireCurrentUser();
  const game = db.games.find((g) => g.id === gameId && g.userId === userId);
  if (!game) throw new Error("对局不存在或无权限");
  if (!Array.isArray(game.moves) || game.moves.length === 0) throw new Error("当前没有可悔棋步");
  const remaining = getUndoRemaining(game, userId);
  if (remaining <= 0) throw new Error(`本局悔棋次数已用完（上限 ${UNDO_LIMIT_PER_USER} 次）`);

  let keepMoveCount = game.moves.length - 1;
  if (game.mode === "ai") {
    const mySide = oppositeSide(game.aiSide || "b");
    let myLastIndex = -1;
    for (let i = game.moves.length - 1; i >= 0; i -= 1) {
      if (game.moves[i]?.piece?.[0] === mySide) {
        myLastIndex = i;
        break;
      }
    }
    if (myLastIndex < 0) throw new Error("当前没有可撤销的“你方”走子");
    keepMoveCount = myLastIndex;
  }

  trimOwnerMoves(game, keepMoveCount);
  const review = db.reviews.find((r) => r.gameId === gameId);
  if (review && Array.isArray(review.tags)) {
    review.tags = review.tags.filter((t) => t.plyIndex <= keepMoveCount);
    review.updatedAt = new Date().toISOString();
  }
  game.turn = keepMoveCount % 2 === 0 ? "r" : "b";
  game.status = "active";
  game.winnerSide = null;
  clearAiThinkState(game);
  scheduleAiThinkIfNeeded(game);
  bumpUndoUsed(game, userId);
  game.updatedAt = new Date().toISOString();
  saveDb(db);
  return {
    undoUsed: getUndoUsed(game, userId),
    undoRemaining: getUndoRemaining(game, userId),
    undoLimit: UNDO_LIMIT_PER_USER,
  };
}

function makeBattleCode(db) {
  let code = "";
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (db.battles.some((b) => b.code === code));
  return code;
}

function userBattleSide(battle, userId) {
  if (battle.redUserId === userId) return "r";
  if (battle.blackUserId === userId) return "b";
  return null;
}

export function createBattle(name) {
  const { db, userId } = requireCurrentUser();
  if (!Array.isArray(db.battles)) db.battles = [];
  const battle = {
    id: nextId("b"),
    code: makeBattleCode(db),
    name: (name || "").trim() || `对战 ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId,
    redUserId: userId,
    blackUserId: null,
    status: "waiting", // waiting | active | finished
    winnerSide: null,
    turn: "r",
    undoUsedByUser: { [userId]: 0 },
    moves: [],
    snapshots: [createInitialBoard()],
  };
  db.battles.push(battle);
  saveDb(db);
  return battle;
}

function creatorDisplayName(db, userId) {
  const user = db.users?.find((item) => item.id === userId);
  return user?.name || user?.email || "未知用户";
}

function joinBattleOrThrow(db, userId, battle) {
  if (!battle) throw new Error("对战不存在");
  if (battle.status === "finished") throw new Error("该对战已结束");
  const side = userBattleSide(battle, userId);
  if (side) return battle;

  if (!battle.redUserId) battle.redUserId = userId;
  else if (!battle.blackUserId) battle.blackUserId = userId;
  else throw new Error("该对战房间已满");

  if (battle.redUserId && battle.blackUserId) {
    battle.status = "active";
  }
  battle.updatedAt = new Date().toISOString();
  saveDb(db);
  return battle;
}

export function joinBattleByCode(codeInput) {
  const { db, userId } = requireCurrentUser();
  const code = (codeInput || "").trim().toUpperCase();
  if (!code) throw new Error("请输入邀请码");
  const battle = db.battles.find((b) => b.code === code);
  if (!battle) throw new Error("对战邀请码不存在");
  return joinBattleOrThrow(db, userId, battle);
}

export function joinBattleById(battleId) {
  const { db, userId } = requireCurrentUser();
  const battle = db.battles.find((item) => item.id === battleId);
  return joinBattleOrThrow(db, userId, battle);
}

export function searchJoinableBattles(queryInput = "") {
  const { db, userId } = requireCurrentUser();
  const query = (queryInput || "").trim().toLowerCase();
  const battles = Array.isArray(db.battles) ? db.battles : [];
  return battles
    .filter((battle) => {
      if (battle.status === "finished") return false;
      const alreadyJoined = Boolean(userBattleSide(battle, userId));
      const hasSeat = !battle.redUserId || !battle.blackUserId;
      if (!alreadyJoined && !hasSeat) return false;
      if (!query) return true;
      const creatorName = creatorDisplayName(db, battle.createdBy).toLowerCase();
      return [battle.name, battle.code, creatorName].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    })
    .map((battle) => ({
      id: battle.id,
      code: battle.code,
      name: battle.name,
      status: battle.status,
      ply: battle.moves.length,
      creatorName: creatorDisplayName(db, battle.createdBy),
      alreadyJoined: Boolean(userBattleSide(battle, userId)),
      hasSeat: !battle.redUserId || !battle.blackUserId,
      updatedAt: battle.updatedAt,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getMyBattles() {
  const { db, userId } = requireCurrentUser();
  const battles = Array.isArray(db.battles) ? db.battles : [];
  return battles
    .filter((b) => b.redUserId === userId || b.blackUserId === userId)
    .map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      status: b.status,
      turn: b.turn,
      redUserId: b.redUserId,
      blackUserId: b.blackUserId,
      ply: b.moves.length,
      updatedAt: b.updatedAt,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getBattle(battleId) {
  const { db, userId } = requireCurrentUser();
  const battle = db.battles.find((b) => b.id === battleId);
  if (!battle) throw new Error("对战不存在");
  if (!(battle.redUserId === userId || battle.blackUserId === userId)) {
    throw new Error("无权限访问该对战");
  }
  if (recalcOwnerAssessments(battle, "normal")) {
    battle.updatedAt = new Date().toISOString();
    saveDb(db);
  }
  return battle;
}

export function getBattleSnapshot(battleId, plyIndex) {
  const { userId } = requireCurrentUser();
  const battle = getBattle(battleId);
  const max = battle.snapshots.length - 1;
  const index = Math.max(0, Math.min(plyIndex, max));
  const move = index > 0 ? battle.moves[index - 1] : null;
  const board = cloneBoard(battle.snapshots[index]);
  const turn = index === max ? battle.turn : index % 2 === 0 ? "r" : "b";
  const inCheck = isInCheck(board, turn);
  return {
    board,
    index,
    max,
    turn,
    status: battle.status,
    winnerSide: battle.winnerSide,
    undoUsed: getUndoUsed(battle, userId),
    undoRemaining: getUndoRemaining(battle, userId),
    undoLimit: UNDO_LIMIT_PER_USER,
    inCheck,
    checkedSide: inCheck ? turn : null,
    latestMove: move
      ? {
          from: [...move.from],
          to: [...move.to],
          piece: move.piece,
          captured: move.captured || "",
        }
      : null,
    latestMoveNotation: move?.notation || null,
    latestAssessment: move?.assessment || null,
  };
}

export function getBattleRole(battleId) {
  const { db, userId } = requireCurrentUser();
  const battle = db.battles.find((b) => b.id === battleId);
  if (!battle) throw new Error("对战不存在");
  return userBattleSide(battle, userId);
}

export function makeBattleMove(battleId, fromRow, fromCol, toRow, toCol) {
  const { db, userId } = requireCurrentUser();
  const battle = db.battles.find((b) => b.id === battleId);
  if (!battle) throw new Error("对战不存在");
  const side = userBattleSide(battle, userId);
  if (!side) throw new Error("无权限操作该对战");
  if (battle.status === "waiting") throw new Error("等待对手加入后才能开始");
  if (battle.status === "finished") throw new Error("该对战已结束");
  if (battle.turn !== side) throw new Error("未轮到你走子");

  const boardBefore = cloneBoard(battle.snapshots[battle.snapshots.length - 1]);
  validateMoveOrThrow(boardBefore, fromRow, fromCol, toRow, toCol, battle.turn);
  const fromPiece = boardBefore[fromRow][fromCol];
  const toPiece = boardBefore[toRow][toCol];
  const rawMove = {
    from: [fromRow, fromCol],
    to: [toRow, toCol],
    piece: fromPiece,
    captured: toPiece || "",
  };
  const externalBest = xqwlightFindBestMove(boardBefore, side, "normal", true);
  appendMoveWithAssessment(
    battle,
    boardBefore,
    rawMove,
    2,
    null,
    externalBest ? { move: externalBest } : null,
  );
  const boardAfter = applyMove(boardBefore, fromRow, fromCol, toRow, toCol);
  battle.snapshots.push(boardAfter);
  settleAfterMove(battle, toPiece || "", side);
  battle.updatedAt = new Date().toISOString();
  saveDb(db);
  return battle;
}

export function endBattle(battleId, { keepRecord = true } = {}) {
  const { db, userId } = requireCurrentUser();
  const battleIndex = db.battles.findIndex((b) => b.id === battleId);
  if (battleIndex < 0) throw new Error("对战不存在");
  const battle = db.battles[battleIndex];
  const side = userBattleSide(battle, userId);
  if (!side) throw new Error("无权限操作该对战");

  if (keepRecord) {
    battle.status = "finished";
    battle.winnerSide = battle.redUserId && battle.blackUserId ? oppositeSide(side) : null;
    battle.updatedAt = new Date().toISOString();
  } else {
    db.battles.splice(battleIndex, 1);
  }
  saveDb(db);
  return { keepRecord };
}

export function undoBattleMove(battleId) {
  const { db, userId } = requireCurrentUser();
  const battle = db.battles.find((b) => b.id === battleId);
  if (!battle) throw new Error("对战不存在");
  const side = userBattleSide(battle, userId);
  if (!side) throw new Error("无权限操作该对战");
  if (!Array.isArray(battle.moves) || battle.moves.length === 0) throw new Error("当前没有可悔棋步");
  const remaining = getUndoRemaining(battle, userId);
  if (remaining <= 0) throw new Error(`本局悔棋次数已用完（上限 ${UNDO_LIMIT_PER_USER} 次）`);

  const lastMove = battle.moves[battle.moves.length - 1];
  if (!lastMove || lastMove.piece?.[0] !== side) {
    throw new Error("仅可撤销你刚走的一步（对手已走子则不可悔）");
  }

  trimOwnerMoves(battle, battle.moves.length - 1);
  battle.turn = side;
  battle.status = battle.redUserId && battle.blackUserId ? "active" : "waiting";
  battle.winnerSide = null;
  bumpUndoUsed(battle, userId);
  battle.updatedAt = new Date().toISOString();
  saveDb(db);
  return {
    undoUsed: getUndoUsed(battle, userId),
    undoRemaining: getUndoRemaining(battle, userId),
    undoLimit: UNDO_LIMIT_PER_USER,
  };
}
