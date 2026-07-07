"use client";

import { useActionState, useMemo, useTransition } from "react";
import type { Appointment } from "@/types/database";
import type { AdvisorWithOffice } from "@/lib/data/advisor";
import {
  createAppointment,
  deleteAppointment,
  type AppointmentFormState,
} from "@/lib/actions/appointments";

const initialState: AppointmentFormState = {};

export default function AppointmentsTab({
  participantId,
  appointments,
  advisors,
  defaultAdvisorId,
}: {
  participantId: string;
  appointments: Appointment[];
  advisors: AdvisorWithOffice[];
  defaultAdvisorId: string;
}) {
  const boundAction = createAppointment.bind(null, participantId);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );
  const [deletingId, startDeleteTransition] = useTransition();

  const advisorNameById = useMemo(
    () => new Map(advisors.map((a) => [a.id, a.full_name])),
    [advisors],
  );

  return (
    <div className="max-w-3xl space-y-6">
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Date
            </label>
            <input
              type="date"
              name="appointment_date"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Advisor
            </label>
            <select
              name="advisor_id"
              required
              defaultValue={defaultAdvisorId}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {advisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Notes
            </label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Outcome
            </label>
            <input
              name="outcome"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="e.g. Follow-up required in 2 weeks"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Log appointment"}
          </button>
          {state.error && (
            <span className="text-sm text-red-600">{state.error}</span>
          )}
        </div>
      </form>

      {appointments.length === 0 ? (
        <p className="text-sm text-slate-500">No appointments logged yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {appointments.map((appt) => (
            <li key={appt.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(appt.appointment_date).toLocaleDateString()} ·{" "}
                    {advisorNameById.get(appt.advisor_id) ?? "Unknown advisor"}
                  </p>
                  {appt.notes && (
                    <p className="mt-1 text-sm text-slate-600">{appt.notes}</p>
                  )}
                  {appt.outcome && (
                    <p className="mt-1 text-xs text-slate-500">
                      Outcome: {appt.outcome}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={deletingId}
                  onClick={() =>
                    startDeleteTransition(() =>
                      deleteAppointment(participantId, appt.id),
                    )
                  }
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
