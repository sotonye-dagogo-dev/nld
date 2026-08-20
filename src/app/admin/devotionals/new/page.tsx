import type { Metadata } from "next";
import { DevotionalForm } from "@/components/admin/devotional-form";

export const metadata: Metadata = { title: "Admin — Upload Devotional" };

export default function AdminNewDevotionalPage() {
  return (
    <div className="space-y-6">
      <DevotionalForm />
    </div>
  );
}