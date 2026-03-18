"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Full-width button */
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "ui-btn ui-btn-primary",
  secondary: "ui-btn ui-btn-secondary",
  danger: "ui-btn ui-btn-danger",
  ghost: "ui-btn ui-btn-ghost",
};

/**
 * Shared button primitive with consistent variants.
 * Replaces inline style overrides like `style={{ background: '#dc2626' }}`.
 */
export default function Button({
  variant = "primary",
  fullWidth,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [variantClasses[variant], fullWidth ? "ui-btn-full" : "", className || ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
