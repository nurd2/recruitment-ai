import Link from "next/link";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { applications, candidates, resumeDocuments } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteCandidateButton } from "@/components/app/delete-candidate-button";
import { ageFromDob, formatDate } from "@/lib/format";
import { RESUME_SOURCE_LABELS, type ResumeSource } from "@/lib/resume-sources";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const cands = await db
    .select({ candidate: candidates, resumeSource: resumeDocuments.source })
    .from(candidates)
    .leftJoin(resumeDocuments, eq(candidates.primaryResumeDocumentId, resumeDocuments.id))
    .where(isNull(candidates.deletedAt))
    .orderBy(desc(candidates.createdAt))
    .limit(100);

  const appRows = cands.length
    ? await db
        .select({ candidateId: applications.candidateId })
        .from(applications)
        .where(
          and(
            inArray(
              applications.candidateId,
              cands.map((c) => c.candidate.id),
            ),
            eq(applications.withdrawn, false),
          ),
        )
    : [];
  const countByCandidate = new Map<string, number>();
  for (const a of appRows) {
    countByCandidate.set(a.candidateId, (countByCandidate.get(a.candidateId) ?? 0) + 1);
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Candidate pool</h1>
          <p className="text-sm text-muted-foreground">
            All candidates, including those saved without an application.
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Resume source</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Date added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No candidates yet.
                  </TableCell>
                </TableRow>
              ) : (
                cands.map(({ candidate: c, resumeSource }) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/candidates/${c.id}`} className="font-medium hover:underline">
                        {c.fullName || "Unnamed candidate"}
                      </Link>
                      <p className="text-sm text-muted-foreground">{c.email ?? "—"}</p>
                    </TableCell>
                    <TableCell>{ageFromDob(c.dateOfBirth) ?? "—"}</TableCell>
                    <TableCell>
                      {c.totalYearsExperience != null ? `${c.totalYearsExperience} yr` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {resumeSource
                        ? (RESUME_SOURCE_LABELS[resumeSource as ResumeSource] ?? resumeSource)
                        : "—"}
                    </TableCell>
                    <TableCell>{countByCandidate.get(c.id) ?? 0}</TableCell>
                    <TableCell>{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DeleteCandidateButton candidateId={c.id} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div>
        <Button variant="outline" nativeButton={false} render={<Link href="/upload" />}>
          Upload CV
        </Button>
      </div>
    </div>
  );
}
