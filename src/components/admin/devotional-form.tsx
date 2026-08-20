"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { slugify } from "@/lib/utils";

// Devotional upload form (client scaffold). Persistence via server action or
// API route lands in Sprint 2 (admin module). This form validates and shows
// the intended flow; submissions currently end at the router.

export function DevotionalForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    priceMinor: "500000",
    currency: "NGN",
    previewDays: "3",
    accessMode: "one-time",
  });
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  const derivedSlug = slug || slugify(form.title);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Sprint 2: POST to admin API to persist + run migration for days.
    toast("Upload form scaffolded — persistence lands in Sprint 2", "info");
    setLoading(false);
    router.push("/admin/devotionals");
  }

  return (
    <Card className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-text-primary">Upload devotional</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          name="title"
          required
          label="Title"
          placeholder="e.g. 30 Days of Prayer & Fasting"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Input
          name="subtitle"
          label="Subtitle"
          placeholder="A short supporting line"
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
        />
        <Input
          name="slug"
          label="Slug (auto-derived from title if empty)"
          placeholder={derivedSlug}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            name="priceMinor"
            type="number"
            min={0}
            step={100}
            label="Price (minor units, e.g. kobo)"
            value={form.priceMinor}
            onChange={(e) => setForm({ ...form, priceMinor: e.target.value })}
          />
          <Input
            name="previewDays"
            type="number"
            min={0}
            label="Free preview days"
            value={form.previewDays}
            onChange={(e) => setForm({ ...form, previewDays: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Access mode
            <select
              name="accessMode"
              value={form.accessMode}
              onChange={(e) => setForm({ ...form, accessMode: e.target.value })}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="one-time">One-time purchase</option>
              <option value="monthly">Monthly access</option>
              <option value="duration">Time duration</option>
            </select>
          </label>
          <Input
            name="currency"
            label="Currency"
            placeholder="NGN"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </div>
        <Button type="submit" loading={loading}>
          Save devotional
        </Button>
      </form>
      <p className="mt-4 text-xs text-text-muted">
        Day-by-day content and cover image upload are part of the Sprint 2 admin
        module. This form establishes the metadata shape.
      </p>
    </Card>
  );
}