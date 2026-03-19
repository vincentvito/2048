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

    bgButton: "#b45309",
    bgButtonHover: "#92400e",
    buttonShadow: "rgba(146, 64, 14, 0.3)",

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

    titleGradient:
      "linear-gradient(90deg, #f59e0b 0%, #ea580c 40%, #fbbf24 50%, #ea580c 60%, #f59e0b 100%)",
    titleGlow: "rgba(245, 158, 11, 0.4)",

    tileGlow: "rgba(243, 215, 116, ",
    popupColor: "#edc22e",
    confettiColors: ["#f59e0b", "#d97706", "#fbbf24", "#78350f", "#fde68a"],

    tiles: {
      0: ["rgba(255,255,255,0.15)", "#78350f"],
      2: ["#fef3c7", "#78350f"],
      4: ["#fde68a", "#78350f"],
      8: ["#fdba74", "#78350f"],
      16: ["#fb923c", "#fff"],
      32: ["#f97316", "#fff"],
      64: ["#ea580c", "#fff"],
      128: ["#fcd34d", "#78350f"],
      256: ["#fbbf24", "#78350f"],
      512: ["#f59e0b", "#fff"],
      1024: ["#d97706", "#fff"],
      2048: ["#b45309", "#fff"],
      4096: ["#7c2d12", "#fff"],
      8192: ["#1c1917", "#fcd34d"],
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

    bgButton: "#0e7490",
    bgButtonHover: "#155e75",
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

    titleGradient:
      "linear-gradient(90deg, #06b6d4 0%, #0284c7 40%, #22d3ee 50%, #0284c7 60%, #06b6d4 100%)",
    titleGlow: "rgba(6, 182, 212, 0.4)",

    tileGlow: "rgba(34, 211, 238, ",
    popupColor: "#22d3ee",
    confettiColors: ["#06b6d4", "#0891b2", "#22d3ee", "#164e63", "#a5f3fc"],

    tiles: {
      0: ["rgba(255,255,255,0.15)", "#164e63"],
      2: ["#cffafe", "#164e63"],
      4: ["#a5f3fc", "#164e63"],
      8: ["#67e8f9", "#164e63"],
      16: ["#22d3ee", "#fff"],
      32: ["#06b6d4", "#fff"],
      64: ["#0891b2", "#fff"],
      128: ["#7dd3fc", "#164e63"],
      256: ["#38bdf8", "#164e63"],
      512: ["#0ea5e9", "#fff"],
      1024: ["#0284c7", "#fff"],
      2048: ["#0369a1", "#fff"],
      4096: ["#075985", "#fff"],
      8192: ["#0c4a6e", "#a5f3fc"],
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

    bgButton: "#15803d",
    bgButtonHover: "#166534",
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

    titleGradient:
      "linear-gradient(90deg, #22c55e 0%, #15803d 40%, #4ade80 50%, #15803d 60%, #22c55e 100%)",
    titleGlow: "rgba(34, 197, 94, 0.4)",

    tileGlow: "rgba(74, 222, 128, ",
    popupColor: "#4ade80",
    confettiColors: ["#22c55e", "#16a34a", "#4ade80", "#14532d", "#bbf7d0"],

    tiles: {
      0: ["rgba(255,255,255,0.15)", "#14532d"],
      2: ["#dcfce7", "#14532d"],
      4: ["#bbf7d0", "#14532d"],
      8: ["#86efac", "#14532d"],
      16: ["#4ade80", "#fff"],
      32: ["#22c55e", "#fff"],
      64: ["#16a34a", "#fff"],
      128: ["#fde68a", "#14532d"],
      256: ["#fbbf24", "#14532d"],
      512: ["#f59e0b", "#fff"],
      1024: ["#15803d", "#fff"],
      2048: ["#166534", "#fff"],
      4096: ["#14532d", "#fff"],
      8192: ["#052e16", "#bbf7d0"],
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

    titleGradient:
      "linear-gradient(90deg, #a78bfa 0%, #ec4899 40%, #c084fc 50%, #ec4899 60%, #a78bfa 100%)",
    titleGlow: "rgba(167, 139, 250, 0.5)",

    tileGlow: "rgba(167, 139, 250, ",
    popupColor: "#c084fc",
    confettiColors: ["#8b5cf6", "#a78bfa", "#c084fc", "#ec4899", "#f59e0b"],

    tiles: {
      0: ["rgba(255,255,255,0.07)", "#94a3b8"],
      2: ["#2d3a4f", "#e2e8f0"],
      4: ["#3d4b63", "#e2e8f0"],
      8: ["#7c3aed", "#fff"],
      16: ["#8b5cf6", "#fff"],
      32: ["#a78bfa", "#fff"],
      64: ["#c084fc", "#1e1b4b"],
      128: ["#ec4899", "#fff"],
      256: ["#f472b6", "#fff"],
      512: ["#f59e0b", "#1e1b4b"],
      1024: ["#6d28d9", "#fff"],
      2048: ["#5b21b6", "#fff"],
      4096: ["#4c1d95", "#e2e8f0"],
      8192: ["#2e1065", "#c084fc"],
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
