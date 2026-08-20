"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Admin invitation signup — creates the account, adds the invited email as an
// admin, and redirects straight to the panel (/admin).

export function InviteSignupForm({
  token,
  email,
  platformName,
}: {
  token: string;
  email: string;
  platformName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not accept the invitation.");
        return;
      }
      toast("Welcome to the admin team!", "success");
      router.push("/admin");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell flex justify-center">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-xl font-semibold text-text-primary">Accept invitation</h1>
        <p className="mb-4 text-sm text-text-muted">
          You&apos;ve been invited to join the admin team for <strong>{platformName}</strong>.
          Set your password to activate your account.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Input
            name="email"
            type="email"
            label="Email"
            value={email}
            readOnly
            disabled
            className="opacity-70"
          />
          <Input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            label="Password"
            hint="At least 8 characters."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            label="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={error ?? undefined}
          />
          <Button type="submit" loading={loading} className="w-full">
            Create account & sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}