import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { jobTitles } from "@/db/schema";
import { ManualCandidateForm } from "@/components/app/manual-candidate-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [jobTitle] = await db
    .select({ id: jobTitles.id, title: jobTitles.title, active: jobTitles.active })
    .from(jobTitles)
    .where(eq(jobTitles.id, id));
  if (!jobTitle || !jobTitle.active) notFound();

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{jobTitle.title}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Add candidate</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the candidate profile manually. No resume upload is required.
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href={`/job-title/${id}`} />}>
          Back
        </Button>
      </div>
      <ManualCandidateForm jobTitleId={jobTitle.id} />
    </div>
  );
}
