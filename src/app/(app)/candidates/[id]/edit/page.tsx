import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { candidates } from "@/db/schema";
import { CandidateEditForm } from "@/components/app/candidate-edit-form";
import { requireAdminPage } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function EditCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, id), isNull(candidates.deletedAt)));
  if (!candidate) notFound();

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit candidate</h1>
      </div>
      <CandidateEditForm
        candidateId={candidate.id}
        initial={{
          fullName: candidate.fullName ?? "",
          email: candidate.email ?? "",
          phone: candidate.phone ?? "",
          dateOfBirth: candidate.dateOfBirth ?? "",
          location: candidate.location ?? "",
          profileSummary: candidate.profileSummary ?? "",
          source: candidate.source,
          education: candidate.education ?? [],
          workExperience: candidate.workExperience ?? [],
          skills: candidate.skills ?? [],
          certifications: candidate.certifications ?? [],
          languages: candidate.languages ?? [],
          links: candidate.links ?? [],
          totalYearsExperience: candidate.totalYearsExperience ?? 0,
        }}
      />
    </div>
  );
}
