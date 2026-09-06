import { Skeleton } from "@/components/ui/skeleton";

export function GreetingSkeleton() {
  return <Skeleton className="h-[140px] w-full rounded-[22px] bg-brand-950/15" />;
}

export function StatCardSkeleton() {
  return <Skeleton className="min-h-[154px] w-full rounded-[22px]" />;
}

export function MetricSkeleton() {
  return <Skeleton className="h-[132px] w-full rounded-[18px]" />;
}

export function ChartSkeleton({ className = "h-[360px]" }: { className?: string }) {
  return <Skeleton className={`w-full rounded-[22px] ${className}`} />;
}

export function SummarySkeleton() {
  return <Skeleton className="h-[360px] w-full rounded-[22px]" />;
}

export function TableSkeleton() {
  return (
    <div className="rounded-[22px] bg-card p-6 ring-1 ring-foreground/10">
      <div className="grid gap-3">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
