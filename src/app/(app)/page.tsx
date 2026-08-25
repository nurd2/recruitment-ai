import Link from "next/link";
import { and, count, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { applications, candidates, jobTitleStatuses, jobTitles, processingJobs } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/app/dashboard-charts";
import { aggregatePipelineStatusCounts } from "@/lib/pipeline-chart";
import { CANDIDATE_SOURCE_LABELS, type CandidateSource } from "@/lib/resume-sources";
import { requireUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const [activeTitles] = await db
    .select({ n: count() })
    .from(jobTitles)
    .where(eq(jobTitles.lifecycleStatus, "active"));
  const [holdTitles] = await db
    .select({ n: count() })
    .from(jobTitles)
    .where(eq(jobTitles.lifecycleStatus, "hold"));
  const [fulfilledTitles] = await db
    .select({ n: count() })
    .from(jobTitles)
    .where(eq(jobTitles.lifecycleStatus, "fulfilled"));
  const fulfillmentRows = await db
    .select({
      openings: jobTitles.openings,
      hired: count(jobTitleStatuses.id),
    })
    .from(jobTitles)
    .leftJoin(
      applications,
      and(eq(applications.jobTitleId, jobTitles.id), eq(applications.withdrawn, false)),
    )
    .leftJoin(
      jobTitleStatuses,
      and(
        eq(applications.currentStatusId, jobTitleStatuses.id),
        eq(jobTitleStatuses.name, "Hired"),
      ),
    )
    .groupBy(jobTitles.id, jobTitles.openings);
  const totalNeeds = fulfillmentRows.reduce((sum, row) => sum + row.openings, 0);
  const totalFilled = fulfillmentRows.reduce((sum, row) => sum + Number(row.hired), 0);
  const fulfillmentRate = totalNeeds > 0 ? Math.min(100, (totalFilled / totalNeeds) * 100) : 0;
  const [cands] = await db
    .select({ n: count() })
    .from(candidates)
    .where(isNull(candidates.deletedAt));
  const [apps] = await db
    .select({ n: count() })
    .from(applications)
    .where(eq(applications.withdrawn, false));
  const [toReview] = await db
    .select({ n: count() })
    .from(processingJobs)
    .where(inArray(processingJobs.state, ["ready", "needs_review"]));
  const sourceCounts = await db
    .select({ source: candidates.source, n: count() })
    .from(candidates)
    .where(isNull(candidates.deletedAt))
    .groupBy(candidates.source);
  const pipelineCounts = await db
    .select({
      statusName: jobTitleStatuses.name,
      n: count(),
    })
    .from(applications)
    .leftJoin(jobTitleStatuses, eq(applications.currentStatusId, jobTitleStatuses.id))
    .where(eq(applications.withdrawn, false))
    .groupBy(jobTitleStatuses.name);

  const sortedSourceCounts = [...sourceCounts].sort((a, b) => Number(b.n) - Number(a.n));
  const sourceData = sortedSourceCounts.map(({ source, n }) => ({
    label: source
      ? (CANDIDATE_SOURCE_LABELS[source as CandidateSource] ?? source)
      : "Not specified",
    value: Number(n),
  }));
  const pipelineData = aggregatePipelineStatusCounts(pipelineCounts);

  const stats = [
    {
      label: "Active job titles",
      value: activeTitles.n,
      href: "/job-titles",
      className: "border-[#102a43] bg-[#102a43] text-white shadow-[#102a43]/20",
      labelClassName: "text-slate-200",
    },
    {
      label: "Job titles on hold",
      value: holdTitles.n,
      href: "/job-titles",
      className: "border-teal-200 bg-teal-50 text-teal-950 shadow-teal-900/10",
      labelClassName: "text-teal-700",
    },
    {
      label: "Fulfilled job titles",
      value: fulfilledTitles.n,
      href: "/job-titles",
      className: "border-amber-200 bg-amber-50 text-amber-950 shadow-amber-900/10",
      labelClassName: "text-amber-700",
    },
    {
      label: "Candidates",
      value: cands.n,
      href: "/candidates",
      className: "border-sky-200 bg-sky-50 text-sky-950 shadow-sky-900/10",
      labelClassName: "text-sky-700",
    },
    {
      label: "Applications in pipeline",
      value: apps.n,
      href: "/job-titles",
      className: "border-orange-200 bg-orange-50 text-orange-950 shadow-orange-900/10",
      labelClassName: "text-orange-700",
    },
    {
      label: "Resumes ready to review",
      value: toReview.n,
      href: "/processing",
      className: "border-slate-200 bg-slate-50 text-slate-950 shadow-slate-900/10",
      labelClassName: "text-slate-600",
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="relative overflow-hidden rounded-2xl bg-[#102a43] px-6 py-7 text-white shadow-xl shadow-[#102a43]/15 sm:px-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
              Recruitment overview
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Hi, {user.name || user.email}
            </h1>
            <p className="mt-1 text-sm text-slate-300">Keep your hiring pipeline moving.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/job-titles"
              className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-5 py-3 transition-colors hover:bg-white/15"
            >
              <span className="block text-xs font-medium text-slate-300">Fulfillment rate</span>
              <span className="mt-1 block text-2xl font-semibold tabular-nums">
                {fulfillmentRate.toFixed(0)}%
              </span>
            </Link>
            <Button nativeButton={false} render={<Link href="/job-titles/new" />}>
              Create job title
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className={`shadow-lg ${s.className}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium ${s.labelClassName}`}>{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={s.href} className="text-3xl font-semibold tabular-nums hover:underline">
                {s.value}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="rounded-2xl bg-[#102a43]/5 p-1">
        <DashboardCharts sourceData={sourceData} pipelineData={pipelineData} />
      </div>
    </div>
  );
}
