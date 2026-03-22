"use client";

import Link from "next/link";
import React, { useState, useEffect, useCallback } from "react";
import Leaderboard from "./Leaderboard";
import HowToPlay from "./HowToPlay";
import EmailSignIn from "./EmailSignIn";
import ThemeSwitcher from "./ThemeSwitcher";
import { ThemeName } from "@/lib/themes";
import { type AppUser, getDisplayName } from "@/features/auth/types";
import { useParticles } from "./EmojiParticles";
import { useHapticsEnabled } from "@/hooks/useHapticsEnabled";

interface MobileMenuProps {
  user: AppUser | null;
  currentScore: number;
  activeGridSize: number;
  refreshTrigger: number;
  onSignOut: () => void;
  onSignIn: () => void;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

export default function MobileMenu({
  user,
  currentScore,
  activeGridSize,
  refreshTrigger,
  onSignOut,
  theme,
  onThemeChange,
}: MobileMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const { enabled: particlesEnabled, setEnabled: setParticlesEnabled } = useParticles();
  const { hapticsEnabled, setHapticsEnabled } = useHapticsEnabled();

  const close = useCallback(() => {
    setOpen(false);
    setShowSignIn(false);
  }, []);

  // Trap body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const displayName = user ? getDisplayName(user) : null;

  return (
    <>
      {/* Hamburger trigger — mobile only */}
      <button
        className="mobile-menu-trigger"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        aria-expanded={open}
      >
        <span />
        <span />
        <span />
      </button>

      {/* Backdrop */}
      {open && <div className="mobile-menu-backdrop" onClick={close} aria-hidden="true" />}

      {/* Drawer */}
      <div
        className={`mobile-menu-drawer ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        {/* Header */}
        <div className="mobile-menu-header">
          <span className="mobile-menu-title">Menu</span>
          <button className="mobile-menu-close" onClick={close} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 4L16 16M16 4L4 16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mobile-menu-body">
          {/* Auth section */}
          <div className="mobile-menu-auth">
            {user ? (
              <>
                <div className="mobile-menu-user">
                  <div className="mobile-menu-avatar">
                    {(displayName?.[0] ?? "P").toUpperCase()}
                  </div>
                  <span className="mobile-menu-username">{displayName}</span>
                </div>
                <div className="mobile-menu-auth-actions">
                  <Link href="/stats" className="mobile-menu-profile-link" onClick={close}>
                    My Stats
                  </Link>
                  <button
                    className="mobile-menu-signout"
                    onClick={() => {
                      onSignOut();
                      close();
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : !showSignIn ? (
              <button className="mobile-menu-signin" onClick={() => setShowSignIn(true)}>
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

          <div className="mobile-menu-divider" />

          {/* Leaderboard */}
          <div className="mobile-menu-section">
            <h3 className="mobile-menu-section-title">Leaderboard</h3>
            <Leaderboard
              refreshTrigger={refreshTrigger}
              currentScore={currentScore}
              gridSize={activeGridSize}
              isSignedIn={!!user}
            />
          </div>

          <div className="mobile-menu-divider" />

          {/* Theme */}
          <div className="mobile-menu-section">
            <h3 className="mobile-menu-section-title">Theme</h3>
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

          <div className="mobile-menu-divider" />

          {/* How to play */}
          <div className="mobile-menu-section">
            <HowToPlay />
          </div>
        </div>
      </div>
    </>
  );
}
