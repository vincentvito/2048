"use client";

import React from "react";
import Game2048 from "@/components/Game2048";
import { themes, ThemeName } from "@/lib/themes";

/** Get tile colors from theme */
function getTileColors(value: number, theme: typeof themes.classic): [string, string] {
  const tileValues = [0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
  let closest = 0;
  for (const v of tileValues) {
    if (v <= value) closest = v;
  }
  return theme.tiles[closest] || theme.tiles[0];
}

/** Mini grid component for opponent preview */
export function MiniGrid({ grid, themeName }: { grid: number[]; themeName: ThemeName }) {
  const theme = themes[themeName];

  return (
    <div className="mini-grid" style={{ background: theme.bgGrid }}>
      {grid.slice(0, 16).map((value, i) => (
        <div key={i} className="mini-tile" style={{ background: getTileColors(value, theme)[0] }} />
      ))}
    </div>
  );
}

/** Expanded grid component for full opponent board view */
export function ExpandedGrid({ grid, themeName }: { grid: number[]; themeName: ThemeName }) {
  const theme = themes[themeName];

  const getFontSize = (value: number): string => {
    if (value === 0) return "0";
    const digits = String(value).length;
    if (digits <= 2) return "2rem";
    if (digits === 3) return "1.6rem";
    return "1.2rem";
  };

  return (
    <div className="expanded-grid" style={{ background: theme.bgGrid }}>
      {grid.slice(0, 16).map((value, i) => {
        const [bg, text] = getTileColors(value, theme);
        return (
          <div
            key={i}
            className="expanded-tile"
            style={{
              background: bg,
              color: text,
              fontSize: getFontSize(value),
            }}
          >
            {value > 0 ? value : ""}
          </div>
        );
      })}
    </div>
  );
}

interface OpponentPreviewProps {
  opponentState: { grid: number[]; score: number; gameOver: boolean; won: boolean } | null;
  opponentMoveDirection?: number | null;
  opponentName: string;
  opponentConnected: boolean;
  opponentEverConnected: boolean;
  opponentDone: boolean;
  timerExpired: boolean;
  hasForfeit: boolean;
  themeName: ThemeName;
  showExpanded: boolean;
  onToggleExpanded: (show: boolean) => void;
}

const emptyGrid = Array(16).fill(0);

export default function OpponentPreview({
  opponentState,
  opponentMoveDirection,
  opponentName,
  opponentConnected,
  opponentEverConnected,
  opponentDone,
  timerExpired,
  hasForfeit,
  themeName,
  showExpanded,
  onToggleExpanded,
}: OpponentPreviewProps) {
  const score = opponentState?.score || 0;

  return (
    <>
      {showExpanded && (
        <div
          className="mp-opponent-expanded-backdrop"
          onClick={() => onToggleExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${opponentName}'s board`}
        >
          <div className="mp-opponent-expanded-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mp-opponent-expanded-header">
              <span className="mp-opponent-expanded-name">{opponentName}</span>
              <span className="mp-opponent-expanded-score">{score.toLocaleString()}</span>
              <button
                className="mp-opponent-expanded-close"
                onClick={() => onToggleExpanded(false)}
                aria-label="Close opponent board"
              >
                &times;
              </button>
            </div>
            <div
              className={`mp-opponent-expanded-board ${opponentDone || timerExpired || hasForfeit ? "dimmed" : ""}`}
            >
              {!opponentConnected && (
                <div className="expanded-offline-overlay" role="status" aria-live="assertive">
                  {opponentEverConnected ? "Opponent disconnected..." : "Connecting..."}
                </div>
              )}
              <Game2048
                readOnlyState={
                  opponentState || { grid: emptyGrid, score: 0, gameOver: false, won: false }
                }
                readOnlyMoveDirection={opponentMoveDirection}
                disableInputs
                hideScore
                themeName={themeName}
                disableSave
                serverAuthoritative
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
