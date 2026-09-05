import Link from "next/link";
import { desc, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { processingJobs, resumeDocuments } from "@/db/schema";
import { UploadForm } from "@/components/app/upload-form";
import { UploadActions } from "@/components/app/upload-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, fileSize } from "@/lib/format";
import { requireAdminPage } from "@/lib/authz";

export const dynamic = "force-dynamic";

const stateStyle: Record<string, string> = {
  queued: "secondary",
  processing: "secondary",
  needs_review: "destructive",
  ready: "secondary",
  completed: "secondary",
  failed: "destructive",
};

export default async function UploadPage() {
  await requireAdminPage();
  const docs = await db
    .select()
    .from(resumeDocuments)
    .where(isNull(resumeDocuments.deletedAt))
    .orderBy(desc(resumeDocuments.uploadedAt))
    .limit(20);

  const jobs = docs.length
    ? await db
        .select()
        .from(processingJobs)
        .where(
          inArray(
            processingJobs.resumeDocumentId,
            docs.map((d) => d.id),
          ),
        )
    : [];
  const jobByDoc = new Map<string, (typeof jobs)[number]>();
  for (const j of jobs) {
    const prev = jobByDoc.get(j.resumeDocumentId);
    if (!prev || j.createdAt > prev.createdAt) jobByDoc.set(j.resumeDocumentId, j);
  }
  // Only documents still in the intake pipeline. Deleting a doc's processing
  // entry removes its job, so it drops off this list (the resume_document and
  // any candidate created from it are kept).
  const visibleDocs = docs.filter((d) => jobByDoc.has(d.id));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload CV</h1>
        <p className="text-sm text-muted-foreground">
          General intake without a job title. After processing you&apos;ll review the draft and
          select (or reject) a job title recommendation.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <UploadForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent uploads</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {visibleDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No uploads yet.</p>
          ) : (
            visibleDocs.map((d) => {
              const job = jobByDoc.get(d.id);
              return (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-sm"
                >
                  <div>
                    <Link href={`/review/${d.id}`} className="font-medium hover:underline">
                      {d.originalName}
                    </Link>
                    <span className="ml-2 text-muted-foreground">
                      {fileSize(d.sizeBytes)} · {formatDate(d.uploadedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={stateStyle[job?.state ?? "queued"] as "secondary" | "destructive"}
                    >
                      {job?.state ?? "queued"}
                    </Badge>
                    {job ? (
                      <UploadActions
                        resumeDocumentId={d.id}
                        processingJobId={job.id}
                        state={job.state}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
