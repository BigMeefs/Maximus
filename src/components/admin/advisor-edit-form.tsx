"use client";

import { useActionState } from "react";
import type { Advisor, Office } from "@/types/database";
import { updateAdvisor, type AdminFormState } from "@/lib/actions/admin";

const initialState: AdminFormState = {};

export default function AdvisorEditForm({
  advisor,
  offices,
}: {
  advisor: Advisor;
  offices: Office[];
}) {
  const boundAction = updateAdvisor.bind(null, advisor.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Full name</label>
        <input
          name="full_name"
          required
          defaultValue={advisor.full_name}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
        <input
          name="email"
          type="email"
          required
          defaultValue={advisor.email}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Office</label>
        <select
          name="office_id"
          required
          defaultValue={advisor.office_id}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          {offices.map((office) => (
            <option key={office.id} value={office.id}>
              {office.name}
              {!office.is_active ? " (archived)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Job title</label>
        <input
          name="job_title"
          defaultValue={advisor.job_title ?? ""}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
