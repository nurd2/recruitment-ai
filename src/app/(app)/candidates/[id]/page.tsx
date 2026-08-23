import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  applicationStatusHistory,
  applications,
  candidates,
  jobTitleStatuses,
  jobTitles,
  resumeDocuments,
} from "@/db/schema";
import { DeleteCandidateButton } from "@/components/app/delete-candidate-button";
import { CandidateAssign } from "@/components/app/candidate-assign";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ageFromDob, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const fromStatuses = alias(jobTitleStatuses, "from_status");
const toStatuses = alias(jobTitleStatuses, "to_status");

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, id), isNull(candidates.deletedAt)));
  if (!candidate) notFound();

  const [resumeDoc] = candidate.primaryResumeDocumentId
    ? await db
        .select()
        .from(resumeDocuments)
        .where(
          and(
            eq(resumeDocuments.id, candidate.primaryResumeDocumentId),
            isNull(resumeDocuments.deletedAt),
          ),
        )
    : [];

  const appRows = await db
    .select({
      application: applications,
      title: jobTitles.title,
      statusName: jobTitleStatuses.name,
      statusColor: jobTitleStatuses.color,
    })
    .from(applications)
    .innerJoin(jobTitles, eq(applications.jobTitleId, jobTitles.id))
    .leftJoin(jobTitleStatuses, eq(applications.currentStatusId, jobTitleStatuses.id))
    .where(and(eq(applications.candidateId, id), eq(applications.withdrawn, false)))
    .orderBy(desc(applications.createdAt));

  const histories = appRows.length
    ? await db
        .select({
          history: applicationStatusHistory,
          fromName: fromStatuses.name,
          toName: toStatuses.name,
        })
        .from(applicationStatusHistory)
        .leftJoin(
          fromStatuses,
          eq(applicationStatusHistory.fromStatusId, fromStatuses.id),
        )
        .leftJoin(toStatuses, eq(applicationStatusHistory.toStatusId, toStatuses.id))
        .where(
          inArray(
            applicationStatusHistory.applicationId,
            appRows.map((a) => a.application.id),
          ),
        )
        .orderBy(asc(applicationStatusHistory.changedAt))
    : [];
  const historyByApp = new Map<string, typeof histories>();
  for (const h of histories) {
    const arr = historyByApp.get(h.history.applicationId) ?? [];
    arr.push(h);
    historyByApp.set(h.history.applicationId, arr);
  }

  const availableJobTitles =
    appRows.length === 0
      ? await db
          .select({ id: jobTitles.id, title: jobTitles.title })
          .from(jobTitles)
          .where(eq(jobTitles.active, true))
          .orderBy(asc(jobTitles.title))
      : [];

  return (
    <div className="grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {candidate.fullName || "Unnamed candidate"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[candidate.email, candidate.phone, candidate.location]
              .filter(Boolean)
              .join(" · ") || "No contact info"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/candidates/${candidate.id}/edit`} />}
          >
            Edit
          </Button>
          <DeleteCandidateButton candidateId={candidate.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Age</p>
            <p>{ageFromDob(candidate.dateOfBirth) ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total experience</p>
            <p>
              {candidate.totalYearsExperience != null
                ? `${candidate.totalYearsExperience} years`
                : "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Profile summary</p>
            <p>{candidate.profileSummary || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {(candidate.skills ?? []).length === 0 ? (
                <span>—</span>
              ) : (
                (candidate.skills ?? []).map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Resume</p>
            {resumeDoc ? (
              <a
                href={`/api/resumes/${resumeDoc.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {resumeDoc.originalName}
              </a>
            ) : (
              <span>—</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {appRows.length === 0 ? (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                No applications. This candidate is in the unassigned pool. Assign
                a job title, or suggest matches from the profile.
              </p>
              <CandidateAssign
                candidateId={candidate.id}
                availableJobTitles={availableJobTitles}
              />
            </div>
          ) : (
            appRows.map(({ application, title, statusName, statusColor }) => (
              <div key={application.id} className="rounded-2xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/job-title/${application.jobTitleId}`}
                    className="font-medium hover:underline"
                  >
                    {title}
                  </Link>
                  <StatusBadge name={statusName} color={statusColor} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Added {formatDate(application.createdAt)}
                </p>
                {(historyByApp.get(application.id) ?? []).length > 0 ? (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {(historyByApp.get(application.id) ?? []).map((h) => (
                      <li key={h.history.id}>
                        {h.fromName ?? "—"} → {h.toName ?? "—"} ·{" "}
                        {formatDate(h.history.changedAt)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
