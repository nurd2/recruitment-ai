import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, desc, eq, ilike, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
  applications,
  candidates,
  jobTitleStatuses,
  jobTitles,
  resumeDocuments,
} from "@/db/schema";
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
import { ageFromDob, formatDate } from "@/lib/format";
import { RESUME_SOURCE_LABELS, type ResumeSource } from "@/lib/resume-sources";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function JobTitleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const statusId = sp.status ?? "";
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

  const rows = await db
    .select({
      application: applications,
      candidate: candidates,
      resumeSource: resumeDocuments.source,
      statusName: jobTitleStatuses.name,
      statusColor: jobTitleStatuses.color,
    })
    .from(applications)
    .innerJoin(candidates, eq(applications.candidateId, candidates.id))
    .leftJoin(resumeDocuments, eq(candidates.primaryResumeDocumentId, resumeDocuments.id))
    .leftJoin(jobTitleStatuses, eq(applications.currentStatusId, jobTitleStatuses.id))
    .where(where)
    .orderBy(desc(applications.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const extra = (p: number) =>
    `page=${p}${statusId ? `&status=${encodeURIComponent(statusId)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title.title}</h1>
            <Badge variant="secondary">
              {title.minYearsExperience ? `${title.minYearsExperience} yr min` : "no exp req"}
            </Badge>
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {title.description || "No description"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[title.location, title.workType, title.workArrangement, title.minEducation]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex gap-2">
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
        <PipelineFilter q={q} statusId={statusId} statuses={statuses} />

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Resume source</TableHead>
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
                  rows.map(({ application, candidate, resumeSource, statusName, statusColor }) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <Link
                          href={`/candidates/${candidate.id}`}
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
                        {resumeSource
                          ? (RESUME_SOURCE_LABELS[resumeSource as ResumeSource] ?? resumeSource)
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

        {totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {total} candidate(s) · page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/job-title/${id}?${extra(page - 1)}`} />}
                >
                  Previous
                </Button>
              ) : null}
              {page < totalPages ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/job-title/${id}?${extra(page + 1)}`} />}
                >
                  Next
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
