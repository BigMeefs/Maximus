"use client";

import { useState, useTransition } from "react";
import { acceptReferral, rejectReferral } from "@/lib/actions/referrals";
import Button from "@/components/ui/button";

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

  function handleAccept() {
    if (!confirm(`Accept the referral for ${participantName} and add them to the caseload?`)) return;
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

  function handleReject() {
    if (!confirm(`Reject the referral for ${participantName}?`)) return;
    startTransition(async () => {
      const result = await rejectReferral(referralId, advisorId);
      if (result.error) setMessage(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={handleAccept}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          Accept
        </button>
        <Button type="button" variant="danger" size="xs" disabled={pending} onClick={handleReject}>
          Reject
        </Button>
      </div>
      {message && <p className="max-w-xs text-right text-xs text-slate-500">{message}</p>}
    </div>
  );
}
