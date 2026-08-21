import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/config/defaults";

// Devotional listing card — metadata-driven from a Devotional record.

export function DevotionalCard({ devotional }: { devotional: Devotional }) {
  const previewNote = devotional.previewDays > 0
    ? `${devotional.previewDays} free day${devotional.previewDays === 1 ? "" : "s"}`
    : "Full access on purchase";

  return (
    <Link href={`/devotionals/${devotional.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col transition-shadow group-hover:shadow-md">
        {devotional.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={devotional.coverUrl}
            alt={devotional.title}
            className="mb-4 h-40 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="mb-4 flex h-40 w-full items-center justify-center rounded-lg bg-background text-text-muted">
            {devotional.title}
          </div>
        )}
        <CardTitle>{devotional.title}</CardTitle>
        {devotional.subtitle && (
          <p className="mt-1 text-sm text-text-muted">{devotional.subtitle}</p>
        )}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="font-semibold text-text-primary">
            {devotional.priceMinor > 0
              ? formatPrice(devotional.priceMinor, devotional.currency)
              : "Free"}
          </span>
          <span className="text-text-muted">{previewNote}</span>
        </div>
      </Card>
    </Link>
  );
}