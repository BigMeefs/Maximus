"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import type { ChecklistEntry } from "@/lib/business-rules";
import { GATEWAY_OUTCOMES, type GatewayBookedStatus, type GatewayChecklistItemName, type GatewayOutcome } from "@/types/database";
import { toggleGatewayChecklistItem, updateGatewayBooking, updateGatewayNotes } from "@/lib/actions/gateway";

const BOOKED_STATUSES: GatewayBookedStatus[] = ["Not Booked", "Booked", "Completed"];

export default function GatewayAssessmentCard({
  participantId,
  advisorId,
  entries,
  percent,
  gatewayTargetDate,
  gatewayNotes,
  gatewayBookedStatus,
  gatewayAppointmentDate,
  gatewayOutcome,
}: {
  participantId: string;
  advisorId: string;
  entries: ChecklistEntry[];
  percent: number;
  gatewayTargetDate: string | null;
  gatewayNotes: string | null;
  gatewayBookedStatus: GatewayBookedStatus;
  gatewayAppointmentDate: string | null;
  gatewayOutcome: GatewayOutcome | null;
}) {
  const [pending, startTransition] = useTransition();
  const [notesPending, startNotesTransition] = useTransition();
  const [notes, setNotes] = useState(gatewayNotes ?? "");
  const [bookingPending, startBookingTransition] = useTransition();
  const [bookedStatus, setBookedStatus] = useState<GatewayBookedStatus>(gatewayBookedStatus);
  const boundBookingAction = updateGatewayBooking.bind(null, participantId, advisorId);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Gateway Assessment</h3>
      <p className="mt-1 text-xs text-slate-500">
        Readiness checklist, key dates and advisor notes ahead of the Gateway decision.
      </p>

      <div className="mt-4 space-y-6">
        <div>
          <div className="flex items-center justify-between text-sm">
            <h4 className="font-medium text-slate-800">Gateway Readiness</h4>
            <span className="font-semibold text-slate-900">{percent}%</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={clsx(
                "h-full rounded-full transition-all",
                percent >= 90 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-red-500",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {entries.map((entry) => (
            <li key={entry.label} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={entry.complete}
                  disabled={entry.source === "auto" || pending}
                  onChange={(e) =>
                    startTransition(() =>
                      toggleGatewayChecklistItem(
                        participantId,
                        entry.label as GatewayChecklistItemName,
                        e.target.checked,
                      ),
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-70"
                />
                <span className="text-sm text-slate-800">{entry.label}</span>
              </div>
              <span
                className={clsx(
                  "text-xs font-medium",
                  entry.source === "auto" ? "text-slate-400" : "text-slate-300",
                )}
              >
                {entry.source === "auto" ? "Auto" : ""}
              </span>
            </li>
          ))}
        </ul>

        <div>
          <h4 className="mb-2 text-sm font-medium text-slate-800">Dates</h4>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Gateway target date
            </p>
            <p className="mt-1 text-slate-800">
              {gatewayTargetDate
                ? new Date(gatewayTargetDate).toLocaleDateString("en-GB")
                : "Not set — edit the participant to add one."}
            </p>
          </div>
        </div>

        <form
          action={(formData) => startBookingTransition(() => boundBookingAction(formData))}
          className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Gateway Booked</label>
            <select
              name="gateway_booked_status"
              value={bookedStatus}
              onChange={(e) => setBookedStatus(e.target.value as GatewayBookedStatus)}
              className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {BOOKED_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {(bookedStatus === "Booked" || bookedStatus === "Completed") && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Gateway Appointment Date
              </label>
              <input
                type="date"
                name="gateway_appointment_date"
                defaultValue={gatewayAppointmentDate ?? ""}
                className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          )}

          {bookedStatus === "Completed" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">Gateway Outcome</label>
              <select
                name="gateway_outcome"
                required
                defaultValue={gatewayOutcome ?? ""}
                className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="" disabled>
                  Select outcome...
                </option>
                {GATEWAY_OUTCOMES.map((outcome) => (
                  <option key={outcome} value={outcome}>
                    {outcome}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Feeds directly into Trading Start eligibility — GSE marks the participant as
                Gainfully Self Employed; NGSE relies on the two-month income average rule.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={bookingPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {bookingPending ? "Saving..." : "Save Gateway booking"}
          </button>
        </form>

        <form
          action={(formData) => startNotesTransition(() => updateGatewayNotes(participantId, formData))}
          className="space-y-2"
        >
          <label className="block text-sm font-medium text-slate-800">Advisor Notes</label>
          <textarea
            name="gateway_notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes on Gateway readiness, blockers, next actions..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="submit"
            disabled={notesPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {notesPending ? "Saving..." : "Save notes"}
          </button>
        </form>
      </div>
    </section>
  );
}
