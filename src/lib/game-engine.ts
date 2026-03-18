/**
 * Pure 2048 game engine — zero DOM, zero IO.
 * Shared between browser (Game2048 component) and PartyKit server.
 */

export interface EngineState {
  grid: number[];
  score: number;
  gameOver: boolean;
  won: boolean;
  size: number;
}

export interface MoveResult {
  moved: boolean;
  scoreGained: number;
  newGrid: number[];
  mergedPositions: number[];
}

function idx(r: number, c: number, size: number): number {
  return r * size + c;
}

/** Create an empty grid of the given size. */
export function createGrid(size: number): number[] {
  return new Array(size * size).fill(0);
}

/** Add a random tile (90% chance of 2, 10% chance of 4) to an empty cell. Returns false if no space. */
export function addRandomTile(grid: number[], size: number): boolean {
  const empty: number[] = [];
  for (let i = 0; i < size * size; i++) {
    if (grid[i] === 0) empty.push(i);
  }
  if (empty.length === 0) return false;
  const i = empty[Math.floor(Math.random() * empty.length)];
  grid[i] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

/** Check if any move is possible. */
export function canMove(grid: number[], size: number): boolean {
  for (let i = 0; i < size * size; i++) {
    if (grid[i] === 0) return true;
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[idx(r, c, size)];
      if (c < size - 1 && grid[idx(r, c + 1, size)] === v) return true;
      if (r < size - 1 && grid[idx(r + 1, c, size)] === v) return true;
    }
  }
  return false;
}

/** Check if any tile has reached 2048. */
export function checkWin(grid: number[]): boolean {
  return grid.some((v) => v >= 2048);
}

/**
 * Simulate a move in the given direction.
 * Directions: 0=left, 1=right, 2=up, 3=down.
 * Returns the result without mutating the original grid.
 */
export function simulateMove(grid: number[], size: number, direction: number): MoveResult {
  const newGrid = [...grid];
  let moved = false;
  let scoreGained = 0;
  const mergedPositions: number[] = [];

  let dr = 0,
    dc = 0,
    rStart = 0,
    rEnd = size,
    rStep = 1,
    cStart = 0,
    cEnd = size,
    cStep = 1;

  if (direction === 0) {
    dc = -1;
    cStart = 1;
  } else if (direction === 1) {
    dc = 1;
    cStart = size - 2;
    cEnd = -1;
    cStep = -1;
  } else if (direction === 2) {
    dr = -1;
    rStart = 1;
  } else {
    dr = 1;
    rStart = size - 2;
    rEnd = -1;
    rStep = -1;
  }

  const merged = new Array(size * size).fill(false);

  for (let r = rStart; r !== rEnd; r += rStep) {
    for (let c = cStart; c !== cEnd; c += cStep) {
      const i = idx(r, c, size);
      if (newGrid[i] === 0) continue;

      let nr = r,
        nc = c;
      while (true) {
        const nextR = nr + dr,
          nextC = nc + dc;
        if (nextR < 0 || nextR >= size || nextC < 0 || nextC >= size) break;
        const nextI = idx(nextR, nextC, size);
        if (newGrid[nextI] === 0) {
          nr = nextR;
          nc = nextC;
        } else if (newGrid[nextI] === newGrid[i] && !merged[nextI]) {
          nr = nextR;
          nc = nextC;
          break;
        } else break;
      }

      const ni = idx(nr, nc, size);
      if (ni !== i) {
        moved = true;
        if (newGrid[ni] === newGrid[i]) {
          newGrid[ni] *= 2;
          scoreGained += newGrid[ni];
          merged[ni] = true;
          mergedPositions.push(ni);
        } else {
          newGrid[ni] = newGrid[i];
        }
        newGrid[i] = 0;
      }
    }
  }

  return { moved, scoreGained, newGrid, mergedPositions };
}

/** Create a fresh game state with 2 random tiles. */
export function createInitialState(size: number = 4): EngineState {
  const grid = createGrid(size);
  addRandomTile(grid, size);
  addRandomTile(grid, size);
  return {
    grid,
    score: 0,
    gameOver: false,
    won: false,
    size,
  };
}

/** Apply a move direction and return the new state. Does not mutate the input. */
export function applyMove(state: EngineState, direction: number): EngineState {
  const { moved, scoreGained, newGrid } = simulateMove(state.grid, state.size, direction);

  if (!moved) return state;

  addRandomTile(newGrid, state.size);

  const newScore = state.score + scoreGained;
  const won = checkWin(newGrid);
  const gameOver = !canMove(newGrid, state.size);

  return {
    grid: newGrid,
    score: newScore,
    gameOver,
    won: won || state.won,
    size: state.size,
  };
}
