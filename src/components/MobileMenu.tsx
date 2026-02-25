"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import Leaderboard from "./Leaderboard";
import HowToPlay from "./HowToPlay";

interface MobileMenuProps {
  session: Session | null;
  currentScore: number;
  activeGridSize: number;
  refreshTrigger: number;
  onSignOut: () => void;
  onSignIn: () => void;
}

export default function MobileMenu({
  session,
  currentScore,
  activeGridSize,
  refreshTrigger,
  onSignOut,
  onSignIn,
}: MobileMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Trap body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const displayName = session
    ? ((session.user.user_metadata?.username as string) || session.user.email?.split("@")[0] || "Player")
    : null;

  return (
    <>
      {/* Hamburger trigger — mobile only */}
      <button
        className="mobile-menu-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <span /><span /><span />
      </button>

      {/* Backdrop */}
      {open && (
        <div className="mobile-menu-backdrop" onClick={close} aria-hidden="true" />
      )}

      {/* Drawer */}
      <div className={`mobile-menu-drawer ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Menu">
        {/* Header */}
        <div className="mobile-menu-header">
          <span className="mobile-menu-title">Menu</span>
          <button className="mobile-menu-close" onClick={close} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mobile-menu-body">
          {/* Auth section */}
          <div className="mobile-menu-auth">
            {session ? (
              <>
                <div className="mobile-menu-user">
                  <div className="mobile-menu-avatar">
                    {(displayName?.[0] ?? "P").toUpperCase()}
                  </div>
                  <span className="mobile-menu-username">{displayName}</span>
                </div>
                <button className="mobile-menu-signout" onClick={() => { onSignOut(); close(); }}>
                  Sign Out
                </button>
              </>
            ) : (
              <button className="mobile-menu-signin" onClick={() => { onSignIn(); close(); }}>
                Sign in to save scores
              </button>
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
            />
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
