import AdminGate from "@/components/admin-gate";
import AdminShell from "@/components/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate redirectTo="/admin" title="Administration">
      <AdminShell section="admin">{children}</AdminShell>
    </AdminGate>
  );
}
