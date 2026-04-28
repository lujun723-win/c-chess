import {
  assessMoveForRegression,
  buildRawMove,
  createBoardFromPieces,
  createInitialBoard,
  getAssessmentRiskLabels,
  toChineseNotation,
} from "../js/game.js";

const riskLabels = getAssessmentRiskLabels();
const logEl = document.getElementById("log");
const summaryEl = document.getElementById("summary");

function assert(condition, message) {
  if (!condition) throw new Error(message || "assert failed");
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || "assertEqual failed"}: actual=${actual}, expected=${expected}`);
  }
}

const cases = [
  {
    name: "开局炮二平五不应直接判为失误",
    run() {
      const board = createInitialBoard();
      const move = buildRawMove(board, 7, 7, 7, 4);
      const assessment = assessMoveForRegression(board, move, { side: "r", evalDepth: 2 });
      assertEqual(toChineseNotation(move, board), "炮二平五");
      assert(assessment.quality !== "mistake", "炮二平五被误判为失误");
    },
  },
  {
    name: "黑方记谱使用阿拉伯数字与砲字",
    run() {
      const board = createInitialBoard();
      const move = buildRawMove(board, 2, 1, 2, 4);
      assertEqual(toChineseNotation(move, board), "砲2平5");
    },
  },
  {
    name: "外部最优着与实走不同时不标最优",
    run() {
      const board = createInitialBoard();
      const played = buildRawMove(board, 7, 7, 7, 4);
      const externalBest = buildRawMove(board, 7, 1, 7, 4);
      const assessment = assessMoveForRegression(board, played, {
        side: "r",
        evalDepth: 2,
        externalBestMove: externalBest,
      });
      assert(assessment.quality !== "best", "外部最优不一致时仍标最优");
    },
  },
  {
    name: "吃将应直接判最优",
    run() {
      const board = createBoardFromPieces([
        { row: 0, col: 4, code: "bK" },
        { row: 1, col: 4, code: "rR" },
        { row: 5, col: 4, code: "rP" },
        { row: 9, col: 4, code: "rK" },
      ]);
      const move = buildRawMove(board, 1, 4, 0, 4);
      const assessment = assessMoveForRegression(board, move, { side: "r", evalDepth: 2 });
      assertEqual(assessment.quality, "best", "吃将未判最优");
    },
  },
  {
    name: "净亏交换应给出落点净亏风险",
    run() {
      const board = createBoardFromPieces([
        { row: 0, col: 1, code: "bR" },
        { row: 0, col: 4, code: "bK" },
        { row: 5, col: 4, code: "rP" },
        { row: 9, col: 0, code: "rR" },
        { row: 9, col: 4, code: "rK" },
      ]);
      const move = buildRawMove(board, 9, 0, 9, 1);
      const assessment = assessMoveForRegression(board, move, { side: "r", evalDepth: 2 });
      assert(assessment.risks.includes(riskLabels.materialLoss), "未识别净亏风险");
      assert(assessment.immediateNetLoss >= 1, "净亏值异常");
    },
  },
  {
    name: "等价兑子不应误报净亏风险",
    run() {
      const board = createInitialBoard();
      const move = buildRawMove(board, 2, 1, 9, 1);
      const assessment = assessMoveForRegression(board, move, { side: "b", evalDepth: 2 });
      assert(!assessment.risks.includes(riskLabels.materialLoss), "等价兑子被误判净亏风险");
    },
  },
  {
    name: "同线同类子记谱应使用前后消歧",
    run() {
      const board = createBoardFromPieces([
        { row: 0, col: 4, code: "bK" },
        { row: 5, col: 4, code: "bP" },
        { row: 6, col: 4, code: "rR" },
        { row: 8, col: 4, code: "rR" },
        { row: 9, col: 4, code: "rK" },
      ]);
      const move = buildRawMove(board, 6, 4, 5, 4);
      assertEqual(toChineseNotation(move, board), "前车进一");
    },
  },
];

let pass = 0;
let fail = 0;
const logs = [];

for (const testCase of cases) {
  try {
    testCase.run();
    pass += 1;
    logs.push(`PASS: ${testCase.name}`);
  } catch (err) {
    fail += 1;
    logs.push(`FAIL: ${testCase.name}`);
    logs.push(`  ${err.message}`);
  }
}

logEl.textContent = logs.join("\n");
summaryEl.textContent = `Regression summary: ${pass} passed, ${fail} failed`;
summaryEl.className = fail > 0 ? "fail" : "pass";

if (fail > 0) {
  throw new Error(`Regression failed: ${fail}`);
}
