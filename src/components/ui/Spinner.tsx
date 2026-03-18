"use client";

import React from "react";

interface SpinnerProps {
  /** Additional CSS class */
  className?: string;
  /** Inline style (e.g. for margin) */
  style?: React.CSSProperties;
}

/**
 * Shared loading spinner. Uses the existing `.loader` CSS class.
 */
export default function Spinner({ className, style }: SpinnerProps) {
  return <div className={`loader${className ? ` ${className}` : ""}`} style={style} />;
}
