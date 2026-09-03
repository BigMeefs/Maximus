import clsx from "clsx";

// Shared loading-skeleton primitive — Phase 2. A single pulsing block;
// route loading.tsx files compose these (often alongside the shared Card)
// into a rough ghost of the page's real layout. Uses Tailwind's built-in
// animate-pulse, no new dependency.
export default function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded bg-slate-200", className)} />;
}
