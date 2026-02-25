"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-client";

/**
 * Global overlay that prompts for a username after OTP login
 * if the user hasn't set one yet (checked via user_metadata.username).
 */
export default function UsernamePrompt(): React.ReactElement | null {
  const [show, setShow] = useState(false);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    if (!supabase) return;

    // Check on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !session.user.user_metadata?.username) {
        setShow(true);
      }
    });

    // Listen for auth changes (e.g. user just verified OTP)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !session.user.user_metadata?.username) {
        setShow(true);
      } else {
        setShow(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-focus input when shown
  useEffect(() => {
    if (show) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [show]);

  async function handleSave() {
    const trimmed = username.trim();
    if (!trimmed || saving) return;

    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }
    if (trimmed.length > 20) {
      setError("Username must be 20 characters or less");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError("Only letters, numbers, _ and - allowed");
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    setError("");
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { username: trimmed },
      });
      if (updateError) {
        setError(updateError.message);
      } else {
        setShow(false);
      }
    } catch {
      setError("Failed to save username");
    } finally {
      setSaving(false);
    }
  }

  if (!show) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="username-prompt-title">
      <div className="modal-card" style={{ padding: "24px" }}>
        <h2 id="username-prompt-title" className="modal-result" style={{ marginBottom: "4px" }}>
          Choose a Username
        </h2>
        <p style={{ color: "#92400e", fontSize: "14px", margin: "0 0 16px", lineHeight: 1.5 }}>
          This is how you&apos;ll appear on the leaderboard and to opponents.
        </p>

        <input
          ref={inputRef}
          type="text"
          className="modal-input"
          placeholder="e.g. TileMaster42"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").slice(0, 20))}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          autoComplete="username"
        />

        {error && <p className="modal-error" style={{ marginTop: "8px" }}>{error}</p>}

        <div className="modal-primary-actions" style={{ marginTop: "16px" }}>
          <button
            type="button"
            className="modal-btn-play-again"
            onClick={handleSave}
            disabled={saving || !username.trim()}
            style={saving || !username.trim() ? { opacity: 0.5, cursor: "not-allowed" } : {}}
          >
            {saving ? "Saving..." : "Let's Go"}
          </button>
        </div>
      </div>
    </div>
  );
}
