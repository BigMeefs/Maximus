"use client";

import { useActionState } from "react";
import { loginAdmin, type AdminLoginFormState } from "@/lib/actions/admin-auth";

const initialState: AdminLoginFormState = {};

export default function AdminLoginForm({
  redirectTo,
  title,
}: {
  redirectTo: string;
  title: string;
}) {
  const boundAction = loginAdmin.bind(null, redirectTo);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50"
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
          SE
        </div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the admin passcode to continue.</p>
      </div>
      <input
        type="password"
        name="passcode"
        required
        autoFocus
        placeholder="Passcode"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Checking..." : "Continue"}
      </button>
      <a
        href="/select-advisor"
        className="mt-4 block text-center text-sm text-slate-500 hover:text-indigo-600"
      >
        ← Back to Home
      </a>
    </form>
  );
}
