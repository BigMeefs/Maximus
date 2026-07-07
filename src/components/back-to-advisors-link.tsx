import Link from "next/link";

export default function BackToAdvisorsLink() {
  return (
    <Link
      href="/select-advisor"
      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      ← All advisors
    </Link>
  );
}
