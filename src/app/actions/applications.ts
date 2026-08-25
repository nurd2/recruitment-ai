"use server";

import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  applications,
  applicationStatusHistory,
  candidates,
  jobTitles,
  jobTitleStatuses,
  resumeDocuments,
} from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { runAction } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { findDedupMatches } from "@/lib/dedup";
import { candidateEditSchema } from "@/lib/validation";
import { runAiRecommendations } from "@/lib/ai/recommend";

const statusChangeSchema = z.object({
  applicationId: z.string().uuid(),
  toStatusId: z.string().uuid(),
});

export async function changeApplicationStatusAction(input: z.infer<typeof statusChangeSchema>) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
    const { applicationId, toStatusId } = statusChangeSchema.parse(input);

    const [app] = await db.select().from(applications).where(eq(applications.id, applicationId));
    if (!app || app.withdrawn) throw new Error("APPLICATION_NOT_FOUND");

    const [status] = await db
      .select()
      .from(jobTitleStatuses)
      .where(
        and(
          eq(jobTitleStatuses.id, toStatusId),
          eq(jobTitleStatuses.jobTitleId, app.jobTitleId),
          eq(jobTitleStatuses.active, true),
        ),
      );
    if (!status) throw new Error("INVALID_STATUS");

    await db
      .update(applications)
      .set({ currentStatusId: toStatusId, updatedAt: new Date() })
      .where(eq(applications.id, applicationId));

    if (status.name === "Hired") {
      const [jobTitle] = await db
        .select({ openings: jobTitles.openings })
        .from(jobTitles)
        .where(eq(jobTitles.id, app.jobTitleId));
      const [hired] = await db
        .select({ n: count() })
        .from(applications)
        .innerJoin(jobTitleStatuses, eq(applications.currentStatusId, jobTitleStatuses.id))
        .where(
          and(
            eq(applications.jobTitleId, app.jobTitleId),
            eq(applications.withdrawn, false),
            eq(jobTitleStatuses.name, "Hired"),
          ),
        );
      if (jobTitle && Number(hired.n) >= jobTitle.openings) {
      await db
        .update(jobTitles)
        .set({ lifecycleStatus: "fulfilled", active: false, updatedAt: new Date() })
        .where(eq(jobTitles.id, app.jobTitleId));
      }
    }

    await db.insert(applicationStatusHistory).values({
      applicationId,
      fromStatusId: app.currentStatusId,
      toStatusId,
      changedBy: actor.id,
    });

    await recordAudit({
      actorId: actor.id,
      action: "application.change_status",
      entityType: "application",
      entityId: applicationId,
      after: { fromStatusId: app.currentStatusId, toStatusId },
    });

    return { applicationId, toStatusId };
  });
}

const moveSchema = z.object({
  applicationId: z.string().uuid(),
  toJobTitleId: z.string().uuid(),
});

/**
 * Move an application to a different job title (e.g. Fullstack → Frontend).
 * Statuses are per-job-title, so the application is reset to the target's first
 * active status and the change is recorded in history. A withdrawn application
 * already at the target is removed to free the (candidateId, jobTitleId) unique
 * slot; an active one blocks the move.
 */
export async function moveApplicationAction(input: z.infer<typeof moveSchema>) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
    const { applicationId, toJobTitleId } = moveSchema.parse(input);

    const [app] = await db.select().from(applications).where(eq(applications.id, applicationId));
    if (!app || app.withdrawn) throw new Error("APPLICATION_NOT_FOUND");
    if (app.jobTitleId === toJobTitleId) throw new Error("SAME_JOB_TITLE");

    const [jobTitle] = await db
      .select({ id: jobTitles.id })
      .from(jobTitles)
      .where(and(eq(jobTitles.id, toJobTitleId), eq(jobTitles.active, true)));
    if (!jobTitle) throw new Error("JOB_TITLE_NOT_FOUND");

    const [status] = await db
      .select()
      .from(jobTitleStatuses)
      .where(and(eq(jobTitleStatuses.jobTitleId, toJobTitleId), eq(jobTitleStatuses.active, true)))
      .orderBy(asc(jobTitleStatuses.position))
      .limit(1);
    if (!status) throw new Error("NO_ACTIVE_STATUS");

    // Respect the (candidateId, jobTitleId) unique index.
    const [existing] = await db
      .select({ id: applications.id, withdrawn: applications.withdrawn })
      .from(applications)
      .where(
        and(
          eq(applications.candidateId, app.candidateId),
          eq(applications.jobTitleId, toJobTitleId),
        ),
      );
    if (existing && existing.id !== applicationId) {
      if (!existing.withdrawn) throw new Error("ALREADY_APPLIED");
      // Withdrawn duplicate at target — remove it (history cascades) to free the slot.
      await db.delete(applications).where(eq(applications.id, existing.id));
    }

    await db
      .update(applications)
      .set({
        jobTitleId: toJobTitleId,
        currentStatusId: status.id,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));

    await db.insert(applicationStatusHistory).values({
      applicationId,
      fromStatusId: app.currentStatusId,
      toStatusId: status.id,
      changedBy: actor.id,
    });

    await recordAudit({
      actorId: actor.id,
      action: "application.move",
      entityType: "application",
      entityId: applicationId,
      after: { fromJobTitleId: app.jobTitleId, toJobTitleId },
    });

    return { applicationId, toJobTitleId };
  });
}

export async function withdrawApplicationAction(applicationId: string) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
    await db
      .update(applications)
      .set({ withdrawn: true, withdrawnAt: new Date(), updatedAt: new Date() })
      .where(eq(applications.id, applicationId));
    await recordAudit({
      actorId: actor.id,
      action: "application.withdraw",
      entityType: "application",
      entityId: applicationId,
    });
    return { applicationId };
  });
}

export async function deleteCandidateAction(candidateId: string) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");

    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    if (!candidate || candidate.deletedAt) throw new Error("CANDIDATE_NOT_FOUND");

    // Soft delete: candidate + its applications (withdrawn) + primary document.
    await db
      .update(candidates)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(candidates.id, candidateId));
    await db
      .update(applications)
      .set({ withdrawn: true, withdrawnAt: new Date(), updatedAt: new Date() })
      .where(eq(applications.candidateId, candidateId));
    if (candidate.primaryResumeDocumentId) {
      await db
        .update(resumeDocuments)
        .set({ deletedAt: new Date() })
        .where(eq(resumeDocuments.id, candidate.primaryResumeDocumentId));
    }

    await recordAudit({
      actorId: actor.id,
      action: "candidate.delete",
      entityType: "candidate",
      entityId: candidateId,
    });
    return { candidateId };
  });
}

const assignSchema = z.object({
  candidateId: z.string().uuid(),
  jobTitleId: z.string().uuid(),
});

const manualCandidateSchema = candidateEditSchema.extend({
  jobTitleId: z.string().uuid(),
  dedupCandidateId: z.string().uuid().optional(),
  forceCreate: z.boolean().optional().default(false),
});

export async function createManualCandidateAction(input: z.infer<typeof manualCandidateSchema>) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
    const parsed = manualCandidateSchema.parse(input);
    const matches = await findDedupMatches(parsed);

    if (matches.length > 0 && !parsed.dedupCandidateId && !parsed.forceCreate) {
      return { matches };
    }
    if (
      parsed.dedupCandidateId &&
      !matches.some((match) => match.candidateId === parsed.dedupCandidateId)
    ) {
      throw new Error("INVALID_DEDUP_CANDIDATE");
    }

    const result = await db.transaction(async (tx) => {
      const [jobTitle] = await tx
        .select({ id: jobTitles.id })
        .from(jobTitles)
        .where(and(eq(jobTitles.id, parsed.jobTitleId), eq(jobTitles.active, true)));
      if (!jobTitle) throw new Error("JOB_TITLE_NOT_FOUND");

      const [status] = await tx
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

      let candidateId = parsed.dedupCandidateId;
      if (!candidateId) {
        const [created] = await tx
          .insert(candidates)
          .values({
            fullName: parsed.fullName || null,
            email: parsed.email || null,
            phone: parsed.phone || null,
            dateOfBirth: parsed.dateOfBirth || null,
            location: parsed.location || null,
            profileSummary: parsed.profileSummary || null,
            source: parsed.source,
            education: parsed.education,
            workExperience: parsed.workExperience,
            skills: parsed.skills,
            certifications: parsed.certifications,
            languages: parsed.languages,
            links: parsed.links,
            totalYearsExperience: parsed.totalYearsExperience,
            createdBy: actor.id,
          })
          .returning({ id: candidates.id });
        candidateId = created.id;
      } else {
        const [existing] = await tx
          .select({ id: candidates.id, deletedAt: candidates.deletedAt })
          .from(candidates)
          .where(eq(candidates.id, candidateId));
        if (!existing || existing.deletedAt) throw new Error("CANDIDATE_NOT_FOUND");
      }

      const [app] = await tx
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

      await tx.insert(applicationStatusHistory).values({
        applicationId: app.id,
        toStatusId: status.id,
        changedBy: actor.id,
      });

      return { candidateId, applicationId: app.id };
    });

    await recordAudit({
      actorId: actor.id,
      action: "candidate.manual_create",
      entityType: "candidate",
      entityId: result.candidateId,
      after: { jobTitleId: parsed.jobTitleId, reused: Boolean(parsed.dedupCandidateId) },
    });
    await recordAudit({
      actorId: actor.id,
      action: "application.create",
      entityType: "application",
      entityId: result.applicationId,
      after: { candidateId: result.candidateId, jobTitleId: parsed.jobTitleId },
    });
    return result;
  });
}

/**
 * Assign an already-saved candidate to a job title, creating an application at
 * the job title's first active status. Mirrors the application-creation block
 * of confirmReviewAction; idempotent via the (candidateId, jobTitleId) unique
 * index (a withdrawn app is re-activated rather than duplicated).
 */
export async function assignCandidateToJobTitleAction(input: z.infer<typeof assignSchema>) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
    const { candidateId, jobTitleId } = assignSchema.parse(input);

    const [candidate] = await db
      .select({ id: candidates.id, deletedAt: candidates.deletedAt })
      .from(candidates)
      .where(eq(candidates.id, candidateId));
    if (!candidate || candidate.deletedAt) throw new Error("CANDIDATE_NOT_FOUND");

    const [jobTitle] = await db
      .select({ id: jobTitles.id })
      .from(jobTitles)
      .where(and(eq(jobTitles.id, jobTitleId), eq(jobTitles.active, true)));
    if (!jobTitle) throw new Error("JOB_TITLE_NOT_FOUND");

    const [status] = await db
      .select()
      .from(jobTitleStatuses)
      .where(and(eq(jobTitleStatuses.jobTitleId, jobTitleId), eq(jobTitleStatuses.active, true)))
      .orderBy(asc(jobTitleStatuses.position))
      .limit(1);
    if (!status) throw new Error("NO_ACTIVE_STATUS");

    const [app] = await db
      .insert(applications)
      .values({
        candidateId,
        jobTitleId,
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

    await db.insert(applicationStatusHistory).values({
      applicationId: app.id,
      toStatusId: status.id,
      changedBy: actor.id,
    });

    await recordAudit({
      actorId: actor.id,
      action: "application.create",
      entityType: "application",
      entityId: app.id,
      after: { candidateId, jobTitleId },
    });

    return { applicationId: app.id };
  });
}

/**
 * On-demand AI job-title suggestions for an existing candidate (decision
 * support only). Ephemeral — not persisted to the recommendations table.
 */
export async function suggestMatchesForCandidateAction(candidateId: string) {
  return runAction(async () => {
    await requireRole("admin", "recruiter");
    z.string().uuid().parse(candidateId);

    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    if (!candidate || candidate.deletedAt) throw new Error("CANDIDATE_NOT_FOUND");

    const active = await db.select().from(jobTitles).where(eq(jobTitles.active, true));

    const { recommendations: recs } = await runAiRecommendations({
      fields: {
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        dateOfBirth: candidate.dateOfBirth,
        profileSummary: candidate.profileSummary,
        education: candidate.education,
        workExperience: candidate.workExperience,
        skills: candidate.skills,
        certifications: candidate.certifications,
        languages: candidate.languages,
        links: candidate.links,
        totalYearsExperience: candidate.totalYearsExperience,
      },
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

    const titleById = new Map(active.map((t) => [t.id, t.title]));
    const recommendations = recs.map((r) => ({
      jobTitleId: r.jobTitleId,
      jobTitle: titleById.get(r.jobTitleId) ?? "Unknown",
      score: r.score,
      explanation: r.explanation,
      matchedCompetencies: r.matchedCompetencies,
      experienceFit: r.experienceFit ?? "",
      educationFit: r.educationFit ?? "",
      unmetRequirements: r.unmetRequirements,
    }));

    return { recommendations };
  });
}

export async function editCandidateAction(
  candidateId: string,
  fields: z.infer<typeof candidateEditSchema>,
) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
    const parsed = candidateEditSchema.parse(fields);

    const [before] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    if (!before || before.deletedAt) throw new Error("CANDIDATE_NOT_FOUND");

    await db
      .update(candidates)
      .set({
        fullName: parsed.fullName || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        dateOfBirth: parsed.dateOfBirth || null,
        location: parsed.location || null,
        profileSummary: parsed.profileSummary || null,
        source: parsed.source,
        education: parsed.education,
        workExperience: parsed.workExperience,
        skills: parsed.skills,
        certifications: parsed.certifications,
        languages: parsed.languages,
        links: parsed.links,
        totalYearsExperience: parsed.totalYearsExperience,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, candidateId));

    await recordAudit({
      actorId: actor.id,
      action: "candidate.edit",
      entityType: "candidate",
      entityId: candidateId,
      before: {
        fullName: before.fullName,
        email: before.email,
        phone: before.phone,
      },
      after: {
        fullName: parsed.fullName,
        email: parsed.email,
        phone: parsed.phone,
      },
    });
    return { candidateId };
  });
}
