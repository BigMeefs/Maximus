import { getAllAnnouncements } from "@/lib/data/announcements";
import AnnouncementsManager from "@/components/admin/announcements-manager";
import PageHeader from "@/components/ui/page-header";

export default async function AnnouncementsPage() {
  const announcements = await getAllAnnouncements();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Short company-wide notices shown on every advisor's dashboard. Hide or delete one at any time — nothing here is scoped to a single office or advisor."
      />
      <AnnouncementsManager announcements={announcements} />
    </div>
  );
}
