import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { candidates } from "@/db/schema";

export type DedupMatch = {
  candidateId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  matchedBy: "email" | "phone" | "name";
  confidence: number;
};

/**
 * Candidate deduplication: prioritize email, then phone, then name + evidence.
 * The recruiter decides whether to reuse an existing candidate or create a new
 * one — the system never auto-merges.
 */
export async function findDedupMatches(input: {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
}): Promise<DedupMatch[]> {
  const matches: DedupMatch[] = [];
  const add = (m: DedupMatch) => {
    if (!matches.some((x) => x.candidateId === m.candidateId)) matches.push(m);
  };

  if (input.email) {
    const rows = await db
      .select()
      .from(candidates)
      .where(and(eq(candidates.email, input.email), isNull(candidates.deletedAt)));
    for (const r of rows) {
      add({
        candidateId: r.id,
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        matchedBy: "email",
        confidence: 0.98,
      });
    }
  }

  if (input.phone) {
    const rows = await db
      .select()
      .from(candidates)
      .where(and(eq(candidates.phone, input.phone), isNull(candidates.deletedAt)));
    for (const r of rows) {
      add({
        candidateId: r.id,
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        matchedBy: "phone",
        confidence: 0.9,
      });
    }
  }

  if (input.fullName && matches.length === 0) {
    const rows = await db
      .select()
      .from(candidates)
      .where(
        and(eq(candidates.fullName, input.fullName), isNull(candidates.deletedAt)),
      );
    for (const r of rows) {
      add({
        candidateId: r.id,
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        matchedBy: "name",
        confidence: 0.5,
      });
    }
  }

  return matches;
}
