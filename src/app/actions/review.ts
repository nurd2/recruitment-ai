"use server";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  applications,
  applicationStatusHistory,
  candidates,
  jobTitles,
  jobTitleStatuses,
  processingJobs,
  processingResults,
  recommendations,
  resumeDocuments,
} from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { runAction } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { candidateFieldsSchema, resumeSourceSchema } from "@/lib/validation";
import { runAiRecommendations } from "@/lib/ai/recommend";

const confirmReviewSchema = z.object({
  resumeDocumentId: z.string().uuid(),
  fields: candidateFieldsSchema,
  jobTitleId: z.string().uuid().nullable().optional(),
  dedupCandidateId: z.string().uuid().nullable().optional(),
  source: resumeSourceSchema.nullable().optional(),
});

const rematchSchema = z.object({
  resumeDocumentId: z.string().uuid(),
  fields: candidateFieldsSchema,
});

/**
 * Re-run job-title recommendations against the recruiter's edited profile
 * BEFORE assignment, so stale scores/gaps reflect the corrected data. Replaces
 * the pending recommendations (same idempotent pattern as the worker) and
 * returns the fresh list for the review UI.
 */
export async function rematchRecommendationsAction(input: z.infer<typeof rematchSchema>) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
    const { resumeDocumentId, fields } = rematchSchema.parse(input);

    const [result] = await db
      .select({ id: processingResults.id })
      .from(processingResults)
      .where(eq(processingResults.resumeDocumentId, resumeDocumentId));
    if (!result) throw new Error("PROCESSING_RESULT_NOT_FOUND");

    const active = await db.select().from(jobTitles).where(eq(jobTitles.active, true));

    const {
      recommendations: recs,
      provider,
      model,
    } = await runAiRecommendations({
      fields,
      jobTitles: active.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description ?? "",
        competencies: t.competencies ?? [],
        minYearsExperience: t.minYearsExperience,
        minEducation: t.minEducation ?? "",
        location: t.location ?? "",
        workArrangement: t.workArrangement ?? "",
      })),
    });

    // Replace stale pending recommendations for this resume (idempotent).
    await db
      .delete(recommendations)
      .where(
        and(
          eq(recommendations.resumeDocumentId, resumeDocumentId),
          eq(recommendations.status, "pending"),
        ),
      );

    const titleById = new Map(active.map((t) => [t.id, t.title]));
    const inserted = [];
    for (const r of recs) {
      const [row] = await db
        .insert(recommendations)
        .values({
          processingResultId: result.id,
          resumeDocumentId,
          jobTitleId: r.jobTitleId,
          score: r.score,
          explanation: r.explanation,
          matchedCompetencies: r.matchedCompetencies,
          experienceFit: r.experienceFit ?? "",
          educationFit: r.educationFit ?? "",
          unmetRequirements: r.unmetRequirements,
          status: "pending",
          provider,
          model,
        })
        .returning();
      inserted.push({
        id: row.id,
        jobTitleId: row.jobTitleId,
        jobTitle: titleById.get(row.jobTitleId) ?? "Unknown",
        score: row.score,
        explanation: row.explanation,
        matchedCompetencies: row.matchedCompetencies,
        experienceFit: row.experienceFit,
        educationFit: row.educationFit,
        unmetRequirements: row.unmetRequirements,
      });
    }

    await recordAudit({
      actorId: actor.id,
      action: "recommendation.rematch",
      entityType: "resume_document",
      entityId: resumeDocumentId,
      after: { count: inserted.length },
    });

    return { recommendations: inserted };
  });
}

/**
 * AC-010: an Application is created ONLY when the recruiter explicitly
 * confirms a job title. Rejecting all recommendations saves the candidate
 * without an application (candidate pool).
 */
export async function confirmReviewAction(input: z.infer<typeof confirmReviewSchema>) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
    const parsed = confirmReviewSchema.parse(input);
    const { resumeDocumentId, fields } = parsed;

    const [result] = await db
      .select()
      .from(processingResults)
      .where(eq(processingResults.resumeDocumentId, resumeDocumentId));
    if (!result) throw new Error("PROCESSING_RESULT_NOT_FOUND");

    await db
      .update(resumeDocuments)
      .set({ source: parsed.source ?? null })
      .where(eq(resumeDocuments.id, resumeDocumentId));

    if (parsed.jobTitleId) {
      const [jobTitle] = await db
        .select({ id: jobTitles.id })
        .from(jobTitles)
        .where(and(eq(jobTitles.id, parsed.jobTitleId), eq(jobTitles.active, true)));
      if (!jobTitle) throw new Error("JOB_TITLE_NOT_FOUND");
    }

    /* ---------- candidate: reuse existing or create new ---------- */
    let candidateId: string | null = parsed.dedupCandidateId ?? null;
    if (candidateId) {
      const [existing] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
      if (!existing || existing.deletedAt) {
        throw new Error("CANDIDATE_NOT_FOUND");
      }
      if (!existing.primaryResumeDocumentId) {
        await db
          .update(candidates)
          .set({ primaryResumeDocumentId: resumeDocumentId, updatedAt: new Date() })
          .where(eq(candidates.id, candidateId));
      }
    } else {
      const [created] = await db
        .insert(candidates)
        .values({
          fullName: fields.fullName ?? null,
          email: fields.email ?? null,
          phone: fields.phone ?? null,
          dateOfBirth: fields.dateOfBirth ?? null,
          location: fields.location ?? null,
          profileSummary: fields.profileSummary ?? null,
          education: fields.education ?? [],
          workExperience: fields.workExperience ?? [],
          skills: fields.skills ?? [],
          certifications: fields.certifications ?? [],
          languages: fields.languages ?? [],
          links: fields.links ?? [],
          totalYearsExperience: fields.totalYearsExperience ?? null,
          primaryResumeDocumentId: resumeDocumentId,
          createdBy: actor.id,
        })
        .returning({ id: candidates.id });
      candidateId = created.id;
    }

    await recordAudit({
      actorId: actor.id,
      action: "candidate.confirm",
      entityType: "candidate",
      entityId: candidateId,
      after: { resumeDocumentId, email: fields.email ?? null },
    });

    /* ---------- application: only on explicit confirmation ---------- */
    let applicationId: string | null = null;
    if (parsed.jobTitleId) {
      const [status] = await db
        .select()
        .from(jobTitleStatuses)
        .where(
          and(
            eq(jobTitleStatuses.jobTitleId, parsed.jobTitleId),
            eq(jobTitleStatuses.active, true),
          ),
        )
        .orderBy(asc(jobTitleStatuses.position))
        .limit(1);
      if (!status) throw new Error("NO_ACTIVE_STATUS");

      const [app] = await db
        .insert(applications)
        .values({
          candidateId,
          jobTitleId: parsed.jobTitleId,
          currentStatusId: status.id,
          createdBy: actor.id,
        })
        .onConflictDoUpdate({
          target: [applications.candidateId, applications.jobTitleId],
          set: {
            withdrawn: false,
            withdrawnAt: null,
            currentStatusId: status.id,
            updatedAt: new Date(),
          },
        })
        .returning({ id: applications.id });
      applicationId = app.id;

      await db.insert(applicationStatusHistory).values({
        applicationId: app.id,
        toStatusId: status.id,
        changedBy: actor.id,
      });

      await db
        .update(recommendations)
        .set({ status: "confirmed", candidateId })
        .where(
          and(
            eq(recommendations.resumeDocumentId, resumeDocumentId),
            eq(recommendations.jobTitleId, parsed.jobTitleId),
          ),
        );

      await recordAudit({
        actorId: actor.id,
        action: "application.create",
        entityType: "application",
        entityId: app.id,
        after: { candidateId, jobTitleId: parsed.jobTitleId },
      });
    } else {
      // Rejected all recommendations → candidate saved without application.
      await db
        .update(recommendations)
        .set({ status: "rejected" })
        .where(
          and(
            eq(recommendations.resumeDocumentId, resumeDocumentId),
            eq(recommendations.status, "pending"),
          ),
        );
    }

    // Review is done: move the intake job to a terminal state so Recent uploads
    // / Processing stop showing "needs_review" for a resume already turned into
    // a candidate.
    await db
      .update(processingJobs)
      .set({
        state: "completed",
        stage: "done",
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(processingJobs.resumeDocumentId, resumeDocumentId));

    return { candidateId, applicationId };
  });
}
