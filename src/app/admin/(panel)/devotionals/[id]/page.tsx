import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/data/db";
import { devotionals, devotionalDays } from "@/data/db/schema";
import { DevotionalForm } from "@/components/admin/devotional-form";
import { ErrorState } from "@/components/ui/error-state";

export const metadata: Metadata = { title: "Admin — Edit Devotional" };
export const dynamic = "force-dynamic";

export default async function AdminEditDevotionalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let devotional: Devotional | null = null;
  let days: DevotionalDay[] = [];
  let error = false;
  try {
    const db = getDb();
    const [d, ds] = await Promise.all([
      db.select().from(devotionals).where(eq(devotionals.id, id)).limit(1),
      db.select().from(devotionalDays).where(eq(devotionalDays.devotionalId, id)),
    ]);
    devotional = d[0] as Devotional | undefined ?? null;
    days = ds as DevotionalDay[];
  } catch {
    error = true;
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load the devotional"
        message="The devotional could not be fetched. Please try again."
      />
    );
  }
  if (!devotional) notFound();

  return <DevotionalForm devotional={devotional} days={days} />;
}