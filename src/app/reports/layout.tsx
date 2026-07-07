import AdminGate from "@/components/admin-gate";
import AdminShell from "@/components/admin-shell";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate redirectTo="/reports" title="Reports">
      <AdminShell section="reports">{children}</AdminShell>
    </AdminGate>
  );
}
