import AdminGate from "@/components/admin-gate";
import AdminShell from "@/components/admin-shell";

// This section must always be evaluated per-request (never statically
// prerendered) since access depends on a session cookie.
export const dynamic = "force-dynamic";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate redirectTo="/reports" title="Reports">
      <AdminShell section="reports">{children}</AdminShell>
    </AdminGate>
  );
}
