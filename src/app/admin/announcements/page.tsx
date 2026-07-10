import { getAllAnnouncements } from "@/lib/data/announcements";
import AnnouncementsManager from "@/components/admin/announcements-manager";

export default async function AnnouncementsPage() {
  const announcements = await getAllAnnouncements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Short company-wide notices shown on every advisor&apos;s dashboard. Hide or delete one at
          any time — nothing here is scoped to a single office or advisor.
        </p>
      </div>
      <AnnouncementsManager announcements={announcements} />
    </div>
  );
}
