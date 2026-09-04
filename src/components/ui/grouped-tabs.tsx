"use client";

import { useState } from "react";
import clsx from "clsx";

// Two-level tab navigation — Phase 3. Built for the participant profile's
// 13 tabs, which a flat single-row Tabs strip made hard to scan. Groups tabs
// into named categories; picking a group reveals that group's own tab row
// (skipped entirely for a single-item group). All tab content stays mounted
// at all times (toggled via the `hidden` attribute, same technique as the
// original Tabs component) so switching tabs never resets a tab's own local
// state — e.g. a half-filled form. `initialTab` matches by id against every
// item across every group, so existing "?tab=<id>" deep links resolve to
// the correct group automatically.
export type GroupedTabItem = { id: string; label: string; content: React.ReactNode };
export type GroupedTabGroup = { id: string; label: string; items: GroupedTabItem[] };

export default function GroupedTabs({ groups, initialTab }: { groups: GroupedTabGroup[]; initialTab?: string }) {
  const initialGroup = groups.find((g) => g.items.some((item) => item.id === initialTab)) ?? groups[0];
  const initialItem = initialGroup?.items.find((item) => item.id === initialTab) ?? initialGroup?.items[0];

  const [activeGroupId, setActiveGroupId] = useState(initialGroup?.id);
  const [activeTabId, setActiveTabId] = useState(initialItem?.id);

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];

  function selectGroup(group: GroupedTabGroup) {
    setActiveGroupId(group.id);
    setActiveTabId(group.items[0]?.id);
  }

  return (
    <div>
      <nav aria-label="Profile sections" className="border-b border-slate-200">
        <div className="-mb-px flex flex-wrap gap-1">
          {groups.map((group) => {
            const active = group.id === activeGroup?.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => selectGroup(group)}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                  active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
                )}
              >
                {group.label}
              </button>
            );
          })}
        </div>
      </nav>

      {activeGroup && activeGroup.items.length > 1 && (
        <nav aria-label={`${activeGroup.label} sections`} className="mt-4 flex flex-wrap gap-2">
          {activeGroup.items.map((item) => {
            const active = item.id === activeTabId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTabId(item.id)}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                  active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}

      <div className="pt-6">
        {groups.flatMap((group) =>
          group.items.map((item) => (
            <div key={item.id} hidden={item.id !== activeTabId}>
              {item.content}
            </div>
          )),
        )}
      </div>
    </div>
  );
}
