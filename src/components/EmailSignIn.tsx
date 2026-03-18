"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { authClient } from "@/lib/auth-client";

const OTP_LENGTH = 6;
const SIGNIN_PROGRESS_KEY = "2048_signin_progress";

type Variant = "modal" | "mobile" | "inline";

interface EmailSignInProps {
  /** Visual variant: "modal" for GameOverModal, "mobile" for MobileMenu, "inline" for MultiplayerView */
  variant?: Variant;
  /** Called before sending OTP — use for side-effects like saving pending score */
  onBeforeSend?: () => void;
  /** Called when sign-in completes successfully */
  onSuccess?: () => void;
  /** Called when user clicks Cancel/Back from the initial email step */
  onCancel?: () => void;
  /** Override max-width for the inline variant */
  maxWidth?: string;
}

/** Individual digit input boxes for OTP */
function OtpBoxes({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: () => void;
  disabled?: boolean;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const focusIndex = useCallback((i: number) => {
    setTimeout(() => inputsRef.current[i]?.focus(), 0);
  }, []);

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;

    // Handle paste of full code
    if (raw.length > 1) {
      const pasted = raw.slice(0, OTP_LENGTH);
      onChange(pasted);
      const next = Math.min(pasted.length, OTP_LENGTH - 1);
      focusIndex(next);
      if (pasted.length >= OTP_LENGTH) {
        setTimeout(onComplete, 0);
      }
      return;
    }

    const digits = value.split("");
    digits[i] = raw[0];
    const newValue = digits.join("").slice(0, OTP_LENGTH);
    onChange(newValue);

    if (i < OTP_LENGTH - 1) {
      focusIndex(i + 1);
    }
    if (newValue.length >= OTP_LENGTH) {
      setTimeout(onComplete, 0);
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const digits = value.split("");
      if (digits[i]) {
        digits[i] = "";
        onChange(digits.join(""));
      } else if (i > 0) {
        digits[i - 1] = "";
        onChange(digits.join(""));
        focusIndex(i - 1);
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      focusIndex(i - 1);
    } else if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) {
      focusIndex(i + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted) {
      onChange(pasted);
      const next = Math.min(pasted.length, OTP_LENGTH - 1);
      focusIndex(next);
      if (pasted.length >= OTP_LENGTH) {
        setTimeout(onComplete, 0);
      }
    }
  }

  return (
    <div className="otp-boxes">
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          className={`otp-box${value[i] ? " otp-box-filled" : ""}`}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          maxLength={OTP_LENGTH}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

export default function EmailSignIn({
  variant = "modal",
  onBeforeSend,
  onSuccess,
  onCancel,
  maxWidth,
}: EmailSignInProps): React.ReactElement {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");

  // Restore sign-in progress after page reload (e.g. user switched to email app)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SIGNIN_PROGRESS_KEY);
      if (saved) {
        const { email: savedEmail } = JSON.parse(saved);
        if (savedEmail) {
          setEmail(savedEmail);
          setStep("otp");
        }
      }
    } catch {
      /* noop */
    }
  }, []);

  async function handleSendOtp() {
    if (!email.trim() || sending) return;

    onBeforeSend?.();
    setOtpError("");
    setSending(true);

    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (error) {
        setOtpError(error.message || "Failed to send code");
        setSending(false);
        return;
      }

      setStep("otp");
      try {
        sessionStorage.setItem(SIGNIN_PROGRESS_KEY, JSON.stringify({ email }));
      } catch {
        /* noop */
      }
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length < OTP_LENGTH || verifying) return;

    setOtpError("");
    setVerifying(true);

    try {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp: otpCode,
      });

      if (error) {
        setOtpError(error.message || "Verification failed");
        setVerifying(false);
        return;
      }

      // Success! Better Auth handles session management automatically
      try {
        sessionStorage.removeItem(SIGNIN_PROGRESS_KEY);
      } catch {
        /* noop */
      }
      onSuccess?.();
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  function handleBack() {
    if (step === "otp") {
      setStep("email");
      setOtpCode("");
      setOtpError("");
    } else {
      try {
        sessionStorage.removeItem(SIGNIN_PROGRESS_KEY);
      } catch {
        /* noop */
      }
      onCancel?.();
    }
  }

  // CSS class mappings per variant
  const cls =
    variant === "mobile"
      ? {
          section: "mobile-menu-signin-form",
          input: "mobile-menu-signin-input",
          error: "mobile-menu-signin-error",
          label: "mobile-menu-signin-label",
          actions: "mobile-menu-signin-actions",
          btnBack: "mobile-menu-signin-back",
          btnSubmit: "mobile-menu-signin-submit",
        }
      : {
          section: "modal-email-section",
          input: "modal-input",
          error: "modal-error",
          label: "modal-success",
          actions: "modal-actions",
          btnBack: "modal-btn-secondary",
          btnSubmit: "modal-btn-primary",
        };

  const wrapperStyle = maxWidth ? { width: "100%", maxWidth } : undefined;

  if (step === "email") {
    return (
      <div className={cls.section} style={wrapperStyle}>
        {variant === "mobile" && <p className={cls.label}>Enter your email</p>}
        {variant === "modal" && <div className="modal-divider">sign in with email</div>}
        <input
          type="email"
          className={cls.input}
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendOtp();
          }}
          autoFocus
        />
        {otpError && <p className={cls.error}>{otpError}</p>}
        <div className={cls.actions}>
          <button type="button" className={cls.btnBack} onClick={handleBack}>
            Cancel
          </button>
          <button
            type="button"
            className={cls.btnSubmit}
            onClick={handleSendOtp}
            disabled={sending || !email.trim()}
          >
            {sending ? "Sending..." : "Send Code"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cls.section} style={wrapperStyle}>
      <p className={cls.label}>Code sent to {email}</p>
      <OtpBoxes
        value={otpCode}
        onChange={setOtpCode}
        onComplete={handleVerifyOtp}
        disabled={verifying}
      />
      {otpError && <p className={cls.error}>{otpError}</p>}
      <div className={cls.actions}>
        <button type="button" className={cls.btnBack} onClick={handleBack}>
          Back
        </button>
        <button
          type="button"
          className={cls.btnSubmit}
          onClick={handleVerifyOtp}
          disabled={verifying || otpCode.length < OTP_LENGTH}
        >
          {verifying ? "Verifying..." : "Verify"}
        </button>
      </div>
    </div>
  );
}
