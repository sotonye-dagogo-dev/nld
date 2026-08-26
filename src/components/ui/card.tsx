import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Universal Card container (§13 baseline).
// Variants: default, glass, bento, elevated

type CardVariant = "default" | "glass" | "bento" | "elevated";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const CARD_VARIANTS: Record<CardVariant, string> = {
  default: "rounded-xl border border-border bg-surface p-6 shadow-sm",
  glass: "glass-card p-6",
  bento: "glass-card p-6 hover-lift",
  elevated: "rounded-2xl border border-border bg-surface p-6 shadow-xl",
};

export function Card({
  variant = "default",
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(CARD_VARIANTS[variant], className)}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-start justify-between gap-4", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-text-primary", className)} {...rest} />;
}