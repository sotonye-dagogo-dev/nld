import { cn } from "@/lib/utils";

// Universal Logo (§13 baseline). Wordmark/name comes from admin-configurable
// settings (fallback to a default). Renders image when logoUrl is set, else a
// styled wordmark — no bespoke logo markup per page.

interface LogoProps {
  name: string;
  logoUrl?: string;
  className?: string;
}

export function Logo({ name, logoUrl, className }: LogoProps) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={`${name} logo`} className={cn("h-8 w-auto rounded-full", className)} />;
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-background">
        {initials || "NL"}
      </span>
      <span className="font-semibold text-text-primary">{name}</span>
    </span>
  );
}