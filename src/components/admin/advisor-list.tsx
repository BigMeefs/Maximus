"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import Badge from "@/components/badge";
import Button from "@/components/ui/button";
import { Table, THead, Th, TBody } from "@/components/ui/table";
import type { AdvisorWithOffice } from "@/lib/data/advisor";
import type { Office } from "@/types/database";
import { createAdvisor, setAdvisorStatus, type AdminFormState } from "@/lib/actions/admin";

const initialState: AdminFormState = {};

export default function AdvisorList({
  advisors,
  offices,
  caseloadCounts,
}: {
  advisors: AdvisorWithOffice[];
  offices: Office[];
  caseloadCounts: Map<string, number>;
}) {
  const [createState, createAction, creating] = useActionState(createAdvisor, initialState);

  return (
    <div className="space-y-6">
      <form
        action={createAction}
        className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Full name</label>
          <input
            name="full_name"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Office</label>
          <select
            name="office_id"
            required
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="" disabled>
              Select office
            </option>
            {offices.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Job title</label>
          <input
            name="job_title"
            placeholder="e.g. Self Employment Advisor"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div className="flex items-center gap-3 lg:col-span-4">
          <Button type="submit" disabled={creating}>
            {creating ? "Adding..." : "Add advisor"}
          </Button>
          {createState.error && <span className="text-sm text-red-600">{createState.error}</span>}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <THead>
            <tr>
              <Th>Name</Th>
              <Th className="hidden sm:table-cell">Office</Th>
              <Th className="hidden lg:table-cell">Job title</Th>
              <Th>Caseload</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {advisors.map((advisor) => (
              <AdvisorRow
                key={advisor.id}
                advisor={advisor}
                caseload={caseloadCounts.get(advisor.id) ?? 0}
              />
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}

function AdvisorRow({
  advisor,
  caseload,
}: {
  advisor: AdvisorWithOffice;
  caseload: number;
}) {
  const [togglingStatus, startToggleTransition] = useTransition();

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <Link
          href={`/admin/advisors/${advisor.id}`}
          className="font-medium text-slate-900 hover:text-indigo-600"
        >
          {advisor.full_name}
        </Link>
        <p className="text-xs text-slate-500">{advisor.email}</p>
      </td>
      <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{advisor.office_name}</td>
      <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{advisor.job_title || "—"}</td>
      <td className="px-4 py-3 text-slate-600">{caseload}</td>
      <td className="px-4 py-3">
        <Badge tone={advisor.status === "Active" ? "green" : "slate"}>{advisor.status}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          disabled={togglingStatus}
          onClick={() =>
            startToggleTransition(() =>
              setAdvisorStatus(advisor.id, advisor.status === "Active" ? "Inactive" : "Active"),
            )
          }
          className="text-sm font-medium text-slate-600 hover:text-red-600 disabled:opacity-60"
        >
          {advisor.status === "Active" ? "Archive" : "Reactivate"}
        </button>
      </td>
    </tr>
  );
}
