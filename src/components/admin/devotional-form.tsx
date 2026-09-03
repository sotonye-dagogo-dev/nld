"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { slugify } from "@/lib/utils";

// Devotional upload/edit form — creates or updates a devotional with its
// day-by-day content via the admin API (single transaction server-side).

interface DayDraft {
  dayNumber: number;
  title: string;
  content: string;
  sermonUrl: string;
  contentFileUrl?: string;
}

interface DevotionalFormProps {
  devotional?: Devotional;
  days?: DevotionalDay[];
}

function initialDays(existing?: DevotionalDay[]): DayDraft[] {
  if (existing && existing.length > 0) {
    return existing.map((d) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      content: d.content,
      sermonUrl: d.sermonUrl ?? "",
      contentFileUrl: (d as DevotionalDay & { contentFileUrl?: string }).contentFileUrl ?? "",
    }));
  }
  return [{ dayNumber: 1, title: "", content: "", sermonUrl: "", contentFileUrl: "" }];
}

export function DevotionalForm({ devotional, days }: DevotionalFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(devotional);

  const [form, setForm] = useState({
    title: devotional?.title ?? "",
    subtitle: devotional?.subtitle ?? "",
    slug: devotional?.slug ?? "",
    coverUrl: devotional?.coverUrl ?? "",
    priceMinor: devotional ? String(devotional.priceMinor) : "500000",
    currency: devotional?.currency ?? "NGN",
    previewDays: devotional ? String(devotional.previewDays) : "3",
    accessMode: (devotional?.accessMode ?? "one-time") as AccessMode,
    status: (devotional?.status ?? "published") as DevotionalStatus,
  });
  const [dayDrafts, setDayDrafts] = useState<DayDraft[]>(() => initialDays(days));
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const derivedSlug = form.slug || slugify(form.title);

  function updateDay(index: number, patch: Partial<DayDraft>) {
    setDayDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function removeDay(index: number) {
    setDayDrafts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ dayNumber: 1, title: "", content: "", sermonUrl: "" }];
    });
  }

  function addDay() {
    setDayDrafts((prev) => {
      const nextNumber = Math.max(0, ...prev.map((d) => d.dayNumber)) + 1;
      return [...prev, { dayNumber: nextNumber, title: "", content: "", sermonUrl: "" }];
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    // Client-side validation with per-field errors
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    // Slug validation: must be lowercase alphanumeric + hyphens if provided
    if (form.slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      errs.slug = "Slug must be lowercase letters, numbers and hyphens only (e.g. my-devotional).";
    }
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      toast("Please fix the highlighted fields.", "error");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        slug: form.slug,
        coverUrl: form.coverUrl,
        priceMinor: Number(form.priceMinor) || 0,
        currency: form.currency || "NGN",
        accessMode: form.accessMode,
        previewDays: Number(form.previewDays) || 0,
        status: form.status,
        days: dayDrafts.map((d) => ({
          dayNumber: d.dayNumber,
          title: d.title,
          content: d.content,
          sermonUrl: d.sermonUrl || undefined,
          contentFileUrl: d.contentFileUrl || undefined,
        })),
      };
      const url = isEdit ? `/api/admin/devotionals/${devotional?.id}` : "/api/admin/devotionals";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ct = res.headers.get("content-type") ?? "";
      let data: { ok: boolean; error?: string };
      if (ct.includes("application/json")) {
        try {
          data = (await res.json()) as typeof data;
        } catch {
          const text = await res.text().catch(() => "");
          toast(text.slice(0, 400) || `Server error (${res.status}).`, "error");
          return;
        }
      } else {
        const text = await res.text().catch(() => "");
        if (res.status === 413 || text.toLowerCase().includes("payload")) {
          toast("Payload too large — try a smaller file or compress the asset before saving.", "error");
        } else {
          toast(text.slice(0, 400) || `Server error (${res.status}).`, "error");
        }
        return;
      }
      if (!res.ok || !data.ok) {
        if (res.status === 409) {
          setFieldErrors({ slug: "That slug is already in use. Please choose a different slug." });
          toast("That slug is already in use.", "error");
        } else {
          const msg = data.error ?? "Could not save the devotional.";
          const low = msg.toLowerCase();
          if (low.includes("slug")) setFieldErrors({ slug: msg });
          else if (low.includes("title")) setFieldErrors({ title: msg });
          else toast(msg, "error");
        }
        return;
      }
      toast(isEdit ? "Devotional updated." : "Devotional published.", "success");
      router.push("/admin/devotionals");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Unexpected token") || msg.includes("is not valid JSON")) {
        toast("Server returned an unexpected response. Please try again.", "error");
      } else {
        toast("Network error while saving.", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <h1 className="mb-4 text-xl font-semibold text-text-primary">
          {isEdit ? "Edit devotional" : "Upload devotional"}
        </h1>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            name="title"
            required
            label="Title"
            type="text"
            placeholder="e.g. 30 Days of Prayer & Fasting"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            hint="The main title of the devotional (e.g. '30 Days of Prayer & Fasting')"
            error={fieldErrors.title}
          />
          <Input
            name="subtitle"
            label="Subtitle"
            type="text"
            placeholder="A short supporting line"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            hint="Optional subtitle displayed below the title"
          />
          <Input
            name="slug"
            label="Slug (auto-derived from title if empty)"
            placeholder={derivedSlug}
            value={form.slug}
            type="text"
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
            hint="Must be unique, lowercase letters, numbers and hyphens only. Used in URL (e.g. /devotionals/your-slug). Auto-generated from title if left empty."
            error={fieldErrors.slug}
          />
          <FileUpload
            label="Cover Image"
            value={form.coverUrl}
            onChange={(url) => setForm({ ...form, coverUrl: url ?? "" })}
            type="cover"
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
                onChange={(e) => setForm({ ...form, accessMode: e.target.value as AccessMode })}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="one-time">One-time purchase</option>
                <option value="monthly">Monthly access</option>
                <option value="duration">Time duration</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Status
              <select
                name="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as DevotionalStatus })}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <Input
            name="currency"
            label="Currency"
            placeholder="NGN"
            type="text"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </form>
      </Card>

      <Card className="space-y-4">
        <div className="flex-between">
          <h2 className="text-lg font-semibold text-text-primary">Days</h2>
          <Button type="button" variant="secondary" size="sm" onClick={addDay}>
            + Add day
          </Button>
        </div>
        {dayDrafts.map((day, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex-between">
              <span className="text-sm font-semibold text-text-primary">Day {day.dayNumber}</span>
              <button
                type="button"
                onClick={() => removeDay(i)}
                className="rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-background hover:text-danger"
              >
                Remove
              </button>
            </div>
            <Input
              name={`dayTitle-${i}`}
              required
              label="Title"
              value={day.title}
              type="text"
              placeholder="e.g. Day 1: The Power of Prayer"
              onChange={(e) => updateDay(i, { title: e.target.value })}
            />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Content
              <textarea
                required
                rows={6}
                value={day.content}
                onChange={(e) => updateDay(i, { content: e.target.value })}
                placeholder="The devotional content for this day. This is displayed in the free preview (up to the configured preview days) and fully unlocked after purchase. Supports basic HTML formatting like <p>, <strong>, <em>, <ul>, <ol>, <li>."
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
            <FileUpload
              label="Content File (PDF/DOCX, optional)"
              value={day.contentFileUrl}
              onChange={(url) => updateDay(i, { contentFileUrl: url ?? "" })}
              type="asset"
              hint="Upload a PDF or DOCX file for protected content. Preview is truncated for asset protection."
            />
            <Input
              name={`sermonUrl-${i}`}
              label="Sermon URL (optional)"
              placeholder="https://..."
              value={day.sermonUrl}
              type="url"
              onChange={(e) => updateDay(i, { sermonUrl: e.target.value })}
            />
          </div>
        ))}
        <div className="flex justify-end border-t border-border pt-4">
          <Button type="button" onClick={onSubmit} loading={loading}>
            {isEdit ? "Save changes" : "Publish devotional"}
          </Button>
        </div>
      </Card>
    </div>
  );
}