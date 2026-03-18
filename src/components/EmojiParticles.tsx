"use client";

import React, { useRef, useEffect, useCallback, createContext, useContext, useState } from "react";

// ── Emoji sets for different events ──

const EMOJI_WIN = ["🎉", "🏆", "⭐", "🎊", "✨", "🥳", "🎉", "✨"];
const EMOJI_PERSONAL_BEST = ["🔥", "💥", "🏅", "🎯", "⚡", "🔥", "⚡"];
const EMOJI_DAILY_BEST = ["👑", "🥇", "🏆", "🌟", "💫", "👑", "🌟"];
const EMOJI_GAME_OVER = ["💀", "😵", "🫠"];

export type BurstPreset = "win" | "personalBest" | "dailyBest" | "gameOver";

const PRESETS: Record<BurstPreset, { emojis: string[]; count: number; spread: number; gravity: number; life: number }> = {
  win:          { emojis: EMOJI_WIN,           count: 16, spread: 12, gravity: 0.12, life: 100 },
  personalBest: { emojis: EMOJI_PERSONAL_BEST, count: 10, spread: 10, gravity: 0.12, life: 90 },
  dailyBest:    { emojis: EMOJI_DAILY_BEST,    count: 12, spread: 11, gravity: 0.12, life: 95 },
  gameOver:     { emojis: EMOJI_GAME_OVER,      count: 5,  spread: 6,  gravity: 0.18, life: 60 },
};

// ── Particle type ──

interface Particle {
  emoji: string;
  x: number;
  y: number;
  xv: number;
  yv: number;
  gravity: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  scale: number;
}

// ── Emoji cache for canvas rendering ──

const emojiCache = new Map<string, HTMLCanvasElement>();
const CACHE_SIZE = 64;

function getEmojiCanvas(emoji: string, dpr: number): HTMLCanvasElement {
  const key = emoji;
  if (emojiCache.has(key)) return emojiCache.get(key)!;

  const canvas = document.createElement("canvas");
  const size = CACHE_SIZE * Math.min(dpr, 2);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${size * 0.75}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.05);
  emojiCache.set(key, canvas);
  return canvas;
}

// ── localStorage key for toggle ──

const PARTICLES_ENABLED_KEY = "2048_particles_enabled";

function getStoredEnabled(): boolean {
  try {
    const v = localStorage.getItem(PARTICLES_ENABLED_KEY);
    return v === null ? true : v === "1";
  } catch { return true; }
}

// ── Context ──

interface ParticleContextValue {
  burst: (preset: BurstPreset, x?: number, y?: number) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

const ParticleContext = createContext<ParticleContextValue>({
  burst: () => {},
  enabled: true,
  setEnabled: () => {},
});

export function useParticles() {
  return useContext(ParticleContext);
}

// ── Provider + Canvas ──

export function ParticleProvider({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  // Initialize from localStorage synchronously to avoid flash
  const [enabled, setEnabledState] = useState(getStoredEnabled);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try { localStorage.setItem(PARTICLES_ENABLED_KEY, v ? "1" : "0"); } catch { /* noop */ }
  }, []);

  // Animation loop — syncs with external system (canvas), so useEffect is appropriate
  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const particles = particlesRef.current;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Physics
      p.x += p.xv;
      p.y += p.yv;
      p.yv += p.gravity;
      p.xv *= 0.98;
      p.yv *= 0.9;
      p.rotation += p.rotationSpeed;
      p.life--;

      // Scale: grow in, shrink out
      const lifeRatio = p.life / p.maxLife;
      if (lifeRatio > 0.9) {
        p.scale = (1 - lifeRatio) * 10;
      } else if (lifeRatio < 0.2) {
        p.scale = lifeRatio * 5;
      } else {
        p.scale = 1;
      }

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // Render
      const emojiCanvas = getEmojiCanvas(p.emoji, dpr);
      const drawSize = p.size * p.scale;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.min(1, lifeRatio * 3);
      ctx.drawImage(emojiCanvas, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    }

    if (particles.length > 0) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      rafRef.current = null;
    }
  }, []);

  const burst = useCallback((preset: BurstPreset, x?: number, y?: number) => {
    // Check enabled at call time via ref-like pattern (reads current state)
    if (!getStoredEnabled()) return;

    const config = PRESETS[preset];
    if (!config) return;

    const cx = x ?? window.innerWidth / 2;
    const cy = y ?? window.innerHeight / 2;

    for (let i = 0; i < config.count; i++) {
      const angle = (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * 0.5;
      const speed = config.spread * (0.5 + Math.random() * 0.5);

      particlesRef.current.push({
        emoji: config.emojis[Math.floor(Math.random() * config.emojis.length)],
        x: cx,
        y: cy,
        xv: Math.cos(angle) * speed,
        yv: Math.sin(angle) * speed - 4,
        size: 24 + Math.random() * 20,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        life: config.life + Math.floor(Math.random() * 20),
        maxLife: config.life + 20,
        scale: 0,
        gravity: config.gravity,
      });
    }

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [loop]);

  // Cleanup rAF on unmount — syncs with external system (rAF), effect is appropriate
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <ParticleContext.Provider value={{ burst, enabled, setEnabled }}>
      {children}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </ParticleContext.Provider>
  );
}
