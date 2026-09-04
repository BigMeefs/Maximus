"use client";

import { useState, useTransition } from "react";
import { acceptReferral, rejectReferral } from "@/lib/actions/referrals";
import Button from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function ReferralActions({
  referralId,
  advisorId,
  participantName,
}: {
  referralId: string;
  advisorId: string;
  participantName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"accept" | "reject" | null>(null);

  function runAccept() {
    startTransition(async () => {
      const result = await acceptReferral(referralId, advisorId);
      if (result.error) {
        setMessage(result.error);
      } else if (result.duplicateOf) {
        setMessage(
          `Linked to the existing participant "${result.duplicateOf.participantName}" — currently on ${result.duplicateOf.advisorName}'s caseload. No duplicate was created; use Transfer in Administration if they should move.`,
        );
      }
    });
  }

  function runReject() {
    startTransition(async () => {
      const result = await rejectReferral(referralId, advisorId);
      if (result.error) setMessage(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button type="button" variant="success" size="xs" disabled={pending} onClick={() => setConfirming("accept")}>
          Accept
        </Button>
        <Button type="button" variant="danger" size="xs" disabled={pending} onClick={() => setConfirming("reject")}>
          Reject
        </Button>
      </div>
      {message && <p className="max-w-xs text-right text-xs text-slate-500">{message}</p>}

      <ConfirmDialog
        open={confirming === "accept"}
        title="Accept this referral?"
        description={`Accept the referral for ${participantName} and add them to the caseload.`}
        confirmLabel="Accept"
        pending={pending}
        onConfirm={() => {
          setConfirming(null);
          runAccept();
        }}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === "reject"}
        title="Reject this referral?"
        description={`Reject the referral for ${participantName}.`}
        confirmLabel="Reject"
        destructive
        pending={pending}
        onConfirm={() => {
          setConfirming(null);
          runReject();
        }}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
