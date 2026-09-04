"use client";

import { useId, useState } from "react";
import clsx from "clsx";

// Two-level tab navigation — Phase 3, refined in Phase 4. Built for the
// participant profile's 13 tabs, which a flat single-row Tabs strip made
// hard to scan, and reused in its flat (single-item-group) form for the
// Reports page. Groups tabs into named categories; picking a group reveals
// that group's own tab row (skipped entirely for a single-item group). All
// tab content stays mounted at all times (toggled via the `hidden`
// attribute, same technique as the original Tabs component) so switching
// tabs never resets a tab's own local state — e.g. a half-filled form.
// `initialTab` matches by id against every item across every group, so
// existing "?tab=<id>" deep links resolve to the correct group
// automatically. `description`, on an item, is optional — most items don't
// set one, so most tabs render exactly as before.
export type GroupedTabItem = { id: string; label: string; description?: string; content: React.ReactNode };
export type GroupedTabGroup = { id: string; label: string; items: GroupedTabItem[] };

export default function GroupedTabs({ groups, initialTab }: { groups: GroupedTabGroup[]; initialTab?: string }) {
  const baseId = useId();
  const initialGroup = groups.find((g) => g.items.some((item) => item.id === initialTab)) ?? groups[0];
  const initialItem = initialGroup?.items.find((item) => item.id === initialTab) ?? initialGroup?.items[0];

  const [activeGroupId, setActiveGroupId] = useState(initialGroup?.id);
  const [activeTabId, setActiveTabId] = useState(initialItem?.id);

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const activeItem = activeGroup?.items.find((item) => item.id === activeTabId);

  function selectGroup(group: GroupedTabGroup) {
    setActiveGroupId(group.id);
    setActiveTabId(group.items[0]?.id);
  }

  return (
    <div>
      <div role="tablist" aria-label="Profile sections" className="border-b border-slate-200">
        <div className="-mb-px flex flex-wrap gap-1">
          {groups.map((group) => {
            const active = group.id === activeGroup?.id;
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={active}
                id={`${baseId}-group-${group.id}`}
                onClick={() => selectGroup(group)}
                className={clsx(
                  "rounded-t-lg border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                  active
                    ? "border-indigo-600 font-semibold text-indigo-600"
                    : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700",
                )}
              >
                {group.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeGroup && activeGroup.items.length > 1 && (
        <div role="tablist" aria-label={`${activeGroup.label} sections`} className="mt-4 flex flex-wrap gap-2">
          {activeGroup.items.map((item) => {
            const active = item.id === activeTabId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                id={`${baseId}-tab-${item.id}`}
                aria-controls={`${baseId}-panel-${item.id}`}
                onClick={() => setActiveTabId(item.id)}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                  active ? "bg-indigo-600 font-semibold text-white" : "bg-slate-100 font-medium text-slate-600 hover:bg-slate-200",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {activeItem?.description && (
        <p className="mt-3 text-sm text-slate-500">{activeItem.description}</p>
      )}

      <div className="pt-6">
        {groups.flatMap((group) =>
          group.items.map((item) => (
            <div
              key={item.id}
              role="tabpanel"
              id={`${baseId}-panel-${item.id}`}
              aria-labelledby={`${baseId}-tab-${item.id}`}
              hidden={item.id !== activeTabId}
            >
              {item.content}
            </div>
          )),
        )}
      </div>
    </div>
  );
}
