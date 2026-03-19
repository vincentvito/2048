"use client";

import React, { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "2048_install_dismissed";
const INSTALLED_KEY = "2048_install_accepted";
const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

    // Don't show if user previously installed
    try {
      if (localStorage.getItem(INSTALLED_KEY) === "1") return;
    } catch { /* noop */ }

    // Don't show if user dismissed within cooldown period
    try {
      const d = localStorage.getItem(DISMISSED_KEY);
      if (d) {
        const ago = Date.now() - Number(d);
        if (ago < DISMISS_COOLDOWN_MS) return;
      }
    } catch {
      /* noop */
    }

    // On iOS, show immediately since there's no beforeinstallprompt event
    if (ios) {
      setDismissed(false);
      return;
    }

    // On other platforms, only show when the browser fires beforeinstallprompt
    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  // Register service worker and listen for updates
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});

    // Listen for SW_UPDATED message from the new service worker
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "SW_UPDATED") {
        // Dynamic import to avoid SSR issues with sonner
        import("sonner").then(({ toast }) => {
          toast("New version available", {
            action: {
              label: "Refresh",
              onClick: () => window.location.reload(),
            },
            duration: Infinity,
          });
        });
      }
    }

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setDismissed(true);
    if (outcome === "accepted") {
      try { localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* noop */ }
    } else {
      // User dismissed the native prompt — treat as a dismiss
      try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* noop */ }
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
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
              Tap <span className="install-banner-share">⎋</span> then &quot;Add to Home
              Screen&quot;
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
