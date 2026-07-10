"use client";

import { useActionState, useRef, useTransition } from "react";
import type { Announcement } from "@/types/database";
import {
  createAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
  type AnnouncementFormState,
} from "@/lib/actions/announcements";

const initialState: AnnouncementFormState = {};

export default function AnnouncementsManager({ announcements }: { announcements: Announcement[] }) {
  const [state, formAction, pending] = useActionState(createAnnouncement, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
          <input
            name="title"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Message</label>
          <textarea
            name="body"
            rows={3}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? "Posting..." : "Post announcement"}
          </button>
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>

      {announcements.length === 0 ? (
        <p className="text-sm text-slate-500">No announcements yet.</p>
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <AnnouncementRow key={a.id} announcement={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AnnouncementRow({ announcement }: { announcement: Announcement }) {
  const [toggling, startToggleTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{announcement.title}</p>
          <p className="mt-1 text-sm text-slate-600">{announcement.body}</p>
          <p className="mt-2 text-xs text-slate-400">
            Posted {new Date(announcement.created_at).toLocaleDateString("en-GB")}
          </p>
        </div>
        <span
          className={
            announcement.is_active
              ? "shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
              : "shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500"
          }
        >
          {announcement.is_active ? "Active" : "Hidden"}
        </span>
      </div>
      <div className="mt-3 flex gap-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          disabled={toggling}
          onClick={() =>
            startToggleTransition(() => toggleAnnouncementActive(announcement.id, !announcement.is_active))
          }
          className="text-sm font-medium text-indigo-600 hover:underline disabled:opacity-60"
        >
          {announcement.is_active ? "Hide" : "Reactivate"}
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            if (confirm("Delete this announcement?")) {
              startDeleteTransition(() => deleteAnnouncement(announcement.id));
            }
          }}
          className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
