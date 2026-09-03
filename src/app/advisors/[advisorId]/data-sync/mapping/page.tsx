import FieldMappingList from "@/components/data-sync/field-mapping-list";
import { getFieldMappings } from "@/lib/actions/data-sync";
import PageHeader from "@/components/ui/page-header";

export default async function FieldMappingPage() {
  const mappings = await getFieldMappings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field mappings"
        description="Spreadsheet columns matched to CRM fields, remembered from previous imports so you don't have to remap every time. Forget a mapping to be asked again next time that column appears."
      />
      <FieldMappingList mappings={mappings} />
    </div>
  );
}
