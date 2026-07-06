"use client";

import { signOut } from "@/app/actions/auth";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        Sign out
      </button>
    </form>
  );
}
