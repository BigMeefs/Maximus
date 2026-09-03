import Card from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";

export default function AdminPerformanceLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-96" />
      </div>

      <Card>
        <Skeleton className="h-4 w-64" />
        <div className="mt-4 flex gap-4">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-14" />
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
