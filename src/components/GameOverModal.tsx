"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";

interface GameOverModalProps {
  open: boolean;
  won: boolean;
  score: number;
  gridSize: number;
  onClose: () => void;
  onPlayAgain: () => void;
  onKeepPlaying?: () => void;
}

export default function GameOverModal({
  open,
  won,
  score,
  gridSize,
  onClose,
  onPlayAgain,
  onKeepPlaying,
}: GameOverModalProps): React.ReactElement | null {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setShowEmail(false);
      setEmail("");
      setEmailSent(false);
      setSending(false);
    }
  }, [open]);

  async function handleSendMagicLink() {
    if (!email.trim() || sending) return;

    const supabase = createClient();
    if (!supabase) return;

    setSending(true);
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback",
        },
      });
      setEmailSent(true);
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-result">{won ? "You Win!" : "Game Over"}</h2>

        <div className="modal-score">{score.toLocaleString()}</div>

        <span className="modal-badge">
          {gridSize}&times;{gridSize}
        </span>

        <p className="modal-desc">
          Sign in with email to appear on the leaderboard
        </p>

        {!showEmail ? (
          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn-secondary"
              onClick={() => setShowEmail(true)}
            >
              Sign in with Email
            </button>
            {won && onKeepPlaying ? (
              <button
                type="button"
                className="modal-btn-primary"
                onClick={onKeepPlaying}
              >
                Keep Playing
              </button>
            ) : (
              <button
                type="button"
                className="modal-btn-primary"
                onClick={onPlayAgain}
              >
                Play Again
              </button>
            )}
          </div>
        ) : emailSent ? (
          <div className="modal-email-section">
            <p style={{ color: "#22c55e", fontWeight: 600, margin: "0 0 12px" }}>
              Check your email for a magic link!
            </p>
            <button
              type="button"
              className="modal-btn-primary"
              onClick={onPlayAgain}
            >
              Play Again
            </button>
          </div>
        ) : (
          <div className="modal-email-section">
            <input
              type="email"
              className="modal-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMagicLink();
              }}
              autoFocus
            />
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn-secondary"
                onClick={() => setShowEmail(false)}
              >
                Back
              </button>
              <button
                type="button"
                className="modal-btn-primary"
                onClick={handleSendMagicLink}
                disabled={sending || !email.trim()}
              >
                {sending ? "Sending..." : "Send Magic Link"}
              </button>
            </div>
          </div>
        )}

        {won && onKeepPlaying && showEmail && !emailSent && (
          <button type="button" className="modal-link" onClick={onKeepPlaying}>
            Keep Playing
          </button>
        )}
      </div>
    </div>
  );
}
