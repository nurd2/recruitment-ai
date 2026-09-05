import Link from "next/link";
import { and, count, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { applications, applicationStatusHistory, candidates, holidays, jobTitleStatuses, jobTitles } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/app/dashboard-charts";
import { aggregatePipelineStatusCounts } from "@/lib/pipeline-chart";
import { CANDIDATE_SOURCE_LABELS, type CandidateSource } from "@/lib/resume-sources";
import { requireUser } from "@/lib/authz";
import { currentSlaState, hireIsCompliant } from "@/lib/sla";
import { countWorkingDays } from "@/lib/working-days";
import { SlaDashboard } from "@/components/app/sla-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const [activeTitles] = await db
    .select({ n: count() })
    .from(jobTitles)
    .where(and(eq(jobTitles.lifecycleStatus, "active"), isNull(jobTitles.deletedAt)));
  const [holdTitles] = await db
    .select({ n: count() })
    .from(jobTitles)
    .where(and(eq(jobTitles.lifecycleStatus, "hold"), isNull(jobTitles.deletedAt)));
  const [fulfilledTitles] = await db
    .select({ n: count() })
    .from(jobTitles)
    .where(and(eq(jobTitles.lifecycleStatus, "fulfilled"), isNull(jobTitles.deletedAt)));
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
    .where(and(inArray(jobTitles.lifecycleStatus, ["active", "hold"]), isNull(jobTitles.deletedAt)))
    .groupBy(jobTitles.id, jobTitles.openings);
  const totalNeeds = fulfillmentRows.reduce((sum, row) => sum + row.openings, 0);
  const totalFilled = fulfillmentRows.reduce((sum, row) => sum + Number(row.hired), 0);
  const fulfillmentRate = totalNeeds > 0 ? Math.min(100, (totalFilled / totalNeeds) * 100) : 0;
  const [cands] = await db
    .select({ n: count() })
    .from(candidates)
    .where(isNull(candidates.deletedAt));
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
  const [titles, holidayRows, hireRows] = await Promise.all([
    db.select().from(jobTitles).where(isNull(jobTitles.deletedAt)),
    db.select({ date: holidays.date }).from(holidays),
    db.select({ jobTitleId: jobTitles.id, title: jobTitles.title, grade: jobTitles.grade, target: jobTitles.slaWorkingDays, openings: jobTitles.openings, start: jobTitles.recruitmentStartDate, changedAt: applicationStatusHistory.changedAt })
      .from(applicationStatusHistory)
      .innerJoin(applications, eq(applicationStatusHistory.applicationId, applications.id))
      .innerJoin(jobTitles, eq(applications.jobTitleId, jobTitles.id))
      .innerJoin(jobTitleStatuses, eq(applicationStatusHistory.toStatusId, jobTitleStatuses.id))
       .where(and(eq(jobTitleStatuses.name, "Hired"), isNull(jobTitles.deletedAt))),
  ]);
  const holidayDates = holidayRows.map((row) => row.date);
  const today = new Date().toISOString().slice(0, 10);
  const hiredByTitle = new Map<string, string[]>();
  for (const hire of hireRows) {
    const key = hire.jobTitleId;
    hiredByTitle.set(key, [...(hiredByTitle.get(key) ?? []), hire.changedAt.toISOString().slice(0, 10)]);
  }
  const slaRows = titles.map((title) => {
    const start = title.recruitmentStartDate ?? title.createdAt.toISOString().slice(0, 10);
    const hiredDates = hiredByTitle.get(title.id) ?? [];
    return { title: title.title, grade: title.grade, target: title.slaWorkingDays, openings: title.openings, hired: hiredDates.length, elapsed: Math.max(0, countWorkingDays(start, today, holidayDates)), state: currentSlaState({ start, today, targetDays: title.slaWorkingDays, openings: title.openings, hiredDates, holidays: holidayDates }) };
  });
  const monthly = new Map<string, { compliant: number; breached: number }>();
  for (const hire of hireRows) {
    const date = hire.changedAt.toISOString().slice(0, 7);
    const item = monthly.get(date) ?? { compliant: 0, breached: 0 };
    if (hire.start && hireIsCompliant(hire.start, hire.changedAt.toISOString().slice(0, 10), hire.target, holidayDates)) item.compliant++;
    else if (hire.start) item.breached++;
    monthly.set(date, item);
  }
  const slaMonths = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, item]) => ({ month, ...item, rate: (item.compliant / (item.compliant + item.breached)) * 100 }));

  const stats = [
    {
      label: "Active job titles",
      value: activeTitles.n,
      href: "/job-titles",
      className: "border-brand-950 bg-brand-950 text-primary-foreground shadow-brand-950/20",
      labelClassName: "text-brand-200",
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
  ];

  return (
    <div className="grid gap-6">
      <div className="relative overflow-hidden rounded-2xl bg-brand-950 px-6 py-7 text-primary-foreground shadow-xl shadow-brand-950/15 sm:px-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
              Recruitment overview
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Hi, {user.name || user.email}
            </h1>
            <p className="mt-1 text-sm text-brand-300">Keep your hiring pipeline moving.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/job-titles"
              className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-5 py-3 transition-colors hover:bg-white/15"
            >
              <span className="block text-xs font-medium text-brand-300">Fulfillment rate</span>
              <span className="mt-1 block text-2xl font-semibold tabular-nums">
                {fulfillmentRate.toFixed(0)}%
              </span>
            </Link>
            {user.role === "admin" ? (
              <Button nativeButton={false} render={<Link href="/job-titles/new" />}>
                Create job title
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="rounded-2xl bg-brand-950/5 p-1">
        <DashboardCharts sourceData={sourceData} pipelineData={pipelineData} />
      </div>
      <SlaDashboard rows={slaRows} months={slaMonths} />
    </div>
  );
}
