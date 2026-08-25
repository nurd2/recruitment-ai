import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, desc, eq, ilike, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { applications, candidates, jobTitleStatuses, jobTitles } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UploadForm } from "@/components/app/upload-form";
import { CandidateActions } from "@/components/app/candidate-actions";
import { PipelineFilter } from "@/components/app/pipeline-filter";
import { StatusBadge } from "@/components/app/status-badge";
import { TablePagination } from "@/components/app/table-pagination";
import { ageFromDob, formatDate } from "@/lib/format";
import {
  CANDIDATE_SOURCE_LABELS,
  RESUME_SOURCES,
  type CandidateSource,
} from "@/lib/resume-sources";
import { JOB_TITLE_LIFECYCLE_LABELS } from "@/lib/job-title-status";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function JobTitleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; source?: string; page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const statusId = sp.status ?? "";
  const source = RESUME_SOURCES.includes(sp.source as CandidateSource)
    ? (sp.source as CandidateSource)
    : "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const [title] = await db.select().from(jobTitles).where(eq(jobTitles.id, id));
  if (!title) notFound();

  const statuses = await db
    .select()
    .from(jobTitleStatuses)
    .where(and(eq(jobTitleStatuses.jobTitleId, id), eq(jobTitleStatuses.active, true)))
    .orderBy(asc(jobTitleStatuses.position));

  // Other active job titles this application can be moved to.
  const otherJobTitles = (
    await db
      .select({ id: jobTitles.id, title: jobTitles.title })
      .from(jobTitles)
      .where(eq(jobTitles.active, true))
      .orderBy(asc(jobTitles.title))
  ).filter((t) => t.id !== id);

  const filters = [
    eq(applications.jobTitleId, id),
    eq(applications.withdrawn, false),
    isNull(candidates.deletedAt),
  ];
  if (statusId) filters.push(eq(applications.currentStatusId, statusId));
  if (source) filters.push(eq(candidates.source, source));
  if (q) {
    const qFilter = or(ilike(candidates.fullName, `%${q}%`), ilike(candidates.email, `%${q}%`));
    if (qFilter) filters.push(qFilter);
  }
  const where = and(...filters);

  const [totalRow] = await db
    .select({ n: count() })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .where(where);
  const total = totalRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const rows = await db
    .select({
      application: applications,
      candidate: candidates,
      statusName: jobTitleStatuses.name,
      statusColor: jobTitleStatuses.color,
    })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .leftJoin(jobTitleStatuses, eq(applications.currentStatusId, jobTitleStatuses.id))
    .where(where)
    .orderBy(desc(applications.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  const extra = (p: number) =>
    `page=${p}${statusId ? `&status=${encodeURIComponent(statusId)}` : ""}${source ? `&source=${encodeURIComponent(source)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {JOB_TITLE_LIFECYCLE_LABELS[title.lifecycleStatus] ?? title.lifecycleStatus}
              </Badge>
              <Badge variant="secondary">Needs: {title.openings}</Badge>
              <Badge variant="secondary">
                {title.minYearsExperience ? `${title.minYearsExperience} yr min` : "no exp req"}
              </Badge>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[title.location, title.workType, title.workArrangement, title.minEducation]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`/job-title/${id}/candidates/new`} />}
          >
            Add candidate
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/job-title/${id}/edit`} />}
          >
            Edit criteria &amp; statuses
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <UploadForm jobTitleId={id} label="Upload CV for this job title (PDF or DOCX)" />
        </CardContent>
      </Card>

      <div className="grid gap-3">
        <PipelineFilter q={q} statusId={statusId} source={source} statuses={statuses} />

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Candidate source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date added</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No candidates in this pipeline yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(({ application, candidate, statusName, statusColor }) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <Link
                          href={`/candidates/${candidate.id}?fromJobTitle=${id}`}
                          className="font-medium hover:underline"
                        >
                          {candidate.fullName || "Unnamed candidate"}
                        </Link>
                        {candidate.email ? (
                          <span className="block text-xs text-muted-foreground">
                            {candidate.email}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>{ageFromDob(candidate.dateOfBirth) ?? "—"}</TableCell>
                      <TableCell>
                        {candidate.totalYearsExperience != null
                          ? `${candidate.totalYearsExperience} yr`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {candidate.source
                          ? (CANDIDATE_SOURCE_LABELS[candidate.source as CandidateSource] ??
                            candidate.source)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge name={statusName} color={statusColor} />
                      </TableCell>
                      <TableCell>{formatDate(application.createdAt)}</TableCell>
                      <TableCell>
                        <CandidateActions
                          applicationId={application.id}
                          candidateId={candidate.id}
                          jobTitleId={id}
                          resumeDocumentId={candidate.primaryResumeDocumentId}
                          currentStatusId={application.currentStatusId}
                          statuses={statuses}
                          otherJobTitles={otherJobTitles}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <TablePagination
          page={currentPage}
          totalPages={totalPages}
          total={Number(total)}
          previousHref={`/job-title/${id}?${extra(currentPage - 1)}`}
          nextHref={`/job-title/${id}?${extra(currentPage + 1)}`}
        />
      </div>
    </div>
  );
}
