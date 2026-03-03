export type ThemeName = "classic" | "ocean" | "forest" | "midnight";

export interface ThemeColors {
  // Page & layout
  bgPage: string;
  bgGrid: string;
  bgCell: string;
  bgScore: string;
  bgCard: string;
  bgCardBorder: string;
  bgSegmented: string;

  // Buttons
  bgButton: string;
  bgButtonHover: string;
  buttonShadow: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textLabel: string;
  textBody: string;

  // Accent
  accent: string;
  accentLight: string;
  accentGlow: string;

  // Overlays
  overlayWin: string;
  overlayLose: string;
  modalBackdrop: string;
  modalBg: string;

  // Title gradient
  titleGradient: string;
  titleGlow: string;

  // Glow color for tiles 128+
  tileGlow: string;

  // Score popup text color
  popupColor: string;

  // Confetti colors for win celebration
  confettiColors: string[];

  // Tile colors: value -> [bg, text]
  tiles: Record<number, [string, string]>;
}

export const themes: Record<ThemeName, ThemeColors> = {
  classic: {
    bgPage: "#fffbeb",
    bgGrid: "#92400e",
    bgCell: "rgba(255,255,255,0.15)",
    bgScore: "#78350f",
    bgCard: "rgba(255, 251, 235, 0.8)",
    bgCardBorder: "rgba(251, 191, 36, 0.2)",
    bgSegmented: "#78350f",

    bgButton: "#d97706",
    bgButtonHover: "#b45309",
    buttonShadow: "rgba(180, 83, 9, 0.25)",

    textPrimary: "#78350f",
    textSecondary: "#92400e",
    textLabel: "#fde68a",
    textBody: "#451a03",

    accent: "#d97706",
    accentLight: "#f59e0b",
    accentGlow: "rgba(245, 158, 11, 0.25)",

    overlayWin: "rgba(237, 194, 46, 0.55)",
    overlayLose: "rgba(255, 251, 235, 0.78)",
    modalBackdrop: "rgba(69, 26, 3, 0.5)",
    modalBg: "#fffbeb",

    titleGradient: "linear-gradient(90deg, #f59e0b 0%, #ea580c 40%, #fbbf24 50%, #ea580c 60%, #f59e0b 100%)",
    titleGlow: "rgba(245, 158, 11, 0.4)",

    tileGlow: "rgba(243, 215, 116, ",
    popupColor: "#edc22e",
    confettiColors: ["#f59e0b", "#d97706", "#fbbf24", "#78350f", "#fde68a"],

    // Classic theme - bold distinct colors with hue shifts
    tiles: {
      0: ["rgba(238,228,218,0.35)", "#776e65"],
      2: ["#eee4da", "#776e65"],
      4: ["#eee1c9", "#776e65"],
      8: ["#f3b27a", "#f9f6f2"],
      16: ["#f69664", "#f9f6f2"],
      32: ["#f77c5f", "#f9f6f2"],
      64: ["#f75f3b", "#f9f6f2"],
      128: ["#edd073", "#f9f6f2"],
      256: ["#edcc62", "#f9f6f2"],
      512: ["#5cd1e5", "#f9f6f2"],
      1024: ["#24c1a0", "#f9f6f2"],
      2048: ["#ffd700", "#776e65"],
      4096: ["#ff3d7f", "#f9f6f2"],
      8192: ["#9b59b6", "#f9f6f2"],
    },
  },

  ocean: {
    bgPage: "#f0f9ff",
    bgGrid: "#164e63",
    bgCell: "rgba(255,255,255,0.15)",
    bgScore: "#155e75",
    bgCard: "rgba(240, 249, 255, 0.85)",
    bgCardBorder: "rgba(14, 165, 233, 0.2)",
    bgSegmented: "#155e75",

    bgButton: "#0891b2",
    bgButtonHover: "#0e7490",
    buttonShadow: "rgba(14, 116, 144, 0.25)",

    textPrimary: "#164e63",
    textSecondary: "#0e7490",
    textLabel: "#a5f3fc",
    textBody: "#083344",

    accent: "#0891b2",
    accentLight: "#22d3ee",
    accentGlow: "rgba(34, 211, 238, 0.25)",

    overlayWin: "rgba(34, 211, 238, 0.45)",
    overlayLose: "rgba(240, 249, 255, 0.78)",
    modalBackdrop: "rgba(8, 51, 68, 0.5)",
    modalBg: "#f0f9ff",

    titleGradient: "linear-gradient(90deg, #06b6d4 0%, #0284c7 40%, #22d3ee 50%, #0284c7 60%, #06b6d4 100%)",
    titleGlow: "rgba(6, 182, 212, 0.4)",

    tileGlow: "rgba(34, 211, 238, ",
    popupColor: "#22d3ee",
    confettiColors: ["#06b6d4", "#0891b2", "#22d3ee", "#164e63", "#a5f3fc"],

    // Ocean theme - distinct hues for each tier
    tiles: {
      0: ["rgba(207,250,254,0.35)", "#164e63"],
      2: ["#e0f7fa", "#164e63"],
      4: ["#b2ebf2", "#164e63"],
      8: ["#4dd0e1", "#f9f6f2"],
      16: ["#26c6da", "#f9f6f2"],
      32: ["#00bcd4", "#f9f6f2"],
      64: ["#00acc1", "#f9f6f2"],
      128: ["#0097a7", "#f9f6f2"],
      256: ["#00838f", "#f9f6f2"],
      512: ["#7e57c2", "#f9f6f2"],
      1024: ["#ab47bc", "#f9f6f2"],
      2048: ["#ffd54f", "#164e63"],
      4096: ["#ff7043", "#f9f6f2"],
      8192: ["#ec407a", "#f9f6f2"],
    },
  },

  forest: {
    bgPage: "#f0fdf4",
    bgGrid: "#14532d",
    bgCell: "rgba(255,255,255,0.15)",
    bgScore: "#166534",
    bgCard: "rgba(240, 253, 244, 0.85)",
    bgCardBorder: "rgba(34, 197, 94, 0.2)",
    bgSegmented: "#166534",

    bgButton: "#16a34a",
    bgButtonHover: "#15803d",
    buttonShadow: "rgba(21, 128, 61, 0.25)",

    textPrimary: "#14532d",
    textSecondary: "#166534",
    textLabel: "#bbf7d0",
    textBody: "#052e16",

    accent: "#16a34a",
    accentLight: "#4ade80",
    accentGlow: "rgba(74, 222, 128, 0.25)",

    overlayWin: "rgba(74, 222, 128, 0.45)",
    overlayLose: "rgba(240, 253, 244, 0.78)",
    modalBackdrop: "rgba(5, 46, 22, 0.5)",
    modalBg: "#f0fdf4",

    titleGradient: "linear-gradient(90deg, #22c55e 0%, #15803d 40%, #4ade80 50%, #15803d 60%, #22c55e 100%)",
    titleGlow: "rgba(34, 197, 94, 0.4)",

    tileGlow: "rgba(74, 222, 128, ",
    popupColor: "#4ade80",
    confettiColors: ["#22c55e", "#16a34a", "#4ade80", "#14532d", "#bbf7d0"],

    // Forest theme - distinct hues for each tier
    tiles: {
      0: ["rgba(220,252,231,0.35)", "#14532d"],
      2: ["#e8f5e9", "#2e7d32"],
      4: ["#c8e6c9", "#2e7d32"],
      8: ["#81c784", "#f9f6f2"],
      16: ["#66bb6a", "#f9f6f2"],
      32: ["#4caf50", "#f9f6f2"],
      64: ["#43a047", "#f9f6f2"],
      128: ["#388e3c", "#f9f6f2"],
      256: ["#2e7d32", "#f9f6f2"],
      512: ["#00acc1", "#f9f6f2"],
      1024: ["#26a69a", "#f9f6f2"],
      2048: ["#ffca28", "#2e7d32"],
      4096: ["#ff7043", "#f9f6f2"],
      8192: ["#ef5350", "#f9f6f2"],
    },
  },

  midnight: {
    bgPage: "#0f172a",
    bgGrid: "#1e293b",
    bgCell: "rgba(255,255,255,0.07)",
    bgScore: "#1e293b",
    bgCard: "rgba(30, 41, 59, 0.8)",
    bgCardBorder: "rgba(139, 92, 246, 0.2)",
    bgSegmented: "#1e293b",

    bgButton: "#7c3aed",
    bgButtonHover: "#6d28d9",
    buttonShadow: "rgba(124, 58, 237, 0.3)",

    textPrimary: "#e2e8f0",
    textSecondary: "#94a3b8",
    textLabel: "#c4b5fd",
    textBody: "#e2e8f0",

    accent: "#8b5cf6",
    accentLight: "#a78bfa",
    accentGlow: "rgba(139, 92, 246, 0.3)",

    overlayWin: "rgba(139, 92, 246, 0.45)",
    overlayLose: "rgba(15, 23, 42, 0.78)",
    modalBackdrop: "rgba(0, 0, 0, 0.6)",
    modalBg: "#1e293b",

    titleGradient: "linear-gradient(90deg, #a78bfa 0%, #ec4899 40%, #c084fc 50%, #ec4899 60%, #a78bfa 100%)",
    titleGlow: "rgba(167, 139, 250, 0.5)",

    tileGlow: "rgba(167, 139, 250, ",
    popupColor: "#c084fc",
    confettiColors: ["#8b5cf6", "#a78bfa", "#c084fc", "#ec4899", "#f59e0b"],

    // Midnight theme - vibrant neon progression
    tiles: {
      0: ["rgba(255,255,255,0.07)", "#94a3b8"],
      2: ["#3d3d5c", "#e2e8f0"],
      4: ["#4a4a6a", "#e2e8f0"],
      8: ["#7c3aed", "#f9f6f2"],
      16: ["#8b5cf6", "#f9f6f2"],
      32: ["#a855f7", "#f9f6f2"],
      64: ["#c026d3", "#f9f6f2"],
      128: ["#db2777", "#f9f6f2"],
      256: ["#e11d48", "#f9f6f2"],
      512: ["#06b6d4", "#f9f6f2"],
      1024: ["#10b981", "#f9f6f2"],
      2048: ["#fbbf24", "#1e1b4b"],
      4096: ["#f97316", "#f9f6f2"],
      8192: ["#ef4444", "#f9f6f2"],
    },
  },
};

export const themeNames: ThemeName[] = ["classic", "ocean", "forest", "midnight"];

export const themeLabels: Record<ThemeName, string> = {
  classic: "Classic",
  ocean: "Ocean",
  forest: "Forest",
  midnight: "Midnight",
};

// Preview colors used in the theme switcher thumbnails
export const themePreviewColors: Record<ThemeName, string[]> = {
  classic: ["#fef3c7", "#fde68a", "#fb923c", "#d97706"],
  ocean: ["#cffafe", "#67e8f9", "#06b6d4", "#0284c7"],
  forest: ["#dcfce7", "#86efac", "#22c55e", "#15803d"],
  midnight: ["#334155", "#7c3aed", "#ec4899", "#f59e0b"],
};
