"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Standalone access entry — lets purchasers unlock a devotional from anywhere
// (not just the reader page). Verifies via /api/access/verify.

export function AccessEntry() {
  const { toast } = useToast();
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ devotional: string; days: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email, password }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        devotional?: string;
        days?: number;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Verification failed.");
        return;
      }
      setResult({ devotional: data.devotional ?? slug, days: data.days ?? 0 });
      toast("Access verified", "success");
    } catch {
      setError("Network error. Please try again.");
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
      <form onSubmit={verify} className="space-y-4">
        <Input
          name="slug"
          type="text"
          required
          label="Devotional slug"
          placeholder="e.g. 30-days-of-prayer"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
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