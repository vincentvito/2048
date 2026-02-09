"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";

interface UsernameInputProps {
  onUsernameChange?: (username: string) => void;
  onAuthChange?: (user: User | null) => void;
}

export default function UsernameInput({ onUsernameChange, onAuthChange }: UsernameInputProps): React.ReactElement {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("2048_username");
    if (saved) {
      setUsername(saved);
      onUsernameChange?.(saved);
    }

    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      onAuthChange?.(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      onAuthChange?.(u);
    });

    // The magic link opens in a new tab. When the user returns to this tab,
    // re-check auth state so we pick up the session from the callback tab.
    function handleStorageChange(e: StorageEvent) {
      if (e.key === "2048_auth_event") {
        supabase!.auth.getUser().then(({ data: { user: u } }) => {
          setUser(u);
          onAuthChange?.(u);
        });
      }
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUsernameChange(value: string) {
    setUsername(value);
    localStorage.setItem("2048_username", value);
    onUsernameChange?.(value);
  }

  async function handleLogin() {
    if (!email) return;
    const supabase = createClient();
    if (!supabase) return;

    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setEmailSent(true);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setShowEmailInput(false);
    setEmailSent(false);
    onAuthChange?.(null);
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
      {!user && (
        <div className="flex items-center gap-2 w-full">
          <input
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="Enter display name"
            maxLength={20}
            className="flex-1 px-3 py-2 rounded-lg bg-amber-100 border-2 border-amber-300 text-amber-900 placeholder-amber-400 focus:outline-none focus:border-amber-500 text-sm font-medium"
          />
        </div>
      )}

      {user ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-amber-700">
            Logged in as <strong className="text-amber-900">{user.email}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="text-amber-600 hover:text-amber-800 underline text-xs"
          >
            Logout
          </button>
        </div>
      ) : (
        <>
          {!showEmailInput ? (
            <button
              onClick={() => setShowEmailInput(true)}
              className="text-sm text-amber-700 hover:text-amber-900 underline"
            >
              Login with email to appear on leaderboards
            </button>
          ) : emailSent ? (
            <p className="text-sm text-green-700 font-medium">
              Check your email for a magic link!
            </p>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 rounded-lg bg-white border-2 border-amber-300 text-amber-900 placeholder-amber-400 focus:outline-none focus:border-amber-500 text-sm"
              />
              <button
                onClick={handleLogin}
                disabled={loading || !email}
                className="px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? "..." : "Send"}
              </button>
            </div>
          )}
          {error && <p className="text-red-600 text-xs">{error}</p>}
        </>
      )}
    </div>
  );
}
