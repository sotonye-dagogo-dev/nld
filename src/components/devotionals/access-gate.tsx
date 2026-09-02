"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/config/defaults";
import { cn } from "@/lib/utils";
import { ContentReader, MAX_PREVIEW_CHARS } from "./content-reader";
import { Lock, AlertCircle } from "lucide-react";

// AccessGate — verifies the access password against the server and fetches the
// locked days ONLY after verification. Locked content never ships in the client
// bundle; it is returned by POST /api/devotionals/[slug]/unlock server-side
// (asset protection). Uses on-platform ContentReader for secure viewing.

interface AccessGateProps {
  devotional: Devotional;
  settings: SiteSettings;
  id?: string;
}

export function AccessGate({ devotional, settings, id }: AccessGateProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<DevotionalDay[] | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function mapError(msg: string): Record<string, string> {
    const low = msg.toLowerCase();
    if (low.includes("email")) return { email: msg };
    if (low.includes("password") || low.includes("access")) return { password: msg };
    if (low.includes("expired") || low.includes("no active")) return { email: msg };
    return { password: msg };
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "Email is required.";
    if (!password.trim()) errs.password = "Access password is required.";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch(`/api/devotionals/${encodeURIComponent(devotional.slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok: boolean; days?: DevotionalDay[]; error?: string };
      if (!res.ok || !data.ok || !data.days) {
        setFieldErrors(mapError(data.error ?? "That password did not work."));
        return;
      }
      setDays(data.days);
      toast("Access granted. Enjoy!", "success");
    } catch {
      setFieldErrors({ _general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (days) {
    return (
      <div id={id} className="section-gap animate-fade-in">
        <Card variant="glass" className="border-success/40 bg-success/5">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-success shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-success">Access unlocked</h2>
              <p className="text-sm text-text-muted">
                You now have access to the remaining {days.length} day{days.length === 1 ? "" : "s"} of {devotional.title}.
              </p>
            </div>
          </div>
        </Card>
        {days.map((day) => (
          <article key={day.id} className="rounded-xl border border-border bg-surface p-6 animate-slide-up">
            <h3 className="mb-2 text-xl font-semibold text-text-primary">
              Day {day.dayNumber} — {day.title}
            </h3>
            <div className="prose-devotional">{day.content}</div>
            {day.sermonUrl && (
              <div className="mt-4 aspect-video overflow-hidden rounded-lg">
                <iframe
                  src={day.sermonUrl}
                  title={`Day ${day.dayNumber} sermon`}
                  className="h-full w-full"
                  loading="lazy"
                />
              </div>
            )}
            {day.contentFileUrl && (
              <div className="mt-4">
                <ContentReader
                  fileUrl={day.contentFileUrl}
                  fileName={day.contentFileUrl.split("/").pop()?.split(".").slice(0, -1).join(".") || "Content"}
                  fileType={day.contentFileUrl.toLowerCase().endsWith(".pdf") ? "pdf" : "docx"}
                  maxPreviewChars={MAX_PREVIEW_CHARS}
                  hasFullAccess={true}
                  coverUrl={devotional.coverUrl}
                />
              </div>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <Card id={id} variant="glass" className="space-y-4">
      <div className="flex-between">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Lock className="h-5 w-5" aria-hidden="true" />
          Unlock the full devotional
        </h2>
        <span className="rounded-lg bg-background px-3 py-1 text-sm font-semibold text-text-primary">
          {devotional.priceMinor > 0 ? formatPrice(devotional.priceMinor, devotional.currency) : "Free"}
        </span>
      </div>
      <p className="text-sm text-text-muted">
        Already purchased? Enter the email you paid with and the access password from your email.
      </p>
      <form onSubmit={verify} className="space-y-4" noValidate>
        <Input
          name="email"
          type="email"
          required
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <Input
          name="password"
          type="password"
          required
          autoComplete="off"
          label="Access password"
          placeholder="e.g. AB2CDEFG3HJK"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          showPasswordToggle
        />
        {fieldErrors._general && (
          <div className="flex items-center gap-2 text-sm text-danger bg-danger/5 p-3 rounded-lg" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{fieldErrors._general}</span>
          </div>
        )}
        <Button type="submit" loading={loading} className="w-full">
          Unlock devotional
        </Button>
      </form>
      <div className="flex-between border-t border-border pt-4">
        <p className="text-sm text-text-muted">Haven&apos;t purchased yet?</p>
        <Link
          href={`/purchase/${devotional.slug}`}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium",
            settings.paymentsEnabled ? "bg-primary text-background hover:bg-primary-hover" : "pointer-events-none bg-text-muted text-white",
          )}
        >
          {settings.paymentsEnabled ? "Purchase access" : "Payments temporarily disabled"}
        </Link>
      </div>
    </Card>
  );
}