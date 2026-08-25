"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface BankTransferActionsProps {
  transferId: string;
}

export function BankTransferActions({ transferId }: BankTransferActionsProps) {
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/bank-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId, action: "verify" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast(data.error ?? "Verification failed.", "error");
        return;
      }
      toast("Transfer verified. Access password sent to user.", "success");
      window.location.reload();
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setVerifying(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast("Rejection reason is required.", "error");
      return;
    }
    setRejecting(true);
    try {
      const res = await fetch("/api/admin/bank-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId, action: "reject", rejectionReason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast(data.error ?? "Rejection failed.", "error");
        return;
      }
      toast("Transfer rejected. User notified.", "success");
      window.location.reload();
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setRejecting(false);
      setShowRejectDialog(false);
    }
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <h3 className="mb-4 text-lg font-semibold text-text-primary">Actions</h3>
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleVerify} loading={verifying} className="bg-success hover:bg-success-hover">
          <CheckCircle className="h-4 w-4 mr-2" />
          Verify & Grant Access
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowRejectDialog(true)}
          loading={rejecting}
          className="bg-danger/10 hover:bg-danger/20 text-danger"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
      </div>

      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <h3 className="mb-4 text-lg font-semibold text-text-primary">Reject Transfer</h3>
            <p className="mb-4 text-sm text-text-muted">
              Please provide a reason for rejecting this transfer. The user will be notified via email.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Proof is unclear, amount doesn't match, invalid reference..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              rows={4}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowRejectDialog(false)} loading={rejecting}>
                Cancel
              </Button>
              <Button onClick={handleReject} loading={rejecting} className="bg-danger hover:bg-danger-hover">
                <XCircle className="h-4 w-4 mr-2" />
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}