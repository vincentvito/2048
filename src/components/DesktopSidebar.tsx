"use client";

import Link from "next/link";
import React, { useState } from "react";
import Leaderboard, { LeaderboardEntry } from "./Leaderboard";
import HowToPlay from "./HowToPlay";
import EmailSignIn from "./EmailSignIn";
import ThemeSwitcher from "./ThemeSwitcher";
import { ThemeName } from "@/lib/themes";
import { type AppUser, getDisplayName } from "@/features/auth/types";
import { useParticles } from "./EmojiParticles";
import { useHapticsEnabled } from "@/hooks/useHapticsEnabled";

interface DesktopSidebarProps {
  user: AppUser | null;
  currentScore: number;
  activeGridSize: number;
  refreshTrigger: number;
  onSignOut: () => void;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onScoresLoaded?: (scores: LeaderboardEntry[]) => void;
}

export default function DesktopSidebar({
  user,
  currentScore,
  activeGridSize,
  refreshTrigger,
  onSignOut,
  theme,
  onThemeChange,
  onScoresLoaded,
}: DesktopSidebarProps): React.ReactElement {
  const [showSignIn, setShowSignIn] = useState(false);
  const { enabled: particlesEnabled, setEnabled: setParticlesEnabled } = useParticles();
  const { hapticsEnabled, setHapticsEnabled } = useHapticsEnabled();

  const displayName = user ? getDisplayName(user) : null;

  return (
    <>
      <aside className="desktop-sidebar" aria-label="Game menu">
        {/* Header with title */}
        <div className="sidebar-header">
          <span className="sidebar-header-title">Menu</span>
        </div>

        <div className="desktop-sidebar-inner">
          {/* Auth section */}
          <div className="sidebar-auth">
            {user ? (
              <>
                <div className="sidebar-user">
                  <div className="sidebar-avatar">{(displayName?.[0] ?? "P").toUpperCase()}</div>
                  <span className="sidebar-username">{displayName}</span>
                </div>
                <div className="sidebar-auth-actions">
                  <Link href="/stats" className="sidebar-profile-link">
                    My Stats
                  </Link>
                  <button className="sidebar-signout" onClick={onSignOut}>
                    Sign Out
                  </button>
                </div>
              </>
            ) : !showSignIn ? (
              <button className="sidebar-signin" onClick={() => setShowSignIn(true)}>
                Sign in to save scores
              </button>
            ) : (
              <EmailSignIn
                variant="mobile"
                onCancel={() => setShowSignIn(false)}
                onSuccess={() => setShowSignIn(false)}
              />
            )}
          </div>

          <div className="sidebar-divider" />

          {/* Theme */}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Theme</h3>
            <ThemeSwitcher current={theme} onChange={onThemeChange} />
            <label className="sidebar-toggle">
              <input
                type="checkbox"
                checked={particlesEnabled}
                onChange={(e) => setParticlesEnabled(e.target.checked)}
              />
              <span>Emoji Effects</span>
            </label>
            <label className="sidebar-toggle">
              <input
                type="checkbox"
                checked={hapticsEnabled}
                onChange={(e) => setHapticsEnabled(e.target.checked)}
              />
              <span>Haptic Feedback</span>
            </label>
          </div>

          <div className="sidebar-divider" />

          {/* Leaderboard */}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Leaderboard</h3>
            <Leaderboard
              refreshTrigger={refreshTrigger}
              onScoresLoaded={onScoresLoaded}
              currentScore={currentScore}
              gridSize={activeGridSize}
              isSignedIn={!!user}
            />
          </div>

          <div className="sidebar-divider" />

          {/* How to play */}
          <div className="sidebar-section">
            <HowToPlay />
          </div>
        </div>
      </aside>
    </>
  );
}
