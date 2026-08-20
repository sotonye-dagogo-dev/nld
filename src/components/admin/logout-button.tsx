"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

// Sign-out button — clears the admin session cookie server-side and returns
// to the login page.

export function LogoutButton() {
  const router = useRouter();
  const { toast } = useToast();

  async function logout() {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch {
      // Non-fatal — cookie clearing is best-effort server-side.
    }
    toast("Signed out.", "info");
    router.push("/admin/login");
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-background hover:text-danger"
    >
      Sign out
    </button>
  );
}