/**
 * Bot game logic for 2048 multiplayer.
 * Uses the shared game engine for core mechanics.
 */

import {
  createInitialState,
  simulateMove,
  canMove,
  checkWin,
  addRandomTile,
} from "../src/lib/game-engine";

const SIZE = 4;

const BOT_FIRST_NAMES = [
  "Alpha",
  "Beta",
  "Gamma",
  "Delta",
  "Epsilon",
  "Zeta",
  "Theta",
  "Magnus",
  "Garry",
  "Bobby",
  "Mikhail",
  "Anatoly",
  "Vishy",
  "Hikaru",
  "Deep",
  "Stockfish",
  "Leela",
  "Komodo",
  "Fritz",
  "Houdini",
  "Pixel",
  "Byte",
  "Binary",
  "Quantum",
  "Neural",
  "Matrix",
];

const BOT_SUFFIXES = [
  "Bot",
  "AI",
  "Engine",
  "Mind",
  "Genius",
  "Master",
  "Pro",
  "X",
  "2048",
  "Player",
  "Slider",
  "Merger",
  "Tiler",
  "Champion",
];

export function generateBotName(): string {
  const firstName = BOT_FIRST_NAMES[Math.floor(Math.random() * BOT_FIRST_NAMES.length)];
  const suffix = BOT_SUFFIXES[Math.floor(Math.random() * BOT_SUFFIXES.length)];
  return `${firstName}${suffix}`;
}

export function generateBotElo(playerElo: number): number {
  const offset = Math.floor(Math.random() * 31) - 15;
  return Math.max(100, playerElo + offset);
}

export interface BotGameState {
  grid: number[];
  score: number;
  gameOver: boolean;
  won: boolean;
  elo: number;
}

export interface BotMoveResult {
  state: BotGameState;
  direction: number | null;
}

function idx(r: number, c: number): number {
  return r * SIZE + c;
}

function countEmpty(grid: number[]): number {
  return grid.filter((v) => v === 0).length;
}

function getMaxTile(grid: number[]): number {
  return Math.max(...grid);
}

function evaluateGrid(grid: number[]): number {
  let score = 0;
  score += countEmpty(grid) * 10;

  const maxTile = getMaxTile(grid);
  const corners = [0, SIZE - 1, SIZE * (SIZE - 1), SIZE * SIZE - 1];
  for (const corner of corners) {
    if (grid[corner] === maxTile) {
      score += maxTile * 2;
      break;
    }
  }

  let mono = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE - 1; c++) {
      if (grid[idx(r, c)] >= grid[idx(r, c + 1)]) mono++;
    }
  }
  for (let r = 0; r < SIZE - 1; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[idx(r, c)] >= grid[idx(r + 1, c)]) mono++;
    }
  }
  score += mono * 5;

  return score;
}

function findBestMove(grid: number[]): number {
  const directions = [0, 1, 2, 3];
  let bestDir = 0;
  let bestScore = -Infinity;

  for (const dir of directions) {
    const { moved, scoreGained, newGrid } = simulateMove(grid, SIZE, dir);
    if (!moved) continue;

    let avgScore = scoreGained + evaluateGrid(newGrid);

    const empty = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      if (newGrid[i] === 0) empty.push(i);
    }

    if (empty.length > 0) {
      let futureScore = 0;
      const sampleSize = Math.min(3, empty.length);
      for (let s = 0; s < sampleSize; s++) {
        const testGrid = [...newGrid];
        testGrid[empty[Math.floor(Math.random() * empty.length)]] = 2;

        let bestFutureMove = -Infinity;
        for (const dir2 of directions) {
          const {
            moved: moved2,
            scoreGained: score2,
            newGrid: grid2,
          } = simulateMove(testGrid, SIZE, dir2);
          if (moved2) {
            bestFutureMove = Math.max(bestFutureMove, score2 + evaluateGrid(grid2));
          }
        }
        if (bestFutureMove > -Infinity) {
          futureScore += bestFutureMove;
        }
      }
      avgScore += (futureScore / sampleSize) * 0.5;
    }

    if (avgScore > bestScore) {
      bestScore = avgScore;
      bestDir = dir;
    }
  }

  if (bestScore === -Infinity) {
    for (const dir of directions) {
      const { moved } = simulateMove(grid, SIZE, dir);
      if (moved) return dir;
    }
  }

  return bestDir;
}

function getSmartMoveProbability(elo: number): number {
  if (elo <= 1000) return 0.3;
  if (elo <= 1100) return 0.45;
  if (elo <= 1200) return 0.6;
  if (elo <= 1300) return 0.75;
  if (elo <= 1400) return 0.85;
  if (elo <= 1500) return 0.9;
  return 0.95;
}

function findRandomMove(grid: number[]): number {
  const validMoves: number[] = [];
  for (let dir = 0; dir < 4; dir++) {
    const { moved } = simulateMove(grid, SIZE, dir);
    if (moved) validMoves.push(dir);
  }
  if (validMoves.length === 0) return 0;
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}

export function createInitialBotState(elo: number = 1200): BotGameState {
  const engineState = createInitialState(SIZE);
  return {
    grid: engineState.grid,
    score: 0,
    gameOver: false,
    won: false,
    elo,
  };
}

export function botMakeMove(state: BotGameState): BotMoveResult {
  if (state.gameOver || state.won) return { state, direction: null };

  const smartProb = getSmartMoveProbability(state.elo);
  const useSmart = Math.random() < smartProb;

  const dir = useSmart ? findBestMove(state.grid) : findRandomMove(state.grid);
  const { moved, scoreGained, newGrid } = simulateMove(state.grid, SIZE, dir);

  if (!moved) {
    return { state: { ...state, gameOver: true }, direction: null };
  }

  addRandomTile(newGrid, SIZE);
  const newScore = state.score + scoreGained;
  const won = checkWin(newGrid);
  const gameOver = !canMove(newGrid, SIZE);

  return {
    state: {
      grid: newGrid,
      score: newScore,
      gameOver,
      won,
      elo: state.elo,
    },
    direction: dir,
  };
}
