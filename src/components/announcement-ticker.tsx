import type { Announcement } from "@/types/database";

// Renders the same active-announcement data the dashboard already fetches
// (getActiveAnnouncements) as a horizontally scrolling ticker instead of a
// stack of boxes. Purely presentational — no data fetching, no client
// state; hover-pause and prefers-reduced-motion are both handled by the
// plain CSS rules in globals.css (.announcement-ticker*), so this never
// needs to be a Client Component.
const MIN_DURATION_SECONDS = 20;
const SECONDS_PER_CHARACTER = 0.12;

export default function AnnouncementTicker({ announcements }: { announcements: Announcement[] }) {
  if (announcements.length === 0) return null;

  const totalCharacters = announcements.reduce((sum, a) => sum + a.title.length + a.body.length, 0);
  const durationSeconds = Math.max(MIN_DURATION_SECONDS, Math.round(totalCharacters * SECONDS_PER_CHARACTER));

  return (
    <section aria-label="Announcements" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div className="announcement-ticker">
        <div
          className="announcement-ticker__track"
          style={{ "--announcement-ticker-duration": `${durationSeconds}s` } as React.CSSProperties}
        >
          <AnnouncementList announcements={announcements} />
          <AnnouncementList announcements={announcements} duplicate />
        </div>
      </div>
    </section>
  );
}

function AnnouncementList({ announcements, duplicate }: { announcements: Announcement[]; duplicate?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center"
      aria-hidden={duplicate || undefined}
      data-ticker-copy={duplicate ? "duplicate" : undefined}
    >
      {announcements.map((a) => (
        <span key={a.id} className="flex items-center gap-3 pr-3">
          <span className="whitespace-nowrap text-sm">
            <span className="font-semibold text-indigo-900">{a.title}</span>
            {a.body && <span className="text-indigo-800"> — {a.body}</span>}
          </span>
          <span aria-hidden="true" className="text-indigo-300">
            •
          </span>
        </span>
      ))}
    </div>
  );
}
