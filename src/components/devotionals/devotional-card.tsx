import Link from "next/link";
import Image from "next/image";
import { Card, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/config/defaults";
import { BookOpen, Clock, Lock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

// Devotional listing card — metadata-driven from a Devotional record.
// Uses bento/glassmorphism design with responsive layout.

interface DevotionalCardProps {
  devotional: Devotional;
}

function isOptimizedImageHost(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h.endsWith(".supabase.co") || h.endsWith(".supabase.in");
  } catch {
    return false;
  }
}

export function DevotionalCard({ devotional }: DevotionalCardProps) {
  const previewNote = devotional.previewDays > 0
    ? `${devotional.previewDays} free day${devotional.previewDays === 1 ? "" : "s"}`
    : "Full access on purchase";

  const isPaid = devotional.priceMinor > 0;
  const coverIsExternal = Boolean(devotional.coverUrl) && !isOptimizedImageHost(devotional.coverUrl);

  return (
    <Link href={`/devotionals/${devotional.slug}`} className="group block h-full">
      <Card variant="bento" className="flex h-full flex-col overflow-hidden">
        {devotional.coverUrl ? (
          <div className="mb-4 relative h-40 w-full overflow-hidden rounded-xl">
            <Image
              src={devotional.coverUrl}
              alt={devotional.title}
              fill
              unoptimized={coverIsExternal}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div className="mb-4 flex h-40 w-full items-center justify-center rounded-xl bg-surface border border-border">
            <BookOpen className="h-12 w-12 text-text-muted" aria-hidden="true" />
          </div>
        )}
        <div className="flex-1 flex flex-col p-4 pt-0">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              {devotional.previewDays > 0 ? `${devotional.previewDays} days preview` : "Locked content"}
            </span>
            {isPaid && (
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Paid
              </span>
            )}
          </div>
          <CardTitle className="text-xl line-clamp-2 group-hover:text-primary transition-colors">
            {devotional.title}
          </CardTitle>
          {devotional.subtitle && (
            <p className="mt-2 text-sm text-text-muted line-clamp-2">{devotional.subtitle}</p>
          )}
        </div>
        <div className="border-t border-border pt-4 mt-auto">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              {isPaid ? (
                <>
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatPrice(devotional.priceMinor, devotional.currency)}
                </>
              ) : (
                <>
                  <span className="text-success font-medium">Free</span>
                </>
              )}
            </span>
            <span className="text-text-muted flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {previewNote}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}