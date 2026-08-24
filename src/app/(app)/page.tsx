import Link from "next/link";
import { count, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { applications, candidates, jobTitleStatuses, jobTitles, processingJobs } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/app/dashboard-charts";
import { aggregatePipelineStatusCounts } from "@/lib/pipeline-chart";
import { CANDIDATE_SOURCE_LABELS, type CandidateSource } from "@/lib/resume-sources";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [titles] = await db
    .select({ n: count() })
    .from(jobTitles)
    .where(eq(jobTitles.active, true));
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
    { label: "Active job titles", value: titles.n, href: "/job-titles" },
    { label: "Candidates", value: cands.n, href: "/candidates" },
    { label: "Applications in pipeline", value: apps.n, href: "/job-titles" },
    { label: "Resumes ready to review", value: toReview.n, href: "/processing" },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/upload" />}>
            Upload CV
          </Button>
          <Button nativeButton={false} render={<Link href="/job-titles/new" />}>
            Create job title
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={s.href} className="text-3xl font-semibold tabular-nums hover:underline">
                {s.value}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      <DashboardCharts sourceData={sourceData} pipelineData={pipelineData} />
    </div>
  );
}
