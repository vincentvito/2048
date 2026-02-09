"use client";

import React, { useState, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import Game2048 from "@/components/Game2048";
import UsernameInput from "@/components/UsernameInput";
import Leaderboard from "@/components/Leaderboard";
import { createClient } from "@/lib/supabase-client";

export default function Home(): React.ReactElement {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const usernameRef = useRef("");
  const userRef = useRef<User | null>(null);

  const handleUsernameChange = useCallback((username: string) => {
    usernameRef.current = username;
  }, []);

  const handleAuthChange = useCallback((user: User | null) => {
    userRef.current = user;
  }, []);

  const handleGameOver = useCallback(async (score: number, gridSize: number) => {
    const user = userRef.current;
    const username = usernameRef.current || user?.email?.split("@")[0] || "";

    if (user && score > 0 && username) {
      const supabase = createClient();
      if (supabase) {
        await supabase.from("scores").insert({
          username,
          score,
          grid_size: gridSize,
        });
        setRefreshTrigger((n) => n + 1);
      }
    } else if (!user && score > 100) {
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 5_000);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 gap-6">
      <h1 className="text-6xl font-extrabold text-amber-800" style={{ textShadow: "2px 2px 0 #fcd34d" }}>
        2048
      </h1>

      <UsernameInput onUsernameChange={handleUsernameChange} onAuthChange={handleAuthChange} />

      {showLoginPrompt && (
        <div className="bg-amber-100 border-2 border-amber-400 rounded-lg px-4 py-2 text-amber-800 text-sm font-medium animate-pulse">
          Login to save your score to the leaderboard!
        </div>
      )}

      <Game2048 onGameOver={handleGameOver} />

      <div className="mt-4">
        <h2 className="text-xl font-bold text-amber-800 text-center mb-3">Leaderboard</h2>
        <Leaderboard refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
