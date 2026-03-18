"use client";

import React, { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "2048_install_dismissed";

export default function InstallBanner(): React.ReactElement | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden

  // These effects sync with browser APIs (navigator, matchMedia, events) — effects are appropriate
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    if (standalone) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(ios);

    // Check if user previously dismissed
    try {
      const d = localStorage.getItem(DISMISSED_KEY);
      if (d) {
        const ago = Date.now() - Number(d);
        // Show again after 7 days
        if (ago < 7 * 24 * 60 * 60 * 1000) return;
      }
    } catch { /* noop */ }

    setDismissed(false);

    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* noop */ }
  }, []);

  // Don't render if already installed, dismissed, or not applicable
  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <img src="/icon-192x192.png" alt="" className="install-banner-icon" />
        <div className="install-banner-text">
          <strong>Install 2048</strong>
          {isIOS ? (
            <span>
              Tap <span className="install-banner-share">⎋</span> then &quot;Add to Home Screen&quot;
            </span>
          ) : (
            <span>Add to your home screen for the best experience</span>
          )}
        </div>
        <div className="install-banner-actions">
          {!isIOS && deferredPrompt && (
            <button className="install-banner-btn" onClick={handleInstall}>
              Install
            </button>
          )}
          <button className="install-banner-close" onClick={handleDismiss} aria-label="Dismiss">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
