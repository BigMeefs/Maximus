import type { ParticipantStatusHistoryEntry } from "@/types/database";
import StatusBadge from "@/components/participant/status-badge";

export default function StatusTimeline({
  history,
}: {
  history: ParticipantStatusHistoryEntry[];
}) {
  if (history.length === 0) {
    return <p className="text-sm text-slate-500">No status changes recorded yet.</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Status History</h3>
        <p className="mt-1 text-sm text-slate-500">
          Full record of case-management status changes, most recent first.
        </p>
      </div>

      <ol className="space-y-4">
        {history.map((entry, index) => (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={
                  index === 0
                    ? "h-3 w-3 rounded-full bg-indigo-600"
                    : "h-3 w-3 rounded-full bg-slate-300"
                }
              />
              {index < history.length - 1 && <div className="w-0.5 flex-1 bg-slate-200" />}
            </div>
            <div className="pb-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {entry.from_status && (
                  <>
                    <StatusBadge status={entry.from_status} />
                    <span className="text-slate-400">→</span>
                  </>
                )}
                <StatusBadge status={entry.to_status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(entry.created_at).toLocaleString("en-GB")} — {entry.changed_by}
              </p>
              {entry.notes && <p className="mt-1 text-sm text-slate-600">{entry.notes}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
