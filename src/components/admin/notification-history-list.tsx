"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/badge";
import type { NotificationHistoryRow } from "@/lib/data/notifications";
import { archiveNotification, deleteNotificationPermanently, restoreNotification } from "@/lib/actions/notifications";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

function statusBadgeTone(status: string) {
  if (status === "Archived") return "slate" as const;
  if (status === "Reviewed") return "green" as const;
  if (status === "Action Required") return "amber" as const;
  return "indigo" as const;
}

export default function NotificationHistoryList({ rows }: { rows: NotificationHistoryRow[] }) {
  const [items, setItems] = useState(rows);

  if (items.length === 0) {
    return (
      <Card padding="sm">
        <p className="text-sm text-slate-500">No notifications match these filters.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((row) => (
        <HistoryRow
          key={row.id}
          row={row}
          onArchived={() =>
            setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "Archived" } : r)))
          }
          onRestored={() =>
            setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "Unread" } : r)))
          }
          onDeleted={() => setItems((prev) => prev.filter((r) => r.id !== row.id))}
        />
      ))}
    </div>
  );
}

function HistoryRow({
  row,
  onArchived,
  onRestored,
  onDeleted,
}: {
  row: NotificationHistoryRow;
  onArchived: () => void;
  onRestored: () => void;
  onDeleted: () => void;
}) {
  const [actorName, setActorName] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">{row.title}</p>
          <p className="mt-1 text-sm text-slate-600">{row.body}</p>
          <p className="mt-1 text-xs text-slate-500">
            {row.participantName} · {row.advisorName} · {row.officeName}
          </p>
          <p className="mt-1 text-xs text-slate-400">{new Date(row.created_at).toLocaleString("en-GB")}</p>
        </div>
        <Badge tone={statusBadgeTone(row.status)}>{row.status}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          value={actorName}
          onChange={(e) => setActorName(e.target.value)}
          placeholder="Your name"
          className="w-36 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />

        {row.status === "Archived" ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await restoreNotification(row.id);
                onRestored();
              })
            }
          >
            Restore
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending || !actorName.trim()}
            onClick={() =>
              startTransition(async () => {
                await archiveNotification(row.id, actorName.trim());
                onArchived();
              })
            }
          >
            Archive
          </Button>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Permanently delete this notification? This cannot be undone.")) return;
            startTransition(async () => {
              await deleteNotificationPermanently(row.id);
              onDeleted();
            });
          }}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Delete permanently
        </button>
      </div>
    </Card>
  );
}
