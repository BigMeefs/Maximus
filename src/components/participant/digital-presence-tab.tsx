"use client";

import { useTransition } from "react";
import { DIGITAL_PLATFORMS, type DigitalPresenceItem } from "@/types/database";
import { updateDigitalPresenceItem } from "@/lib/actions/digital-presence";

export default function DigitalPresenceTab({
  participantId,
  items,
}: {
  participantId: string;
  items: DigitalPresenceItem[];
}) {
  const byPlatform = new Map(items.map((i) => [i.platform, i]));
  const activeCount = DIGITAL_PLATFORMS.filter(
    (p) => byPlatform.get(p)?.is_active,
  ).length;
  const percent = Math.round((activeCount / DIGITAL_PLATFORMS.length) * 100);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="flex items-center justify-between text-sm">
          <h3 className="font-semibold text-slate-900">Digital Presence Completion</h3>
          <span className="font-semibold text-slate-900">{percent}%</span>
        </div>
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

  return (
    <form
      action={(formData) => startTransition(() => boundAction(formData))}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"
    >
      <div className="flex w-48 shrink-0 items-center gap-2">
        <span className="text-lg">{item?.is_active ? "✔" : "❌"}</span>
        <span className="text-sm font-medium text-slate-800">{platform}</span>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={item?.is_active ?? false}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        Active
      </label>

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
