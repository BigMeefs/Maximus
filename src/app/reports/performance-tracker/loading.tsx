import Card from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";

export default function PerformanceTrackerLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      <Card padding="sm">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-12" />
          </Card>
        ))}
      </div>

      <Card padding="sm" className="h-72 w-full">
        <Skeleton className="h-full w-full" />
      </Card>
    </div>
  );
}
