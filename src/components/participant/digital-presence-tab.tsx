"use client";

import { useTransition } from "react";
import clsx from "clsx";
import { DIGITAL_PLATFORMS, DIGITAL_PRESENCE_STATUSES, type DigitalPresenceItem, type DigitalPresenceStatus } from "@/types/database";
import { isDigitalPresenceDone } from "@/lib/business-rules";
import { updateDigitalPresenceItem } from "@/lib/actions/digital-presence";

const STATUS_BADGE: Record<DigitalPresenceStatus, string> = {
  Complete: "bg-emerald-100 text-emerald-700",
  "In Progress": "bg-amber-100 text-amber-700",
  "Not Started": "bg-slate-100 text-slate-600",
  "Not Needed": "bg-slate-200 text-slate-500",
};

export default function DigitalPresenceTab({
  participantId,
  items,
}: {
  participantId: string;
  items: DigitalPresenceItem[];
}) {
  const byPlatform = new Map(items.map((i) => [i.platform, i]));
  const doneCount = DIGITAL_PLATFORMS.filter((p) => isDigitalPresenceDone(byPlatform.get(p))).length;
  const percent = Math.round((doneCount / DIGITAL_PLATFORMS.length) * 100);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="flex items-center justify-between text-sm">
          <h3 className="font-semibold text-slate-900">Digital Presence Completion</h3>
          <span className="font-semibold text-slate-900">{percent}%</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Platforms marked &ldquo;Not Needed&rdquo; count as complete — advisors aren&apos;t penalised for
          businesses that genuinely don&apos;t need a given platform.
        </p>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {DIGITAL_PLATFORMS.map((platform) => (
          <PlatformRow
            key={platform}
            participantId={participantId}
            platform={platform}
            item={byPlatform.get(platform) ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function PlatformRow({
  participantId,
  platform,
  item,
}: {
  participantId: string;
  platform: string;
  item: DigitalPresenceItem | null;
}) {
  const [pending, startTransition] = useTransition();
  const boundAction = updateDigitalPresenceItem.bind(
    null,
    participantId,
    platform as DigitalPresenceItem["platform"],
  );
  const status = item?.status ?? "Not Started";

  return (
    <form
      action={(formData) => startTransition(() => boundAction(formData))}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"
    >
      <div className="flex w-48 shrink-0 items-center gap-2">
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            STATUS_BADGE[status],
          )}
        >
          {status}
        </span>
        <span className="text-sm font-medium text-slate-800">{platform}</span>
      </div>

      <select
        name="status"
        defaultValue={status}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {DIGITAL_PRESENCE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <input
        type="url"
        name="url"
        placeholder="https://..."
        defaultValue={item?.url ?? ""}
        className="w-full min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />

      {item?.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="whitespace-nowrap text-sm font-medium text-indigo-600 hover:underline"
        >
          Open ↗
        </a>
      )}

      <input
        type="text"
        name="notes"
        placeholder="Notes"
        defaultValue={item?.notes ?? ""}
        className="w-full min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />

      <button
        type="submit"
        disabled={pending}
        className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
