import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Universal Button (§13 baseline). Variants come from a single config map —
// call sites pass a variant, never bespoke styling.

const VARIANTS = {
  primary: "bg-primary text-background hover:bg-primary-hover",
  secondary: "border border-border bg-surface text-text-primary hover:bg-background",
  destructive: "bg-danger text-white hover:opacity-90",
  ghost: "text-text-muted hover:bg-background",
} as const;

type Variant = keyof typeof VARIANTS;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}