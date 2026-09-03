"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Standalone access entry — lets purchasers unlock a devotional from anywhere
// (not just the reader page). Verifies via /api/access/verify.

export function AccessEntry({
  devotionals,
  initialSlug,
  initialPassword,
  onSuccess,
}: {
  devotionals?: { slug: string; title: string }[];
  initialSlug?: string;
  initialPassword?: string;
  onSuccess?: (result: { devotional: string; days: number; matchedSlug?: string }) => void;
} = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(initialPassword ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ devotional: string; days: number } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const generalError = fieldErrors._general;

  function mapErrorToField(message: string): Record<string, string> {
    const lower = message.toLowerCase();
    if (lower.includes("slug") || lower.includes("devotional not found") || lower.includes("devotional")) {
      return { slug: message };
    }
    if (lower.includes("email")) return { email: message };
    if (lower.includes("password") || lower.includes("access")) return { password: message };
    return { _general: message };
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setResult(null);
    const errs: Record<string, string> = {};
    if (!slug.trim()) errs.slug = "Please select a devotional.";
    if (!email.trim()) errs.email = "Email is required.";
    if (!password.trim()) errs.password = "Access password is required.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      // If password looks like derived password but slug empty, try auto-detect via
      // the new auto endpoint that scans all grants for that email/password.
      const useAuto = !slug.trim() && password.trim().length > 0;
      if (useAuto && devotionals && devotionals.length > 0) {
        // Attempt auto-detect by trying each devotional's verify – server will support slug-less verify
        const res = await fetch("/api/access/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: "", email: normalizedEmail, password: password.trim() }),
        });
        const ct = res.headers.get("content-type") ?? "";
        let data: { ok: boolean; error?: string; devotional?: string; days?: number; matchedSlug?: string };
        if (ct.includes("application/json")) {
          try {
            data = (await res.json()) as typeof data;
          } catch {
            const text = await res.text().catch(() => "");
            setFieldErrors({ _general: text.slice(0, 300) || "Verification failed. Please try again." });
            return;
          }
        } else {
          const text = await res.text().catch(() => "");
          setFieldErrors({ _general: text.slice(0, 300) || `Server error (${res.status}).` });
          return;
        }
        if (!res.ok || !data.ok) {
          setFieldErrors(mapErrorToField(data.error ?? "Verification failed."));
          return;
        }
        if (data.matchedSlug) setSlug(data.matchedSlug);
        const r = { devotional: data.devotional ?? data.matchedSlug ?? slug, days: data.days ?? 0, matchedSlug: data.matchedSlug };
        setResult(r);
        toast(`Access verified for ${r.devotional} — opening devotional!`, "success");
        if (onSuccess) {
          setTimeout(() => onSuccess(r), 400);
        } else if (data.matchedSlug) {
          setTimeout(() => router.push(`/devotionals/${data.matchedSlug}`), 800);
        }
        return;
      }

      const res = await fetch("/api/access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: normalizedEmail, password: password.trim() }),
      });
      const ct2 = res.headers.get("content-type") ?? "";
      let data2: { ok: boolean; error?: string; devotional?: string; days?: number };
      if (ct2.includes("application/json")) {
        try {
          data2 = (await res.json()) as typeof data2;
        } catch {
          const text = await res.text().catch(() => "");
          setFieldErrors({ _general: text.slice(0, 300) || "Verification failed. Please try again." });
          return;
        }
      } else {
        const text = await res.text().catch(() => "");
        setFieldErrors({ _general: text.slice(0, 300) || `Server error (${res.status}).` });
        return;
      }
      if (!res.ok || !data2.ok) {
        setFieldErrors(mapErrorToField(data2.error ?? "Verification failed."));
        return;
      }
      const r = { devotional: data2.devotional ?? slug, days: data2.days ?? 0 };
      setResult(r);
      toast(`Access verified for ${r.devotional}!`, "success");
      if (onSuccess) {
        setTimeout(() => onSuccess({ ...r, matchedSlug: slug }), 400);
      } else {
        setTimeout(() => router.push(`/devotionals/${slug}`), 800);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Unexpected token") || msg.includes("is not valid JSON")) {
        setFieldErrors({ _general: "Server returned an unexpected response. Please try again shortly." });
      } else {
        setFieldErrors({ _general: "Network error. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-md">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Unlock your devotional</h1>
      <p className="mb-4 text-sm text-text-muted">
        Enter the devotional slug, the email you paid with, and the access password from your email.
      </p>
      <form onSubmit={verify} className="space-y-4" noValidate>
        {devotionals && devotionals.length > 0 ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">Devotional</span>
            <select
              name="slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={`rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${fieldErrors.slug ? "border-danger" : "border-border"}`}
            >
              <option value="">Select a devotional</option>
              {devotionals.map((d) => (
                <option key={d.slug} value={d.slug}>{d.title}</option>
              ))}
            </select>
            {fieldErrors.slug && <p className="text-xs text-danger" role="alert">{fieldErrors.slug}</p>}
            <p className="text-xs text-text-muted">Or leave blank — we will auto-detect from your passkey when possible.</p>
          </label>
        ) : (
          <Input
            name="slug"
            type="text"
            required
            label="Devotional slug"
            placeholder="e.g. 30-days-of-prayer"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            error={fieldErrors.slug}
          />
        )}
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
          type="text"
          required
          autoComplete="off"
          label="Access password"
          placeholder="e.g. AB2CDEFG3HJK"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        {generalError && (
          <div className="flex items-center gap-2 text-sm text-danger bg-danger/5 p-3 rounded-lg" role="alert">
            <span>{generalError}</span>
          </div>
        )}
        <Button type="submit" loading={loading} className="w-full">
          Verify access
        </Button>
      </form>
      {result && (
        <p className="mt-4 rounded-lg bg-success/10 p-3 text-sm text-success">
          Access verified for <strong>{result.devotional}</strong> ({result.days} days unlocked). Enjoy.
        </p>
      )}
    </Card>
  );
}