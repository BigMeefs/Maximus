"use client";

import { switchAdvisor } from "@/lib/actions/advisor";

export default function SwitchAdvisorButton() {
  return (
    <form action={switchAdvisor}>
      <button
        type="submit"
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        Switch advisor
      </button>
    </form>
  );
}
