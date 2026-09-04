"use client";

import { useState } from "react";
import type { Announcement } from "@/types/database";

// Renders the same active-announcement data the dashboard already fetches
// (getActiveAnnouncements) as a news-ticker-style carousel: one announcement
// at a time slides in from the left edge of the box, travels across, and
// exits the right edge — then the next one starts. This is a Client
// Component only because it needs to track *which* announcement is
// currently travelling (`cycle`) and advance to the next one when the CSS
// slide animation finishes (onAnimationEnd) — no interval, no direct DOM
// manipulation, the actual motion is a plain CSS animation
// (.announcement-ticker__item in globals.css). Hover-pause and
// prefers-reduced-motion are both handled there too.
const MIN_DURATION_SECONDS = 8.4;
const MAX_DURATION_SECONDS = 28;
const SECONDS_PER_CHARACTER = 0.21;

function durationFor(announcement: Announcement): number {
  const length = announcement.title.length + announcement.body.length;
  return Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, Math.round(length * SECONDS_PER_CHARACTER)));
}

export default function AnnouncementTicker({ announcements }: { announcements: Announcement[] }) {
  const [cycle, setCycle] = useState(0);

  if (announcements.length === 0) return null;

  const current = announcements[cycle % announcements.length];

  return (
    <section aria-label="Announcements" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div className="announcement-ticker">
        <div className="announcement-ticker__viewport">
          <span
            key={`${current.id}-${cycle}`}
            className="announcement-ticker__item"
            style={{ animationDuration: `${durationFor(current)}s` }}
            onAnimationEnd={() => setCycle((c) => c + 1)}
          >
            <span className="font-semibold text-indigo-900">{current.title}</span>
            {current.body && <span className="text-indigo-800"> — {current.body}</span>}
          </span>
        </div>

        {/* Static, non-animated equivalent shown only under
            prefers-reduced-motion (see globals.css) — lists every active
            announcement at once instead of cycling one at a time, since
            there's no motion to sequence them with. */}
        <div className="announcement-ticker__static">
          {announcements.map((a, i) => (
            <span key={a.id} className="text-sm">
              <span className="font-semibold text-indigo-900">{a.title}</span>
              {a.body && <span className="text-indigo-800"> — {a.body}</span>}
              {i < announcements.length - 1 && (
                <span aria-hidden="true" className="mx-3 text-indigo-300">
                  •
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
