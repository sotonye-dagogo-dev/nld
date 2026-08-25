"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/config/defaults";
import { cn } from "@/lib/utils";

// AccessGate — verifies the access password against the server and fetches the
// locked days ONLY after verification. Locked content never ships in the client
// bundle; it is returned by POST /api/devotionals/[slug]/unlock server-side
// (asset protection).

interface AccessGateProps {
  devotional: Devotional;
  settings: SiteSettings;
}

export function AccessGate({ devotional, settings }: AccessGateProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<DevotionalDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/devotionals/${encodeURIComponent(devotional.slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok: boolean; days?: DevotionalDay[]; error?: string };
      if (!res.ok || !data.ok || !data.days) {
        setError(data.error ?? "That password did not work.");
        return;
      }
      setDays(data.days);
      toast("Access granted. Enjoy!", "success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (days) {
    return (
      <div className="section-gap">
        <Card className="border-success/40 bg-success/5">
          <h2 className="text-lg font-semibold text-success">Access unlocked</h2>
          <p className="text-sm text-text-muted">
            You now have access to the remaining {days.length} day{days.length === 1 ? "" : "s"} of {devotional.title}.
          </p>
        </Card>
        {days.map((day) => (
          <article key={day.id} className="rounded-xl border border-border bg-surface p-6">
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
              <a
                href={day.contentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>View/download content file (PDF/DOCX)</span>
              </a>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex-between">
        <h2 className="text-lg font-semibold text-text-primary">Unlock the full devotional</h2>
        <span className="rounded-lg bg-background px-3 py-1 text-sm font-semibold text-text-primary">
          {devotional.priceMinor > 0 ? formatPrice(devotional.priceMinor, devotional.currency) : "Free"}
        </span>
      </div>
      <p className="text-sm text-text-muted">
        Already purchased? Enter the email you paid with and the access password from your email.
      </p>
      <form onSubmit={verify} className="space-y-4">
        <Input
          name="email"
          type="email"
          required
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          name="password"
          type="text"
          required
          autoComplete="off"
          label="Access password"
          placeholder="e.g. AB2CDEFG3HJK"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit" loading={loading} className="w-full">
          Unlock devotional
        </Button>
      </form>
      <div className="flex-between border-t border-border pt-4">
        <p className="text-sm text-text-muted">Haven&apos;t purchased yet?</p>
        <Link
          href={`/purchase/${devotional.slug}`}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium text-white",
            settings.paymentsEnabled ? "bg-primary hover:bg-primary-hover" : "pointer-events-none bg-text-muted",
          )}
        >
          {settings.paymentsEnabled ? "Purchase access" : "Payments temporarily disabled"}
        </Link>
      </div>
    </Card>
  );
}