/**
 * Bot game logic for 2048 multiplayer.
 * Simulates a bot player making moves.
 */

const SIZE = 4;

// Random bot names (chess-inspired)
const BOT_FIRST_NAMES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Theta',
  'Magnus', 'Garry', 'Bobby', 'Mikhail', 'Anatoly', 'Vishy', 'Hikaru',
  'Deep', 'Stockfish', 'Leela', 'Komodo', 'Fritz', 'Houdini',
  'Pixel', 'Byte', 'Binary', 'Quantum', 'Neural', 'Matrix',
];

const BOT_SUFFIXES = [
  'Bot', 'AI', 'Engine', 'Mind', 'Genius', 'Master', 'Pro', 'X',
  '2048', 'Player', 'Slider', 'Merger', 'Tiler', 'Champion',
];

export function generateBotName(): string {
  const firstName = BOT_FIRST_NAMES[Math.floor(Math.random() * BOT_FIRST_NAMES.length)];
  const suffix = BOT_SUFFIXES[Math.floor(Math.random() * BOT_SUFFIXES.length)];
  return `${firstName}${suffix}`;
}

export function generateBotElo(playerElo: number): number {
  // Generate ELO within +/- 15 of player's ELO
  const offset = Math.floor(Math.random() * 31) - 15; // -15 to +15
  return Math.max(100, playerElo + offset);
}

export interface BotGameState {
  grid: number[];
  score: number;
  gameOver: boolean;
  won: boolean;
  elo: number; // Bot's ELO affects difficulty
}

function idx(r: number, c: number): number {
  return r * SIZE + c;
}

function cloneGrid(grid: number[]): number[] {
  return [...grid];
}

function addRandomTile(grid: number[]): boolean {
  const empty: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (grid[i] === 0) empty.push(i);
  }
  if (empty.length === 0) return false;
  const i = empty[Math.floor(Math.random() * empty.length)];
  grid[i] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

function canMove(grid: number[]): boolean {
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (grid[i] === 0) return true;
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[idx(r, c)];
      if (c < SIZE - 1 && grid[idx(r, c + 1)] === v) return true;
      if (r < SIZE - 1 && grid[idx(r + 1, c)] === v) return true;
    }
  }
  return false;
}

// Returns [moved, scoreGained, newGrid]
function simulateMove(grid: number[], dir: number): [boolean, number, number[]] {
  const newGrid = cloneGrid(grid);
  let moved = false;
  let scoreGained = 0;

  let dr = 0, dc = 0, rStart = 0, rEnd = SIZE, rStep = 1, cStart = 0, cEnd = SIZE, cStep = 1;

  if (dir === 0) { dc = -1; cStart = 1; } // Left
  else if (dir === 1) { dc = 1; cStart = SIZE - 2; cEnd = -1; cStep = -1; } // Right
  else if (dir === 2) { dr = -1; rStart = 1; } // Up
  else { dr = 1; rStart = SIZE - 2; rEnd = -1; rStep = -1; } // Down

  const merged = new Array(SIZE * SIZE).fill(false);

  for (let r = rStart; r !== rEnd; r += rStep) {
    for (let c = cStart; c !== cEnd; c += cStep) {
      const i = idx(r, c);
      if (newGrid[i] === 0) continue;

      let nr = r, nc = c;
      while (true) {
        const nextR = nr + dr, nextC = nc + dc;
        if (nextR < 0 || nextR >= SIZE || nextC < 0 || nextC >= SIZE) break;
        const nextI = idx(nextR, nextC);
        if (newGrid[nextI] === 0) {
          nr = nextR;
          nc = nextC;
        } else if (newGrid[nextI] === newGrid[i] && !merged[nextI]) {
          nr = nextR;
          nc = nextC;
          break;
        } else break;
      }

      const ni = idx(nr, nc);
      if (ni !== i) {
        moved = true;
        if (newGrid[ni] === newGrid[i]) {
          newGrid[ni] *= 2;
          scoreGained += newGrid[ni];
          merged[ni] = true;
        } else {
          newGrid[ni] = newGrid[i];
        }
        newGrid[i] = 0;
      }
    }
  }

  return [moved, scoreGained, newGrid];
}

// Count empty cells
function countEmpty(grid: number[]): number {
  return grid.filter(v => v === 0).length;
}

// Get max tile
function getMaxTile(grid: number[]): number {
  return Math.max(...grid);
}

// Simple heuristic: score based on empty cells, max tile position, and monotonicity
function evaluateGrid(grid: number[]): number {
  let score = 0;

  // Reward empty cells
  score += countEmpty(grid) * 10;

  // Reward keeping max tile in corner
  const maxTile = getMaxTile(grid);
  const corners = [0, SIZE - 1, SIZE * (SIZE - 1), SIZE * SIZE - 1];
  for (const corner of corners) {
    if (grid[corner] === maxTile) {
      score += maxTile * 2;
      break;
    }
  }

  // Reward monotonicity (tiles decreasing from corner)
  // Check top-left corner monotonicity
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

// Simple look-ahead to find best move
function findBestMove(grid: number[]): number {
  const directions = [0, 1, 2, 3]; // left, right, up, down
  let bestDir = 0;
  let bestScore = -Infinity;

  for (const dir of directions) {
    const [moved, scoreGained, newGrid] = simulateMove(grid, dir);
    if (!moved) continue;

    // Simple 1-step lookahead: evaluate the resulting position
    let avgScore = scoreGained + evaluateGrid(newGrid);

    // Also consider the opponent's average tile placement (2-step lookahead)
    // by checking a few possible states after adding a random tile
    const empty = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      if (newGrid[i] === 0) empty.push(i);
    }

    if (empty.length > 0) {
      let futureScore = 0;
      const sampleSize = Math.min(3, empty.length);
      for (let s = 0; s < sampleSize; s++) {
        const testGrid = cloneGrid(newGrid);
        testGrid[empty[Math.floor(Math.random() * empty.length)]] = 2;

        // Find best move from this state
        let bestFutureMove = -Infinity;
        for (const dir2 of directions) {
          const [moved2, score2, grid2] = simulateMove(testGrid, dir2);
          if (moved2) {
            bestFutureMove = Math.max(bestFutureMove, score2 + evaluateGrid(grid2));
          }
        }
        if (bestFutureMove > -Infinity) {
          futureScore += bestFutureMove;
        }
      }
      avgScore += futureScore / sampleSize * 0.5;
    }

    if (avgScore > bestScore) {
      bestScore = avgScore;
      bestDir = dir;
    }
  }

  // If no valid move found via heuristic, try any valid move
  if (bestScore === -Infinity) {
    for (const dir of directions) {
      const [moved] = simulateMove(grid, dir);
      if (moved) return dir;
    }
  }

  return bestDir;
}

export function createInitialBotState(elo: number = 1200): BotGameState {
  const grid = new Array(SIZE * SIZE).fill(0);
  addRandomTile(grid);
  addRandomTile(grid);
  return {
    grid,
    score: 0,
    gameOver: false,
    won: false,
    elo,
  };
}

/**
 * Get the probability of making a smart (AI) move based on ELO.
 * Lower ELO = more random moves, Higher ELO = smarter moves.
 *
 * ELO 1000 = 30% smart moves (very easy)
 * ELO 1200 = 60% smart moves (medium)
 * ELO 1400 = 85% smart moves (hard)
 * ELO 1600+ = 95% smart moves (expert)
 */
function getSmartMoveProbability(elo: number): number {
  if (elo <= 1000) return 0.30;
  if (elo <= 1100) return 0.45;
  if (elo <= 1200) return 0.60;
  if (elo <= 1300) return 0.75;
  if (elo <= 1400) return 0.85;
  if (elo <= 1500) return 0.90;
  return 0.95; // 1600+
}

/**
 * Pick a random valid move (for lower ELO bots).
 */
function findRandomMove(grid: number[]): number {
  const validMoves: number[] = [];
  for (let dir = 0; dir < 4; dir++) {
    const [moved] = simulateMove(grid, dir);
    if (moved) validMoves.push(dir);
  }
  if (validMoves.length === 0) return 0;
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}

export function botMakeMove(state: BotGameState): BotGameState {
  if (state.gameOver || state.won) return state;

  // Determine move based on ELO difficulty
  const smartProb = getSmartMoveProbability(state.elo);
  const useSmart = Math.random() < smartProb;

  const dir = useSmart ? findBestMove(state.grid) : findRandomMove(state.grid);
  const [moved, scoreGained, newGrid] = simulateMove(state.grid, dir);

  if (!moved) {
    // No valid moves
    return {
      ...state,
      gameOver: true,
    };
  }

  // Add new tile
  addRandomTile(newGrid);

  const newScore = state.score + scoreGained;
  const won = newGrid.some(v => v >= 2048);
  const gameOver = !canMove(newGrid);

  return {
    grid: newGrid,
    score: newScore,
    gameOver,
    won: won || state.won,
    elo: state.elo,
  };
}
