import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  jobTitles,
  processingJobs,
  processingResults,
  recommendations,
  resumeDocuments,
} from "@/db/schema";
import { retryProcessingAction } from "@/app/actions/documents";
import { ReviewForm } from "@/components/app/review-form";
import { findDedupMatches } from "@/lib/dedup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ resumeDocumentId: string }>;
}) {
  await requireAdminPage();
  const { resumeDocumentId } = await params;
  const [doc] = await db
    .select()
    .from(resumeDocuments)
    .where(eq(resumeDocuments.id, resumeDocumentId));
  if (!doc) notFound();

  const jobs = await db
    .select()
    .from(processingJobs)
    .where(eq(processingJobs.resumeDocumentId, resumeDocumentId))
    .orderBy(desc(processingJobs.createdAt))
    .limit(1);
  const job = jobs[0];

  if (!job || job.state === "queued" || job.state === "processing") {
    return (
      <Card>
        <CardContent className="grid gap-2 py-12 text-center">
          <p className="font-medium">Processing resume…</p>
          <p className="text-sm text-muted-foreground">
            Text extraction and AI validation are running in the background. Reload this page
            shortly to see the review draft.
          </p>
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/review/${resumeDocumentId}`} />}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (job.state === "failed") {
    return (
      <Card>
        <CardContent className="grid max-w-xl gap-3 py-8">
          <h1 className="text-xl font-semibold">Processing failed</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Failed</Badge>
            <span className="text-sm text-muted-foreground">
              Correlation: {job.correlationId ?? "—"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{job.lastError}</p>
          <form
            action={async () => {
              "use server";
              await retryProcessingAction(job.id);
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Retry processing
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const [result] = await db
    .select()
    .from(processingResults)
    .where(eq(processingResults.resumeDocumentId, resumeDocumentId));
  if (!result) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No processing result found for this resume.
        </CardContent>
      </Card>
    );
  }

  const recRows = await db
    .select()
    .from(recommendations)
    .where(
      and(
        eq(recommendations.resumeDocumentId, resumeDocumentId),
        eq(recommendations.status, "pending"),
      ),
    );
  const titleIds = [...new Set(recRows.map((r) => r.jobTitleId))];
  const titles = titleIds.length
    ? await db
        .select()
        .from(jobTitles)
        .where(and(inArray(jobTitles.id, titleIds), isNull(jobTitles.deletedAt)))
    : [];
  const titleById = new Map(titles.map((t) => [t.id, t.title]));
  const recs = recRows.map((r) => ({
    ...r,
    jobTitle: titleById.get(r.jobTitleId) ?? "Unknown",
  }));

  const dedup = await findDedupMatches({
    email: result.fields.email ?? null,
    phone: result.fields.phone ?? null,
    fullName: result.fields.fullName ?? null,
  });

  const contextTitle = job.jobTitleId
     ? (await db.select().from(jobTitles).where(and(eq(jobTitles.id, job.jobTitleId), isNull(jobTitles.deletedAt))))[0]
    : null;
  const availableJobTitles = await db
    .select({ id: jobTitles.id, title: jobTitles.title })
    .from(jobTitles)
    .where(and(eq(jobTitles.active, true), isNull(jobTitles.deletedAt)))
    .orderBy(asc(jobTitles.title));

  return (
    <ReviewForm
      resumeDocumentId={resumeDocumentId}
      resumeOriginalName={doc.originalName}
      resumeMimeType={doc.mimeType}
      candidateSource={null}
      jobState={job.state}
      ocrUsed={result.ocrUsed}
      fields={result.fields}
      fieldMeta={result.fieldMeta}
      conflicts={result.conflicts}
      fieldsRequiringReview={result.fieldsRequiringReview}
      recommendations={recs}
      dedupMatches={dedup}
      availableJobTitles={availableJobTitles}
      contextJobTitle={contextTitle ? { id: contextTitle.id, title: contextTitle.title } : null}
    />
  );
}
