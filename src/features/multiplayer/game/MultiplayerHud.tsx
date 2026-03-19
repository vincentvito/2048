"use client";

import React from "react";

/** Format seconds into MM:SS display */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface MultiplayerHudProps {
  myName: string;
  myScore: number;
  opponentName: string;
  opponentScore: number;
  timeLeft: number;
  gameStarted: boolean;
  opponentConnected: boolean;
  opponentEverConnected: boolean;
  statusText: string;
}

export default function MultiplayerHud({
  myName,
  myScore,
  opponentName,
  opponentScore,
  timeLeft,
  gameStarted,
  opponentConnected,
  opponentEverConnected,
  statusText,
}: MultiplayerHudProps) {
  const timerWarning = timeLeft < 30;
  const timerCritical = timeLeft < 10;
  const hudTimerClass = [
    "mp-hud-timer-display",
    timerWarning ? "warning" : "",
    timerCritical ? "critical" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const connectionStatusClass = opponentConnected
    ? "connected"
    : opponentEverConnected
      ? "disconnected"
      : "connecting";
  const connectionLabel = opponentConnected
    ? "Connected"
    : opponentEverConnected
      ? "Disconnected"
      : "Connecting...";

  return (
    <>
      <div className="mp-hud">
        {/* Local player */}
        <div className="mp-hud-player">
          <span className="mp-hud-name">{myName}</span>
          <span className="mp-hud-score">{myScore.toLocaleString()}</span>
        </div>

        {/* Centre: timer */}
        <div className="mp-hud-timer" aria-live="polite" aria-atomic="true">
          {gameStarted ? (
            <>
              <div className={hudTimerClass} aria-label={`${formatTime(timeLeft)} remaining`}>{formatTime(timeLeft)}</div>
              <div className="mp-hud-timer-label" aria-hidden="true">remaining</div>
            </>
          ) : (
            <div className="mp-hud-timer-display" aria-label="Waiting to start">—</div>
          )}
        </div>

        {/* Opponent */}
        <div className="mp-hud-opponent">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              justifyContent: "flex-end",
              width: "100%",
            }}
          >
            <span className={`mp-hud-status ${connectionStatusClass}`} aria-label={connectionLabel}>
              <span className="blob" aria-hidden="true" />
            </span>
            <span className="mp-hud-name" style={{ maxWidth: "none", flexShrink: 1 }}>
              {opponentName}
            </span>
          </div>
          <span className="mp-hud-score">{opponentScore.toLocaleString()}</span>
        </div>
      </div>
      {statusText && <div className="mp-status-bar" role="status" aria-live="polite">{statusText}</div>}
    </>
  );
}
