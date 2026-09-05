import Link from "next/link";
import { desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { processingJobs, resumeDocuments } from "@/db/schema";
import { retryProcessingAction } from "@/app/actions/documents";
import { DeleteDocumentButton } from "@/components/app/delete-document-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { getSessionUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function ProcessingPage() {
  const user = await getSessionUser();
  const jobs = await db
    .select()
    .from(processingJobs)
    .orderBy(desc(processingJobs.createdAt))
    .limit(50);

  const docs = jobs.length
    ? await db
        .select()
        .from(resumeDocuments)
        .where(inArray(resumeDocuments.id, [...new Set(jobs.map((j) => j.resumeDocumentId))]))
    : [];
  const docById = new Map(docs.map((d) => [d.id, d]));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Processing jobs</h1>
        <p className="text-sm text-muted-foreground">
          Asynchronous extraction, validation, and recommendation jobs.
        </p>
      </div>
      <Card>
        <CardContent className="grid gap-2 p-4">
          {jobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No processing jobs yet.
            </p>
          ) : (
            jobs.map((j) => {
              const doc = docById.get(j.resumeDocumentId);
              return (
                <div
                  key={j.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-sm"
                >
                  <div>
                    <Link
                      href={`/review/${j.resumeDocumentId}`}
                      className="font-medium hover:underline"
                    >
                      {doc?.originalName ?? "Resume"}
                    </Link>
                    <span className="ml-2 text-muted-foreground">
                      {j.state} · {j.stage} · attempts {j.attempts} · {formatDate(j.createdAt)}
                    </span>
                    {j.correlationId ? (
                      <span className="ml-2 text-xs text-muted-foreground">{j.correlationId}</span>
                    ) : null}
                    {j.lastError ? (
                      <p className="mt-1 text-xs text-destructive">{j.lastError}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        j.state === "failed" || j.state === "needs_review"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {j.state}
                    </Badge>
                    {user?.role === "admin" && j.state === "failed" ? (
                      <form
                        action={async () => {
                          "use server";
                          await retryProcessingAction(j.id);
                        }}
                      >
                        <Button type="submit" variant="outline" size="sm">
                          Retry
                        </Button>
                      </form>
                    ) : null}
                    {user?.role === "admin" ? (
                      <DeleteDocumentButton resumeDocumentId={j.resumeDocumentId} />
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
