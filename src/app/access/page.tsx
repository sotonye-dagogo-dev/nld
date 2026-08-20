import type { Metadata } from "next";
import { AccessEntry } from "@/components/access/access-entry";
import { recordEvent } from "@/lib/audit";

export const metadata: Metadata = {
  title: "Unlock your devotional",
};
export const dynamic = "force-dynamic";

export default function AccessPage() {
  // Fire-and-forget analytics (never blocks render).
  recordEvent({ eventType: "page.view", meta: { path: "/access" } }).catch(() => undefined);

  return (
    <div className="page-shell">
      <AccessEntry />
    </div>
  );
}