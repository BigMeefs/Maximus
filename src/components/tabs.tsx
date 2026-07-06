"use client";

import { useState } from "react";
import clsx from "clsx";

export type TabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export default function Tabs({
  tabs,
  initialTab,
}: {
  tabs: TabItem[];
  initialTab?: string;
}) {
  const [active, setActive] = useState(
    () => tabs.find((t) => t.id === initialTab)?.id ?? tabs[0]?.id,
  );

  return (
    <div>
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={clsx(
                "whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors",
                active === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="pt-6">
        {tabs.map((tab) => (
          <div key={tab.id} hidden={active !== tab.id}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
