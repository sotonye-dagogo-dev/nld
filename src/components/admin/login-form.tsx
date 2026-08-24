"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Admin login form — signs in against Supabase Auth and stores the session
// cookie server-side via /api/admin/auth/login.

export function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      toast("Welcome back.", "success");
      router.push(next.startsWith("/") ? next : "/admin");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell flex justify-center">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-xl font-semibold text-text-primary">Admin sign in</h1>
        <p className="mb-4 text-sm text-text-muted">
          Sign in with your admin account to manage the platform.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            label="Email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error ?? undefined}
            showPasswordToggle
          />
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}