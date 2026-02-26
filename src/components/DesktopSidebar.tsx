"use client";

import React, { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import Leaderboard from "./Leaderboard";
import HowToPlay from "./HowToPlay";
import EmailSignIn from "./EmailSignIn";
import ThemeSwitcher from "./ThemeSwitcher";
import { ThemeName } from "@/lib/themes";

interface DesktopSidebarProps {
  session: Session | null;
  currentScore: number;
  activeGridSize: number;
  refreshTrigger: number;
  onSignOut: () => void;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onScoresLoaded?: (scores: number[]) => void;
}

export default function DesktopSidebar({
  session,
  currentScore,
  activeGridSize,
  refreshTrigger,
  onSignOut,
  theme,
  onThemeChange,
  onScoresLoaded,
}: DesktopSidebarProps): React.ReactElement {
  const [showSignIn, setShowSignIn] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Read persisted state on mount (avoid hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem("2048_sidebar_collapsed") === "1";
    if (saved) setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("2048_sidebar_collapsed", collapsed ? "1" : "0");
    document.querySelector(".page-layout")?.classList.toggle("sidebar-collapsed", collapsed);
  }, [collapsed]);

  const displayName = session
    ? ((session.user.user_metadata?.username as string) || session.user.email?.split("@")[0] || "Player")
    : null;

  return (
    <>
      {/* Hamburger button — visible only when sidebar is collapsed */}
      {collapsed && (
        <button
          className="sidebar-hamburger"
          onClick={() => setCollapsed(false)}
          aria-label="Open sidebar"
        >
          <span /><span /><span />
        </button>
      )}

      <aside className={`desktop-sidebar${collapsed ? " collapsed" : ""}`}>
        {/* Header with title + close arrow */}
        <div className="sidebar-header">
          <span className="sidebar-header-title">Menu</span>
          <button
            className="sidebar-close"
            onClick={() => setCollapsed(true)}
            aria-label="Close sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3L5 9l7 6" />
            </svg>
          </button>
        </div>

        <div className="desktop-sidebar-inner">
          {/* Auth section */}
          <div className="sidebar-auth">
            {session ? (
              <>
                <div className="sidebar-user">
                  <div className="sidebar-avatar">
                    {(displayName?.[0] ?? "P").toUpperCase()}
                  </div>
                  <span className="sidebar-username">{displayName}</span>
                </div>
                <button className="sidebar-signout" onClick={onSignOut}>
                  Sign Out
                </button>
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
              isSignedIn={!!session}
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
