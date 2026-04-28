import assert from "assert";
import {
  assessMoveForRegression,
  buildRawMove,
  createBoardFromPieces,
  createInitialBoard,
  getAssessmentRiskLabels,
  toChineseNotation,
} from "../js/game.js";

const riskLabels = getAssessmentRiskLabels();

const cases = [
  {
    name: "开局炮二平五不应直接判为失误",
    run() {
      const board = createInitialBoard();
      const move = buildRawMove(board, 7, 7, 7, 4);
      const assessment = assessMoveForRegression(board, move, { side: "r", evalDepth: 2 });
      assert.strictEqual(toChineseNotation(move, board), "炮二平五");
      assert.notStrictEqual(assessment.quality, "mistake");
    },
  },
  {
    name: "黑方记谱使用阿拉伯数字与砲字",
    run() {
      const board = createInitialBoard();
      const move = buildRawMove(board, 2, 1, 2, 4);
      assert.strictEqual(toChineseNotation(move, board), "砲2平5");
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
      assert.notStrictEqual(assessment.quality, "best");
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
      assert.strictEqual(assessment.quality, "best");
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
      assert.ok(assessment.risks.includes(riskLabels.materialLoss));
      assert.ok(assessment.immediateNetLoss >= 1);
    },
  },
  {
    name: "等价兑子不应误报净亏风险",
    run() {
      const board = createInitialBoard();
      const move = buildRawMove(board, 2, 1, 9, 1);
      const assessment = assessMoveForRegression(board, move, { side: "b", evalDepth: 2 });
      assert.ok(!assessment.risks.includes(riskLabels.materialLoss));
    },
  },
  {
    name: "三步预演应识别轻易送子",
    run() {
      const board = createBoardFromPieces([
        { row: 0, col: 4, code: "bK" },
        { row: 2, col: 4, code: "bR" },
        { row: 5, col: 4, code: "rN" },
        { row: 7, col: 4, code: "rR" },
        { row: 9, col: 4, code: "rK" },
      ]);
      const move = buildRawMove(board, 2, 4, 5, 4);
      const assessment = assessMoveForRegression(board, move, { side: "b", evalDepth: 2 });
      assert.ok(assessment.threePly?.movedPieceCaptured);
      assert.ok(assessment.risks.includes(riskLabels.threePlyLoss));
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
      assert.strictEqual(toChineseNotation(move, board), "前车进一");
    },
  },
];

let passed = 0;
let failed = 0;

for (const testCase of cases) {
  try {
    testCase.run();
    passed += 1;
    console.log(`PASS: ${testCase.name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL: ${testCase.name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

console.log(`\nRegression summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
