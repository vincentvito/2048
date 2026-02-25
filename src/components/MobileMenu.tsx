"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import Leaderboard from "./Leaderboard";
import HowToPlay from "./HowToPlay";
import { createClient } from "@/lib/supabase-client";

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
}: MobileMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [signInStep, setSignInStep] = useState<"idle" | "email" | "otp">("idle");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");

  const close = useCallback(() => {
    setOpen(false);
    setSignInStep("idle");
    setEmail("");
    setOtpCode("");
    setOtpError("");
  }, []);

  async function handleSendOtp() {
    if (!email.trim() || sending) return;
    const supabase = createClient();
    if (!supabase) return;
    setOtpError("");
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        setOtpError(error.message);
      } else {
        setSignInStep("otp");
      }
    } catch {
      setOtpError("Failed to send code");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim() || verifying) return;
    const supabase = createClient();
    if (!supabase) return;
    setOtpError("");
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: "email" });
      if (error) {
        setOtpError(error.message);
      } else {
        setSignInStep("idle");
        setEmail("");
        setOtpCode("");
      }
    } catch {
      setOtpError("Verification failed");
    } finally {
      setVerifying(false);
    }
  }

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
            ) : signInStep === "idle" ? (
              <button className="mobile-menu-signin" onClick={() => setSignInStep("email")}>
                Sign in to save scores
              </button>
            ) : signInStep === "email" ? (
              <div className="mobile-menu-signin-form">
                <p className="mobile-menu-signin-label">Enter your email</p>
                <input
                  className="mobile-menu-signin-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendOtp(); }}
                  autoFocus
                />
                {otpError && <p className="mobile-menu-signin-error">{otpError}</p>}
                <div className="mobile-menu-signin-actions">
                  <button className="mobile-menu-signin-back" onClick={() => { setSignInStep("idle"); setOtpError(""); }}>
                    Back
                  </button>
                  <button
                    className="mobile-menu-signin-submit"
                    onClick={handleSendOtp}
                    disabled={sending || !email.trim()}
                  >
                    {sending ? "Sending…" : "Send Code"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mobile-menu-signin-form">
                <p className="mobile-menu-signin-label">Enter the code sent to {email}</p>
                <input
                  className="mobile-menu-signin-input mobile-menu-otp-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={10}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleVerifyOtp(); }}
                  autoFocus
                />
                {otpError && <p className="mobile-menu-signin-error">{otpError}</p>}
                <div className="mobile-menu-signin-actions">
                  <button className="mobile-menu-signin-back" onClick={() => { setSignInStep("email"); setOtpCode(""); setOtpError(""); }}>
                    Back
                  </button>
                  <button
                    className="mobile-menu-signin-submit"
                    onClick={handleVerifyOtp}
                    disabled={verifying || otpCode.length < 6}
                  >
                    {verifying ? "Verifying…" : "Sign In"}
                  </button>
                </div>
              </div>
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
