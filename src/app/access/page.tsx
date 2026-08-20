import type { Metadata } from "next";
import { AccessEntry } from "@/components/access/access-entry";

export const metadata: Metadata = {
  title: "Unlock your devotional",
};

export default function AccessPage() {
  return (
    <div className="page-shell">
      <AccessEntry />
    </div>
  );
}