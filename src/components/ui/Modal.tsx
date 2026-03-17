"use client";

import React, { useRef, useEffect, useCallback } from "react";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  /** aria-labelledby ID for the title element */
  labelledBy?: string;
  /** aria-describedby ID for the description element */
  describedBy?: string;
  /** Additional CSS class for the card */
  className?: string;
  children: React.ReactNode;
}

/**
 * Shared modal primitive with backdrop, focus trap, Escape close, and aria attributes.
 * Uses the existing `modal-backdrop` / `modal-card` CSS classes.
 */
export default function Modal({
  open,
  onClose,
  labelledBy,
  describedBy,
  className,
  children,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && cardRef.current) {
        const focusable = cardRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    // Save current focus to restore later
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first button after a tick
    const timer = setTimeout(() => {
      const firstBtn = cardRef.current?.querySelector<HTMLElement>("button:not([disabled])");
      firstBtn?.focus();
    }, 50);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className={`modal-card${className ? ` ${className}` : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
