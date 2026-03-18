"use client";

import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  /** Additional CSS class (e.g. `elo-rank-gold`) */
  className?: string;
}

/**
 * Small inline badge for tags, ranks, grid size labels, etc.
 * Uses the existing `.modal-badge` CSS class as base.
 */
export default function Badge({ children, className }: BadgeProps) {
  return <span className={`modal-badge${className ? ` ${className}` : ""}`}>{children}</span>;
}
