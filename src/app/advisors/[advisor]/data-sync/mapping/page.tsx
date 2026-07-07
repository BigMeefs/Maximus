import FieldMappingList from "@/components/data-sync/field-mapping-list";
import { getFieldMappings } from "@/lib/actions/data-sync";

export default async function FieldMappingPage() {
  const mappings = await getFieldMappings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Field mappings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Spreadsheet columns matched to CRM fields, remembered from previous imports so you don&apos;t
          have to remap every time. Forget a mapping to be asked again next time that column appears.
        </p>
      </div>
      <FieldMappingList mappings={mappings} />
    </div>
  );
}
