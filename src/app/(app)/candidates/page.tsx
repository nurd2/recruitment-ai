import Link from "next/link";
import type { Metadata } from "next";
import { and, count, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { applications, candidates } from "@/db/schema";
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
import { CandidatePoolFilter } from "@/components/app/candidate-pool-filter";
import { TablePagination } from "@/components/app/table-pagination";
import { ageFromDob, formatDate } from "@/lib/format";
import {
  CANDIDATE_SOURCE_LABELS,
  RESUME_SOURCES,
  type CandidateSource,
} from "@/lib/resume-sources";
import { getSessionUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Candidate Pool",
};

const PAGE_SIZE = 10;

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const source = RESUME_SOURCES.includes(sp.source as CandidateSource)
    ? (sp.source as CandidateSource)
    : "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const filters = [isNull(candidates.deletedAt)];
  if (source) filters.push(eq(candidates.source, source));
  if (q) {
    const qFilter = or(ilike(candidates.fullName, `%${q}%`), ilike(candidates.email, `%${q}%`));
    if (qFilter) filters.push(qFilter);
  }
  const where = and(...filters);

  const [totalRow] = await db.select({ n: count() }).from(candidates).where(where);
  const total = totalRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const cands = await db
    .select({ candidate: candidates })
    .from(candidates)
    .where(where)
    .orderBy(desc(candidates.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

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

  const extra = (nextPage: number) =>
    `page=${nextPage}${source ? `&source=${encodeURIComponent(source)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

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
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <CandidatePoolFilter q={q} source={source} />
        {user?.role === "admin" ? (
          <Button variant="outline" nativeButton={false} render={<Link href="/upload" />}>
            Upload CV
          </Button>
        ) : null}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Candidate source</TableHead>
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
                cands.map(({ candidate: c }) => (
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
                      {c.source
                        ? (CANDIDATE_SOURCE_LABELS[c.source as CandidateSource] ?? c.source)
                        : "—"}
                    </TableCell>
                    <TableCell>{countByCandidate.get(c.id) ?? 0}</TableCell>
                    <TableCell>{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {user?.role === "admin" ? <DeleteCandidateButton candidateId={c.id} /> : null}
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
        previousHref={`/candidates?${extra(currentPage - 1)}`}
        nextHref={`/candidates?${extra(currentPage + 1)}`}
      />
    </div>
  );
}
