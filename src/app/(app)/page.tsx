import type { Metadata } from "next";
import { Suspense } from "react";

import {
  ApplicationPipelinePanel,
  CandidateSourcesPanel,
  DashboardGreeting,
  DashboardStatCard,
  MonthlySlaPanel,
  SlaMetricCard,
  SlaSummaryPanel,
  SlaTablePanel,
} from "@/components/app/dashboard-sections";
import {
  ChartSkeleton,
  GreetingSkeleton,
  MetricSkeleton,
  StatCardSkeleton,
  SummarySkeleton,
  TableSkeleton,
} from "@/components/app/dashboard-skeletons";
import { SlaMonthSelect } from "@/components/app/sla-month-select";
import { jakartaDate, lastSixMonths } from "@/lib/sla";
import { validDashboardMonth } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const months = lastSixMonths(jakartaDate());
  const params = await searchParams;
  const selectedMonth = validDashboardMonth(params.month, months);

  return (
    <main className="mx-auto grid max-w-[1440px] gap-6">
      <Suspense fallback={<GreetingSkeleton />}>
        <DashboardGreeting />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["active", "hold", "fulfilled", "candidates"] as const).map((kind) => (
          <Suspense key={kind} fallback={<StatCardSkeleton />}>
            <DashboardStatCard kind={kind} />
          </Suspense>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 pt-3">
        <h1 className="text-[27px] font-bold tracking-tight">Recruitment SLA Performance</h1>
        <SlaMonthSelect months={months} value={selectedMonth} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(["total", "fulfilled", "compliance", "withdrawals"] as const).map((kind) => (
          <Suspense key={`${selectedMonth}-${kind}`} fallback={<MetricSkeleton />}>
            <SlaMetricCard month={selectedMonth} kind={kind} />
          </Suspense>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.75fr_1fr]">
        <Suspense key={`monthly-${selectedMonth}`} fallback={<ChartSkeleton />}>
          <MonthlySlaPanel />
        </Suspense>
        <Suspense key={`summary-${selectedMonth}`} fallback={<SummarySkeleton />}>
          <SlaSummaryPanel month={selectedMonth} />
        </Suspense>
      </div>

      <Suspense key={`table-${selectedMonth}`} fallback={<TableSkeleton />}>
        <SlaTablePanel month={selectedMonth} />
      </Suspense>

      <section className="grid gap-4">
        <h2 className="text-[23px] font-bold tracking-tight">Candidate &amp; Pipeline Overview</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Suspense fallback={<ChartSkeleton className="h-[360px]" />}>
            <CandidateSourcesPanel />
          </Suspense>
          <Suspense fallback={<ChartSkeleton className="h-[360px]" />}>
            <ApplicationPipelinePanel />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
