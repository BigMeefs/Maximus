"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/badge";
import type { Notification, NotificationType } from "@/types/database";
import { markNotificationReviewed } from "@/lib/actions/notifications";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

export type NotificationRow = Notification & { participantName: string | null };

const TYPE_ICON: Record<NotificationType, string> = {
  trading_start_eligible_gse: "🚀",
  trading_start_eligible_ngse: "🚀",
  trading_start_eligible_claim_closed: "🚀",
  income_submitted: "💷",
  funding_approval_required: "💰",
  funding_approved: "✅",
  funding_declined: "❌",
  transferred_to_iwt: "🔄",
  outcome_achieved: "🏆",
  upcoming_review: "📅",
  referral_submitted: "✉️",
};

const TYPE_LABEL: Record<NotificationType, string> = {
  trading_start_eligible_gse: "GSE Trading Start eligibility",
  trading_start_eligible_ngse: "NGSE Trading Start eligibility",
  trading_start_eligible_claim_closed: "Claim Closed Trading Start eligibility",
  income_submitted: "Income submitted",
  funding_approval_required: "Funding approval required",
  funding_approved: "Funding approved",
  funding_declined: "Funding declined",
  transferred_to_iwt: "Transferred to IWT",
  outcome_achieved: "Outcome achieved",
  upcoming_review: "Upcoming review",
  referral_submitted: "Referral submitted",
};

export default function NotificationQueue({
  notifications,
  advisorId,
  reviewedByName,
}: {
  notifications: NotificationRow[];
  advisorId: string;
  reviewedByName: string;
}) {
  const [rows, setRows] = useState(notifications);

  if (rows.length === 0) {
    return (
      <Card padding="none" className="p-8 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 text-sm font-medium text-slate-700">
          You&apos;re all caught up. No notifications require your attention.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <NotificationCard
          key={row.id}
          row={row}
          advisorId={advisorId}
          reviewedByName={reviewedByName}
          onReviewed={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
        />
      ))}
    </div>
  );
}

function NotificationCard({
  row,
  advisorId,
  reviewedByName,
  onReviewed,
}: {
  row: NotificationRow;
  advisorId: string;
  reviewedByName: string;
  onReviewed: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const participantHref = row.participant_id
    ? `/advisors/${advisorId}/participants/${row.participant_id}`
    : null;

  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-xl leading-none">
            {TYPE_ICON[row.type]}
          </span>
          <div>
            <p className="font-medium text-slate-900">{row.title}</p>
            <p className="mt-1 text-sm text-slate-600">{row.body}</p>
            <p className="mt-1 text-xs text-slate-400">
              {TYPE_LABEL[row.type]} · {new Date(row.created_at).toLocaleString("en-GB")}
            </p>
          </div>
        </div>
        <Badge tone={row.status === "Action Required" ? "amber" : "indigo"}>{row.status}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="success"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markNotificationReviewed(row.id, reviewedByName);
              onReviewed();
            })
          }
        >
          {pending ? "Marking..." : "✓ Mark as Reviewed"}
        </Button>
        {participantHref && (
          <Button variant="secondary" size="sm" href={participantHref}>
            {row.participantName ?? "Open participant"}
          </Button>
        )}
      </div>
    </Card>
  );
}
