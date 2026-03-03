"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { ThemeColors, themes } from "@/lib/themes";

const GAP = 12;
const ANIM_DURATION = 50;
const PULSE_DURATION = 120;
const MOVE_DELAY = 60;
const REPEAT_DELAY = 200;
const MIN_SWIPE_DISTANCE = 15;
const DIR_MAP: Record<string, number> = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3 };

interface Tile {
  value: number;
  r: number;
  c: number;
  fromR: number;
  fromC: number;
  scale: number;
  merged: boolean;
}

interface ScorePopup {
  value: number;
  x: number;
  y: number;
  opacity: number;
  offsetY: number;
  startTime: number;
}

export interface GameState {
  grid: number[];
  score: number;
  gameOver: boolean;
  won: boolean;
}

interface Game2048Props {
  onGameOver?: (score: number, gridSize: number) => void;
  onGameWon?: (score: number, gridSize: number) => void;
  onResetReady?: (resetFn: () => void) => void;
  readOnlyState?: GameState | null;
  onStateChange?: (state: GameState) => void;
  disableInputs?: boolean;
  onDevEndGameReady?: (fn: () => void) => void;
  hideScore?: boolean;
  initialSize?: number;
  themeName?: string;
  miniMode?: boolean;
}

export default function Game2048({ onGameOver, onGameWon, onResetReady, readOnlyState, onStateChange, disableInputs, onDevEndGameReady, hideScore, initialSize = 4, themeName = "classic", miniMode = false }: Game2048Props): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scoreElRef = useRef<HTMLElement>(null);
  const bestElRef = useRef<HTMLElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);
  const onGameOverRef = useRef(onGameOver);
  const onGameWonRef = useRef(onGameWon);
  const onResetReadyRef = useRef(onResetReady);
  const onStateChangeRef = useRef(onStateChange);
  const disableInputsRef = useRef(disableInputs);
  const onDevEndGameReadyRef = useRef(onDevEndGameReady);
  const initialReadOnlyRef = useRef(!!readOnlyState);
  const [displaySize, setDisplaySize] = useState(4);
  const themeRef = useRef<ThemeColors>(themes[(themeName as keyof typeof themes)] || themes.classic);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    onGameWonRef.current = onGameWon;
  }, [onGameWon]);

  useEffect(() => {
    onResetReadyRef.current = onResetReady;
  }, [onResetReady]);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    disableInputsRef.current = disableInputs;
  }, [disableInputs]);

  useEffect(() => {
    onDevEndGameReadyRef.current = onDevEndGameReady;
  }, [onDevEndGameReady]);

  // Update theme ref and re-render canvas when theme changes
  useEffect(() => {
    themeRef.current = themes[(themeName as keyof typeof themes)] || themes.classic;
    const container = containerRef.current;
    if (container) {
      const renderFn = (container as unknown as Record<string, () => void>)._rerender;
      renderFn?.();
    }
  }, [themeName]);

  // Hook to handle readOnlyState changes
  useEffect(() => {
    if (readOnlyState && containerRef.current) {
      const updateFn = (containerRef.current as any)._updateState;
      if (updateFn) updateFn(readOnlyState);
    }
  }, [readOnlyState]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const container = containerRef.current!;
    const scoreEl = scoreElRef.current;
    const bestEl = bestElRef.current;

    const dpr = window.devicePixelRatio || 1;

    let SIZE = 4;
    let CELL = 100;
    let GRID_SIZE = 0;
    let grid = new Uint16Array(16);
    let score = 0;
    let best = (() => {
      try { return Number(localStorage.getItem("2048_best_overall")) || 0; } catch { return 0; }
    })();
    let gameOver = false;
    let won = false;
    let keepPlaying = false;
    const SAVE_KEY = "2048_game_state_";
    const tiles: Tile[] = [];
    const scorePopups: ScorePopup[] = [];
    let popupAnimFrame: number | null = null;
    let animating = false;
    let animStart = 0;

    function cellPos(i: number) {
      return GAP + i * (CELL + GAP);
    }

    function idx(r: number, c: number) {
      return r * SIZE + c;
    }

    function setSizeInternal(newSize: number) {
      SIZE = newSize;
      // Use available viewport width (minus padding) capped at a max container width
      const maxContainerWidth = newSize === 4 ? 480 : 640;
      const availableWidth = Math.min(window.innerWidth - 32, maxContainerWidth);
      const maxCell = Math.floor((availableWidth - (newSize + 1) * GAP) / newSize);
      const idealCell = newSize === 4 ? 100 : 64;
      CELL = Math.min(idealCell, maxCell);
      GRID_SIZE = SIZE * CELL + (SIZE + 1) * GAP;
      canvas.width = GRID_SIZE * dpr;
      canvas.height = GRID_SIZE * dpr;
      canvas.style.width = GRID_SIZE + "px";
      canvas.style.height = GRID_SIZE + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      grid = new Uint16Array(SIZE * SIZE);
      setDisplaySize(newSize);
    }

    function addTile() {
      const empty: number[] = [];
      const total = SIZE * SIZE;
      for (let i = 0; i < total; i++) {
        if (grid[i] === 0) empty.push(i);
      }
      if (empty.length === 0) return false;
      const i = empty[(Math.random() * empty.length) | 0];
      grid[i] = Math.random() < 0.9 ? 2 : 4;
      tiles.push({
        value: grid[i],
        r: (i / SIZE) | 0,
        c: i % SIZE,
        fromR: (i / SIZE) | 0,
        fromC: i % SIZE,
        scale: 0,
        merged: false,
      });
      return true;
    }

    function updateScore() {
      if (scoreEl) scoreEl.textContent = String(score);
      if (score > best) {
        best = score;
        try { localStorage.setItem("2048_best_overall", String(best)); } catch { /* noop */ }
      }
      if (bestEl) bestEl.textContent = String(best);
    }

    function announce(message: string) {
      const el = announcementRef.current;
      if (el) {
        el.textContent = "";
        // Force reflow so screen readers re-announce even if text is same
        void el.offsetHeight;
        el.textContent = message;
      }
    }

    function saveState() {
      try {
        localStorage.setItem(SAVE_KEY + SIZE, JSON.stringify({
          grid: Array.from(grid), score, gameOver, won, keepPlaying,
        }));
      } catch { /* noop */ }
    }

    function restoreState(): boolean {
      try {
        const saved = localStorage.getItem(SAVE_KEY + SIZE);
        if (!saved) return false;
        const state = JSON.parse(saved);
        if (!state.grid || state.grid.length !== SIZE * SIZE) return false;
        for (let i = 0; i < state.grid.length; i++) grid[i] = state.grid[i];
        score = state.score || 0;
        gameOver = !!state.gameOver;
        won = !!state.won;
        keepPlaying = !!state.keepPlaying;
        tiles.length = 0;
        for (let i = 0; i < grid.length; i++) {
          if (grid[i] !== 0) {
            tiles.push({
              value: grid[i], r: (i / SIZE) | 0, c: i % SIZE,
              fromR: (i / SIZE) | 0, fromC: i % SIZE, scale: 1, merged: false,
            });
          }
        }
        updateScore();
        render();
        onStateChangeRef.current?.({ grid: Array.from(grid), score, gameOver, won });
        return true;
      } catch { return false; }
    }

    function renderPopups() {
      const now = performance.now();
      // Total popup lifetime: 800ms. Stays fully opaque for the first 600ms,
      // then fades out over the final 200ms. Y travel uses ease-out so the
      // popup launches fast and decelerates to a stop — feels snappy, not floaty.
      const POPUP_TOTAL = 800;
      const POPUP_FADE_START = 600; // ms before fade begins
      const POPUP_TRAVEL = 44;     // total pixels to float upward

      for (let i = scorePopups.length - 1; i >= 0; i--) {
        const p = scorePopups[i];
        const elapsed = now - p.startTime;

        if (elapsed >= POPUP_TOTAL) {
          scorePopups.splice(i, 1);
          continue;
        }

        // Travel fraction with ease-out (decelerates): fast rise then slows
        const tTravel = elapsed / POPUP_TOTAL;
        const eased = 1 - Math.pow(1 - tTravel, 2); // quadratic ease-out
        p.offsetY = POPUP_TRAVEL * eased;

        // Opacity: fully visible until POPUP_FADE_START, then quick linear fade
        if (elapsed < POPUP_FADE_START) {
          p.opacity = 1;
        } else {
          p.opacity = 1 - (elapsed - POPUP_FADE_START) / (POPUP_TOTAL - POPUP_FADE_START);
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.font = "bold 18px 'Clear Sans', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Dark shadow for legibility
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillText("+" + p.value, p.x + 1, p.y - p.offsetY + 1);

        // Themed popup text
        ctx.fillStyle = themeRef.current.popupColor;
        ctx.fillText("+" + p.value, p.x, p.y - p.offsetY);
        ctx.restore();
      }

      // Drive the popup animation with its own rAF loop only when the tile-move
      // animation is not running (animate() handles rendering during moves).
      if (scorePopups.length > 0 && !animating) {
        popupAnimFrame = requestAnimationFrame(popupLoop);
      } else {
        popupAnimFrame = null;
      }
    }

    function popupLoop() {
      // Redraw the static board, then paint popups on top — one draw per frame.
      renderBoard();
      renderPopups();
    }

    function canMove() {
      const total = SIZE * SIZE;
      for (let i = 0; i < total; i++) {
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

    // renderBoard draws the grid background and all tiles at animation position t.
    // It does NOT draw popups — callers are responsible for calling renderPopups()
    // afterwards so popups are painted exactly once per frame.
    function renderBoard(t = 1) {
      const theme = themeRef.current;
      ctx.fillStyle = theme.bgGrid;
      ctx.beginPath();
      ctx.roundRect(0, 0, GRID_SIZE, GRID_SIZE, 16);
      ctx.fill();

      ctx.fillStyle = theme.bgCell;
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          ctx.beginPath();
          ctx.roundRect(cellPos(c), cellPos(r), CELL, CELL, 12);
          ctx.fill();
        }
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const tile of tiles) {
        const x = cellPos(tile.fromC) + (cellPos(tile.c) - cellPos(tile.fromC)) * t;
        const y = cellPos(tile.fromR) + (cellPos(tile.r) - cellPos(tile.fromR)) * t;

        let scale = tile.scale;
        if (tile.fromR === tile.r && tile.fromC === tile.c && tile.scale === 0) {
          scale = t;
        } else if (tile.merged) {
          const elapsed = performance.now() - animStart;
          const pulseT = Math.min(1, elapsed / PULSE_DURATION);
          scale = 1 + 0.15 * Math.sin(Math.PI * pulseT);
        }

        const colors = theme.tiles[tile.value] || [theme.bgButton, "#fff"];
        const cx = x + CELL / 2;
        const cy = y + CELL / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        // Progressive glow for tiles 128+ (inspired by original 2048 box-shadow)
        if (tile.value >= 128) {
          const power = Math.log2(tile.value); // 128=7, 256=8, ..., 2048=11
          const glowAlpha = Math.min(1, 0.15 + 0.17 * (power - 7)); // 0.15 → 1.0
          const blur = 8 + 6 * (power - 7); // 8px → 32px
          ctx.shadowColor = `${theme.tileGlow}${glowAlpha})`;
          ctx.shadowBlur = blur;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        ctx.fillStyle = colors[0];
        ctx.beginPath();
        ctx.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 12);
        ctx.fill();

        // Reset shadow so it doesn't affect text
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        ctx.fillStyle = colors[1];
        const digits = String(tile.value).length;
        const fontSize = Math.max(10, Math.floor(
          CELL * (digits <= 1 ? 0.42 : digits === 2 ? 0.36 : digits === 3 ? 0.28 : digits === 4 ? 0.22 : 0.18)
        ));
        ctx.font = `bold ${fontSize}px system-ui`;
        ctx.fillText(String(tile.value), 0, 2);

        ctx.restore();
      }

      const winOverlay = container.querySelector<HTMLDivElement>(".overlay.win");
      const loseOverlay = container.querySelector<HTMLDivElement>(".overlay.lose");
      if (winOverlay) winOverlay.classList.toggle("show", won && !keepPlaying);
      if (loseOverlay) loseOverlay.classList.toggle("show", gameOver);
    }

    // render is the full composite: board + popups in one call.
    // Used by non-animation paths (init, resize, readOnly updates, etc.).
    function render(t = 1) {
      renderBoard(t);
      renderPopups();
    }

    function animate(now: number) {
      const moveT = Math.min((now - animStart) / ANIM_DURATION, 1);
      const ease = moveT < 0.5 ? 2 * moveT * moveT : 1 - Math.pow(-2 * moveT + 2, 2) / 2;
      const pulseT = (now - animStart) / PULSE_DURATION;

      // Draw board and popups exactly once per frame — renderPopups must not
      // schedule its own rAF while animating (the animating flag prevents that).
      renderBoard(ease);
      renderPopups();

      if (moveT < 1 || pulseT < 1) {
        requestAnimationFrame(animate);
      } else {
        animating = false;
        addTile();
        updateScore();
        announce("Score: " + score);
        if (!canMove()) {
          gameOver = true;
          onGameOverRef.current?.(score, SIZE);
          announce("Game over");
        }
        if (won && !keepPlaying) {
          announce("You reached 2048!");
        }
        // Final static draw — if popups are still live, renderPopups will
        // schedule popupLoop to keep them animated.
        renderBoard(1);
        renderPopups();
        onStateChangeRef.current?.({ grid: Array.from(grid), score, gameOver, won });
        saveState();
      }
    }

    function move(dir: number) {
      if (gameOver || animating) return false;

      tiles.length = 0;
      let moved = false;
      let dr = 0, dc = 0, rStart = 0, rEnd = SIZE, rStep = 1, cStart = 0, cEnd = SIZE, cStep = 1;

      if (dir === 0) { dc = -1; cStart = 1; }
      else if (dir === 1) { dc = 1; cStart = SIZE - 2; cEnd = -1; cStep = -1; }
      else if (dir === 2) { dr = -1; rStart = 1; }
      else { dr = 1; rStart = SIZE - 2; rEnd = -1; rStep = -1; }

      const merged = new Uint8Array(SIZE * SIZE);

      for (let r = rStart; r !== rEnd; r += rStep) {
        for (let c = cStart; c !== cEnd; c += cStep) {
          const i = idx(r, c);
          if (grid[i] === 0) continue;

          let nr = r, nc = c;
          while (true) {
            const nextR = nr + dr, nextC = nc + dc;
            if (nextR < 0 || nextR >= SIZE || nextC < 0 || nextC >= SIZE) break;
            const nextI = idx(nextR, nextC);
            if (grid[nextI] === 0) {
              nr = nextR;
              nc = nextC;
            } else if (grid[nextI] === grid[i] && !merged[nextI]) {
              nr = nextR;
              nc = nextC;
              break;
            } else break;
          }

          const ni = idx(nr, nc);
          if (ni !== i) {
            moved = true;
            if (grid[ni] === grid[i]) {
              grid[ni] *= 2;
              score += grid[ni];
              merged[ni] = 1;
              if (grid[ni] === 2048 && !won && !keepPlaying) {
                won = true;
                onGameWonRef.current?.(score, SIZE);
              }
              tiles.push({ value: grid[ni], r: nr, c: nc, fromR: r, fromC: c, scale: 1, merged: true });
              // Add floating score popup at the merge destination
              scorePopups.push({
                value: grid[ni],
                x: cellPos(nc) + CELL / 2,
                y: cellPos(nr) + CELL / 2,
                opacity: 1,
                offsetY: 0,
                startTime: performance.now(),
              });
            } else {
              grid[ni] = grid[i];
              tiles.push({ value: grid[i], r: nr, c: nc, fromR: r, fromC: c, scale: 1, merged: false });
            }
            grid[i] = 0;
          } else {
            tiles.push({ value: grid[i], r, c, fromR: r, fromC: c, scale: 1, merged: false });
          }
        }
      }

      const total = SIZE * SIZE;
      for (let i = 0; i < total; i++) {
        if (grid[i] !== 0 && !tiles.some((t) => t.r === ((i / SIZE) | 0) && t.c === i % SIZE)) {
          tiles.push({
            value: grid[i],
            r: (i / SIZE) | 0,
            c: i % SIZE,
            fromR: (i / SIZE) | 0,
            fromC: i % SIZE,
            scale: 1,
            merged: false,
          });
        }
      }

      if (moved) {
        animating = true;
        animStart = performance.now();
        // Cancel any standalone popup rAF loop — the animate() loop takes over
        // rendering (including popups) for the duration of the tile animation.
        if (popupAnimFrame !== null) {
          cancelAnimationFrame(popupAnimFrame);
          popupAnimFrame = null;
        }
        requestAnimationFrame(animate);
      }

      return moved;
    }

    function init() {
      grid.fill(0);
      tiles.length = 0;
      score = 0;
      gameOver = false;
      won = false;
      keepPlaying = false;
      addTile();
      addTile();
      if (SIZE === 8) { addTile(); addTile(); }
      updateScore();
      render();
      onStateChangeRef.current?.({ grid: Array.from(grid), score, gameOver, won });
      saveState();
    }

    // React buttons can't access the useEffect closure, so we attach game functions to the container DOM node
    (container as unknown as Record<string, (state: GameState) => void>)._updateState = (state: GameState) => {
      score = state.score;
      gameOver = state.gameOver;
      won = state.won;
      for (let i = 0; i < state.grid.length; i++) {
        grid[i] = state.grid[i];
      }
      tiles.length = 0;
      for (let i = 0; i < grid.length; i++) {
        if (grid[i] !== 0) {
          tiles.push({
            value: grid[i],
            r: (i / SIZE) | 0,
            c: i % SIZE,
            fromR: (i / SIZE) | 0,
            fromC: i % SIZE,
            scale: 1,
            merged: false,
          });
        }
      }
      updateScore();
      render(1);
    };

    (container as unknown as Record<string, () => void>)._rerender = () => render(1);
    (container as unknown as Record<string, () => void>)._init = init;
    (container as unknown as Record<string, () => void>)._keepPlaying = () => {
      keepPlaying = true;
      won = false;
      render();
      saveState();
    };
    (container as unknown as Record<string, (s: number) => void>)._toggleSize = (newSize: number) => {
      setSizeInternal(newSize);
      init();
    };
    (container as unknown as Record<string, () => number>)._getSize = () => SIZE;

    const keys = new Set<string>();
    let lastMove = 0;
    let repeatTimeout: ReturnType<typeof setTimeout> | null = null;
    let repeating = false;

    function processInput() {
      if (disableInputsRef.current || !repeating || keys.size === 0) return;
      const now = performance.now();
      if (now - lastMove < MOVE_DELAY) {
        requestAnimationFrame(processInput);
        return;
      }
      for (const key of keys) {
        if (DIR_MAP[key] !== undefined) {
          if (move(DIR_MAP[key])) lastMove = now;
          break;
        }
      }
      if (keys.size > 0 && repeating) requestAnimationFrame(processInput);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (disableInputsRef.current) return;
      if (DIR_MAP[e.key] !== undefined) {
        e.preventDefault();
        if (!keys.has(e.key)) {
          keys.add(e.key);
          move(DIR_MAP[e.key]);
          lastMove = performance.now();
          if (!repeatTimeout) {
            repeatTimeout = setTimeout(() => {
              repeating = true;
              processInput();
            }, REPEAT_DELAY);
          }
        }
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      keys.delete(e.key);
      if (keys.size === 0) {
        if (repeatTimeout) clearTimeout(repeatTimeout);
        repeatTimeout = null;
        repeating = false;
      }
    }

    let touchStartX = 0;
    let touchStartY = 0;
    // Flag: true while a touch that started inside this board is active.
    // Used by the document-level scroll-prevention handler below.
    let touchingBoard = false;

    function onTouchStart(e: TouchEvent) {
      if (disableInputsRef.current) return;
      touchingBoard = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      touchingBoard = false;
      if (disableInputsRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < MIN_SWIPE_DISTANCE) return;
      if (absDx > absDy) {
        move(dx > 0 ? 1 : 0);
      } else {
        move(dy > 0 ? 3 : 2);
      }
    }

    function onTouchCancel() {
      touchingBoard = false;
    }

    // Document-level touchmove with passive:false — this is the critical fix
    // for iOS Safari. After a page scroll iOS ignores preventDefault() on child
    // element handlers because it has already established a scroll context at
    // window level. A document-level passive:false listener fires before iOS
    // makes that decision, so preventDefault() is always honoured here.
    function preventScrollOnBoard(e: TouchEvent) {
      if (touchingBoard) e.preventDefault();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    // Only the active (non-read-only) board needs the document-level scroll
    // prevention. The opponent board in multiplayer is read-only — registering
    // this on it would add an extra no-op handler that could leak (Fix 4).
    if (!initialReadOnlyRef.current) {
      document.addEventListener("touchmove", preventScrollOnBoard, { passive: false });
    }
    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: false });
    container.addEventListener("touchcancel", onTouchCancel);

    // Resize board on orientation change / window resize
    function onResize() {
      setSizeInternal(SIZE);
      render(1);
    }
    window.addEventListener("resize", onResize);

    setSizeInternal(initialSize);
    if (!initialReadOnlyRef.current) {
      if (!restoreState()) init();
    } else {
      // Read-only mode: just render the empty grid, no random tiles
      render(1);
    }

    // Dev-only: fill board with random tiles and end the game
    function devEndGame() {
      const values = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
      tiles.length = 0;
      const total = SIZE * SIZE;
      score = Math.floor(Math.random() * 8000) + 2000;
      gameOver = true;
      won = false;
      keepPlaying = false;
      for (let i = 0; i < total; i++) {
        grid[i] = values[Math.floor(Math.random() * values.length)];
        tiles.push({
          value: grid[i],
          r: (i / SIZE) | 0,
          c: i % SIZE,
          fromR: (i / SIZE) | 0,
          fromC: i % SIZE,
          scale: 1,
          merged: false,
        });
      }
      updateScore();
      render(1);
      onGameOverRef.current?.(score, SIZE);
      onStateChangeRef.current?.({ grid: Array.from(grid), score, gameOver, won });
    }

    // Dev-only: preview all tile values to check font sizing
    function devPreviewTiles() {
      const allValues = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
      tiles.length = 0;
      const total = SIZE * SIZE;
      gameOver = false;
      won = false;
      keepPlaying = false;
      for (let i = 0; i < total; i++) {
        grid[i] = allValues[i % allValues.length];
        tiles.push({
          value: grid[i],
          r: (i / SIZE) | 0,
          c: i % SIZE,
          fromR: (i / SIZE) | 0,
          fromC: i % SIZE,
          scale: 1,
          merged: false,
        });
      }
      render(1);
    }

    // Dev-only: fill board to near game-over (one empty cell, no merges possible)
    // After one move, the game will naturally end
    function devAlmostGameOver() {
      // Checkerboard pattern of non-adjacent values - no merges possible
      const pattern = [
        2, 4, 2, 4,
        8, 16, 8, 16,
        2, 4, 2, 4,
        8, 16, 8, 0,  // Last cell empty
      ];
      tiles.length = 0;
      gameOver = false;
      won = false;
      keepPlaying = false;
      score = Math.floor(Math.random() * 3000) + 1000;
      for (let i = 0; i < pattern.length && i < SIZE * SIZE; i++) {
        grid[i] = pattern[i];
        if (grid[i] !== 0) {
          tiles.push({
            value: grid[i],
            r: (i / SIZE) | 0,
            c: i % SIZE,
            fromR: (i / SIZE) | 0,
            fromC: i % SIZE,
            scale: 1,
            merged: false,
          });
        }
      }
      updateScore();
      render(1);
      // Notify multiplayer of the state change
      onStateChangeRef.current?.({ grid: Array.from(grid), score, gameOver, won });
    }

    // Only expose dev functions for the local (non-read-only) board
    if (typeof window !== 'undefined' && !initialReadOnlyRef.current) {
      (window as any).__devPreviewTiles = devPreviewTiles;
      (window as any).__devAlmostGameOver = devAlmostGameOver;
    }
    onDevEndGameReadyRef.current?.(devEndGame);

    // Expose reset function to parent via callback
    onResetReadyRef.current?.(init);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      if (!initialReadOnlyRef.current) {
        document.removeEventListener("touchmove", preventScrollOnBoard, { passive: false } as EventListenerOptions);
      }
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchCancel);
      window.removeEventListener("resize", onResize);
      if (repeatTimeout) clearTimeout(repeatTimeout);
      if (popupAnimFrame) cancelAnimationFrame(popupAnimFrame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInit = useCallback(() => {
    const container = containerRef.current;
    if (container) (container as unknown as Record<string, () => void>)._init?.();
  }, []);

  const handleKeepPlaying = useCallback(() => {
    const container = containerRef.current;
    if (container) (container as unknown as Record<string, () => void>)._keepPlaying?.();
  }, []);

  const handleSizeToggle = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const getSize = (container as unknown as Record<string, () => number>)._getSize;
    const currentSize = getSize?.() ?? 4;
    const newSize = currentSize === 4 ? 8 : 4;
    (container as unknown as Record<string, (s: number) => void>)._toggleSize?.(newSize);
  }, []);

  return (
    <div className={`board-section${miniMode ? ' board-section-mini' : ''}`}>
      {/* Scores */}
      {!hideScore && (
        <div className="score-row">
          <div className="score-box">
            <span>Score</span>
            <strong ref={scoreElRef}>0</strong>
          </div>
          <div className="score-box">
            <span>Best</span>
            <strong ref={bestElRef}>0</strong>
          </div>
        </div>
      )}

      {/* Game board */}
      <div ref={containerRef} className="game-container">
        <canvas ref={canvasRef} className="game-canvas" role="grid" aria-label="2048 game board" />
        <div
          ref={announcementRef}
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        />
        <div className="overlay win">
          <h2>{readOnlyState ? 'Reached 2048!' : 'You Win!'}</h2>
          {/* Hide buttons in multiplayer mode — result modal handles actions */}
          {!onStateChange && !readOnlyState && (
            <div className="overlay-buttons">
              <button onClick={handleKeepPlaying}>Keep Playing</button>
              <button onClick={handleInit} className="secondary">New Game</button>
            </div>
          )}
        </div>
        <div className="overlay lose">
          <h2>{readOnlyState ? 'Ran out of moves' : 'Game Over!'}</h2>
          {/* Hide button in multiplayer mode — result modal handles actions */}
          {!onStateChange && !readOnlyState && <button onClick={handleInit}>Try Again</button>}
        </div>
      </div>

      {/* Controls */}
      <div className="button-row">
        <button onClick={handleInit} className="game-btn">
          New Game
        </button>
      </div>
    </div>
  );
}
