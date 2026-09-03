import Card from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";

export default function AdminOverviewLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-12" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} padding="lg">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-4 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
