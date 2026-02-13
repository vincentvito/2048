"use client";

import React, { useState, useCallback } from "react";
import Game2048 from "@/components/Game2048";
import GameOverModal from "@/components/GameOverModal";
import Leaderboard from "@/components/Leaderboard";
import HowToPlay from "@/components/HowToPlay";

export default function Home(): React.ReactElement {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [gameResult, setGameResult] = useState<{
    open: boolean;
    won: boolean;
    score: number;
    gridSize: number;
  } | null>(null);

  const handleGameOver = useCallback((score: number, gridSize: number) => {
    setGameResult({ open: true, won: false, score, gridSize });
  }, []);

  const handleGameWon = useCallback((score: number, gridSize: number) => {
    setGameResult({ open: true, won: true, score, gridSize });
  }, []);

  const handleClose = useCallback(() => {
    setGameResult(null);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGameResult(null);
    window.location.reload();
  }, []);

  const handleKeepPlaying = useCallback(() => {
    setGameResult(null);
  }, []);

  return (
    <div className="container">
      <div className="top-section">
        <h1 className="game-title">2048</h1>
        <p className="game-intro">Join the tiles, get to <strong>2048!</strong></p>
      </div>

      <Game2048 onGameOver={handleGameOver} onGameWon={handleGameWon} />

      <p className="game-hint desktop-hint">
        Use your <strong>arrow keys</strong> to move the tiles.
      </p>
      <p className="game-hint mobile-hint">
        <strong>Swipe</strong> to move the tiles.
      </p>

      <div className="bottom-section">
        <HowToPlay />

        <div className="leaderboard-section">
          <h2 className="section-title">Leaderboard</h2>
          <Leaderboard refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {gameResult && (
        <GameOverModal
          open={gameResult.open}
          won={gameResult.won}
          score={gameResult.score}
          gridSize={gameResult.gridSize}
          onClose={handleClose}
          onPlayAgain={handlePlayAgain}
          onKeepPlaying={gameResult.won ? handleKeepPlaying : undefined}
        />
      )}
    </div>
  );
}
