"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const looksLikeMissingSupabaseConfig = /supabase/i.test(error.message);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <h1 className="text-lg font-semibold text-slate-900">
          Something went wrong
        </h1>
        {looksLikeMissingSupabaseConfig ? (
          <p className="mt-2 text-sm text-slate-500">
            The app can&apos;t reach Supabase. Double-check that{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            are set for this deployment (Vercel: Project Settings → Environment
            Variables, then redeploy).
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            An unexpected error occurred while loading this page.
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
