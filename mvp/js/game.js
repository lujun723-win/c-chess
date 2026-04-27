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

export function createInitialBoard() {
  const board = Array.from({ length: 10 }, () => Array(9).fill(""));
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
    evalDepth: 2,
    randomness: 0.05,
    topPool: 1,
  },
};
const ASSESSMENT_ENGINE_VERSION = "xqwlight-v1";

function oppositeSide(side) {
  return side === "r" ? "b" : "r";
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
  let score = 0;
  for (let r = 0; r < 10; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const p = board[r][c];
      if (!p) continue;
      let v = pieceValue(p);
      // Encourage advanced pawns slightly.
      if (p[1] === "P") {
        const crossed = p[0] === "r" ? r <= 4 : r >= 5;
        if (crossed) v += 0.3;
      }
      score += p[0] === side ? v : -v;
    }
  }
  if (isInCheck(board, side)) score -= 0.8;
  if (isInCheck(board, enemy)) score += 0.8;
  return score;
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

function canSquareBeCaptured(board, row, col, bySide) {
  const target = board[row][col];
  if (!target || target[0] === bySide) return false;
  for (let fr = 0; fr < 10; fr += 1) {
    for (let fc = 0; fc < 9; fc += 1) {
      const p = board[fr][fc];
      if (!p || p[0] !== bySide) continue;
      try {
        validateMoveOrThrow(board, fr, fc, row, col, bySide);
        return true;
      } catch (_err) {
        // continue
      }
    }
  }
  return false;
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
  if (gap <= 0.4) return { key: "best", label: "最优" };
  if (gap <= 1.8) return { key: "good", label: "可行" };
  if (gap <= 3.8) return { key: "inaccuracy", label: "有更优" };
  return { key: "mistake", label: "失误" };
}

function assessMove(boardBefore, rawMove, side, evalDepth, preRanked = null, externalBest = null) {
  const scoredMoves = preRanked || rankMoves(boardBefore, side, evalDepth);
  const chosen = scoredMoves.find((x) => sameMove(x.move, rawMove));
  const fallbackBest = scoredMoves[0] || null;
  const bestMove = externalBest?.move || fallbackBest?.move || null;
  const best = fallbackBest;
  const bestScore = best ? best.score : 0;
  const playedScore = chosen ? chosen.score : bestScore;
  const scoreGap = Math.max(0, bestScore - playedScore);
  let quality = classifyGap(scoreGap);
  if (bestMove && sameMove(bestMove, rawMove)) {
    quality = { key: "best", label: "最优" };
  } else if (externalBest?.move) {
    // If strong external engine says "not best", avoid over-harsh labels on shallow fallback scores.
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
  if (canSquareBeCaptured(boardAfter, rawMove.to[0], rawMove.to[1], enemy)) {
    risks.push("落点可能被吃");
  }
  if (canGiveCheckInOne(boardAfter, enemy, side)) {
    risks.push("下一步可能被将");
  }

  return {
    quality: quality.key,
    qualityLabel: quality.label,
    scoreGap: Number(scoreGap.toFixed(2)),
    evalDepth,
    risks,
    bestMoveNotation: bestMove ? toChineseNotation(bestMove, boardBefore) : "",
    engineVersion: ASSESSMENT_ENGINE_VERSION,
    engine: externalBest?.move ? "xqwlight+fallback" : "fallback",
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
  for (let i = 0; i < game.moves.length; i += 1) {
    const move = game.moves[i];
    const ply = i + 1;
    const side = move.piece[0];
    const before = game.snapshots[i];
    const after = game.snapshots[i + 1];
    const tags = [];

    if (move.captured) {
      const v = pieceValue(move.captured);
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
    if (move.assessment?.quality === "best") tags.push("最优着法");
    if (move.assessment?.quality === "mistake") tags.push("明显失误");
    if (Array.isArray(move.assessment?.risks)) {
      if (move.assessment.risks.includes("落点可能被吃")) tags.push("送子风险");
      if (move.assessment.risks.includes("下一步可能被将")) tags.push("被将风险");
    }

    const mergedManual = manualByPly.get(ply) || [];
    items.push({
      ply,
      side,
      notation: toChineseNotation(move, before),
      autoTags: tags,
      manualTags: mergedManual,
    });
  }

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
  if (tagCounter.get("送子风险")) suggestions.push("优先训练“子力安全检查”：每步先看落点是否被对方先手攻击。");
  if (tagCounter.get("反复调子")) suggestions.push("减少无效调子：同子二次往返前先确认是否带来实质收益。");
  if (tagCounter.get("应将")) suggestions.push("在受将场景下优先考虑“先解将，再争先”。");
  if (suggestions.length === 0) suggestions.push("先补充手动标签，系统会给出更精准建议。");

  return {
    gameId,
    gameName: game.name,
    totalPly: game.moves.length,
    items,
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
    moves: [],
    snapshots: [createInitialBoard()],
  };
  // If AI takes red, let AI move first immediately.
  maybePlayAiTurn(game);
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
  const game = getGame(gameId);
  const max = game.snapshots.length - 1;
  const index = Math.max(0, Math.min(plyIndex, max));
  const move = index > 0 ? game.moves[index - 1] : null;
  return {
    board: cloneBoard(game.snapshots[index]),
    index,
    max,
    turn: index === max ? game.turn : index % 2 === 0 ? "r" : "b",
    mode: game.mode || "practice",
    aiSide: game.aiSide || null,
    aiLevel: game.aiLevel || null,
    status: game.status || "active",
    winnerSide: game.winnerSide || null,
    latestAssessment: move?.assessment || null,
  };
}

export function makeMove(gameId, fromRow, fromCol, toRow, toCol) {
  const { db, userId } = requireCurrentUser();
  const game = db.games.find((g) => g.id === gameId && g.userId === userId);
  if (!game) throw new Error("对局不存在或无权限");
  if ((game.status || "active") === "finished") throw new Error("该对局已结束");

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
  maybePlayAiTurn(game);
  game.updatedAt = new Date().toISOString();
  saveDb(db);
  return game;
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
    moves: [],
    snapshots: [createInitialBoard()],
  };
  db.battles.push(battle);
  saveDb(db);
  return battle;
}

export function joinBattleByCode(codeInput) {
  const { db, userId } = requireCurrentUser();
  const code = (codeInput || "").trim().toUpperCase();
  if (!code) throw new Error("请输入邀请码");
  const battle = db.battles.find((b) => b.code === code);
  if (!battle) throw new Error("对战邀请码不存在");
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
  const battle = getBattle(battleId);
  const max = battle.snapshots.length - 1;
  const index = Math.max(0, Math.min(plyIndex, max));
  const move = index > 0 ? battle.moves[index - 1] : null;
  return {
    board: cloneBoard(battle.snapshots[index]),
    index,
    max,
    turn: index === max ? battle.turn : index % 2 === 0 ? "r" : "b",
    status: battle.status,
    winnerSide: battle.winnerSide,
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
