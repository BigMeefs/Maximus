import type { NextBestAction } from "@/lib/next-best-action";

export default function NextBestActionPanel({
  recommendation,
}: {
  recommendation: NextBestAction;
}) {
  return (
    <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Next Best Action
      </p>
      <p className="mt-1 text-lg font-semibold text-indigo-900">
        {recommendation.action}
      </p>
      <p className="mt-1 text-sm text-indigo-700">{recommendation.reason}</p>
    </div>
  );
}
