"use server";

import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  applications,
  applicationStatusHistory,
  candidates,
  jobTitleLifecycleHistory,
  jobTitles,
  jobTitleStatuses,
  resumeDocuments,
} from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { runAction } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { findDedupMatches } from "@/lib/dedup";
import { candidateEditSchema } from "@/lib/validation";
import { runAiRecommendations } from "@/lib/ai/recommend";
import { jakartaDate } from "@/lib/sla";
import { hiredDateSchema, withdrawalDateSchema, withdrawalTypeSchema } from "@/lib/validation";

const statusChangeSchema = z.object({
  applicationId: z.string().uuid(),
  toStatusId: z.string().uuid(),
  hiredDate: hiredDateSchema.optional(),
});

export async function changeApplicationStatusAction(input: z.infer<typeof statusChangeSchema>) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const { applicationId, toStatusId, hiredDate } = statusChangeSchema.parse(input);

    const [app] = await db.select().from(applications).where(eq(applications.id, applicationId));
    if (!app || app.withdrawn) throw new Error("APPLICATION_NOT_FOUND");
    if (!app.jobTitleId) throw new Error("APPLICATION_UNASSIGNED");

    const [jobTitle] = await db
      .select({ id: jobTitles.id })
      .from(jobTitles)
      .where(and(eq(jobTitles.id, app.jobTitleId), isNull(jobTitles.deletedAt)));
    if (!jobTitle) throw new Error("JOB_TITLE_NOT_FOUND");

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

    if (status.name === "Hired") {
      const effectiveHiredDate = hiredDate ?? app.hiredDate ?? jakartaDate();
      if (app.hireCanceledAt) throw new Error("HIRE_CANCELED");
      const start = (
        await db
          .select({ recruitmentStartDate: jobTitles.recruitmentStartDate })
          .from(jobTitles)
          .where(eq(jobTitles.id, app.jobTitleId))
      )[0]?.recruitmentStartDate;
      if (start && effectiveHiredDate < start) throw new Error("HIRED_DATE_BEFORE_START");
      if (effectiveHiredDate > jakartaDate()) throw new Error("HIRED_DATE_IN_FUTURE");
    }

    await db
      .update(applications)
      .set({
        currentStatusId: toStatusId,
        hiredDate:
          status.name === "Hired" ? (hiredDate ?? app.hiredDate ?? jakartaDate()) : app.hiredDate,
        updatedAt: new Date(),
      })
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
            isNull(applications.hireCanceledAt),
            eq(jobTitleStatuses.name, "Hired"),
          ),
        );
      if (jobTitle && Number(hired.n) >= jobTitle.openings) {
        await db
          .update(jobTitles)
          .set({ lifecycleStatus: "fulfilled", active: false, updatedAt: new Date() })
          .where(eq(jobTitles.id, app.jobTitleId));
        await db.insert(jobTitleLifecycleHistory).values({
          jobTitleId: app.jobTitleId,
          status: "fulfilled",
          effectiveFrom: jakartaDate(),
          changedBy: actor.id,
        });
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

export async function updateHiredDateAction(input: { applicationId: string; hiredDate: string }) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const applicationId = z.string().uuid().parse(input.applicationId);
    const hiredDate = hiredDateSchema.parse(input.hiredDate);
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId));
    if (!application?.hiredDate) throw new Error("HIRE_NOT_FOUND");
    if (application.withdrawn || application.hireCanceledAt) throw new Error("HIRE_NOT_ACTIVE");
    if (!application.jobTitleId) throw new Error("APPLICATION_UNASSIGNED");
    const [activeTitle] = await db
      .select({ id: jobTitles.id })
      .from(jobTitles)
      .where(and(eq(jobTitles.id, application.jobTitleId), isNull(jobTitles.deletedAt)));
    if (!activeTitle) throw new Error("JOB_TITLE_NOT_FOUND");
    const [currentStatus] = application.currentStatusId
      ? await db
          .select({ name: jobTitleStatuses.name })
          .from(jobTitleStatuses)
          .where(eq(jobTitleStatuses.id, application.currentStatusId))
      : [];
    if (currentStatus?.name !== "Hired") throw new Error("HIRE_NOT_ACTIVE");
    const [jobTitle] = await db
      .select({ recruitmentStartDate: jobTitles.recruitmentStartDate })
      .from(jobTitles)
      .where(eq(jobTitles.id, application.jobTitleId));
    if (jobTitle?.recruitmentStartDate && hiredDate < jobTitle.recruitmentStartDate) {
      throw new Error("HIRED_DATE_BEFORE_START");
    }
    if (hiredDate > jakartaDate()) throw new Error("HIRED_DATE_IN_FUTURE");
    await db
      .update(applications)
      .set({ hiredDate, updatedAt: new Date() })
      .where(eq(applications.id, applicationId));
    await recordAudit({
      actorId: actor.id,
      action: "application.update_hired_date",
      entityType: "application",
      entityId: applicationId,
      before: { hiredDate: application.hiredDate },
      after: { hiredDate },
    });
    return { applicationId, hiredDate };
  });
}

const moveSchema = z.object({
  applicationId: z.string().uuid(),
  toJobTitleId: z.string().uuid(),
});

/**
 * Move an application to a different job title (e.g. Fullstack → Frontend).
 * Statuses are per-job-title, so the application is reset to the target's first
 * active status and the change is recorded in history. A prior withdrawn cycle
 * remains intact; moving creates the next cycle at the target when needed.
 */
export async function moveApplicationAction(input: z.infer<typeof moveSchema>) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const { applicationId, toJobTitleId } = moveSchema.parse(input);

    const [app] = await db.select().from(applications).where(eq(applications.id, applicationId));
    if (!app || app.withdrawn) throw new Error("APPLICATION_NOT_FOUND");
    if (!app.jobTitleId) throw new Error("APPLICATION_UNASSIGNED");
    if (app.jobTitleId === toJobTitleId) throw new Error("SAME_JOB_TITLE");
    if (app.hiredDate) throw new Error("HIRED_APPLICATION_CANNOT_MOVE");

    const [jobTitle] = await db
      .select({ id: jobTitles.id })
      .from(jobTitles)
      .where(
        and(
          eq(jobTitles.id, toJobTitleId),
          eq(jobTitles.active, true),
          isNull(jobTitles.deletedAt),
        ),
      );
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
      .select({
        id: applications.id,
        recruitmentCycle: applications.recruitmentCycle,
        withdrawn: applications.withdrawn,
      })
      .from(applications)
      .where(
        and(
          eq(applications.candidateId, app.candidateId),
          eq(applications.jobTitleId, toJobTitleId),
        ),
      );
    if (existing && existing.id !== applicationId) {
      if (!existing.withdrawn) throw new Error("ALREADY_APPLIED");
    }

    await db
      .update(applications)
      .set({
        jobTitleId: toJobTitleId,
        recruitmentCycle: existing ? existing.recruitmentCycle + 1 : 1,
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

const withdrawalSchema = z.object({
  applicationId: z.string().uuid(),
  withdrawalDate: withdrawalDateSchema,
  withdrawalType: withdrawalTypeSchema,
});

export async function withdrawApplicationAction(input: z.infer<typeof withdrawalSchema>) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const { applicationId, withdrawalDate, withdrawalType } = withdrawalSchema.parse(input);
    const [application] = await db
      .select({ hiredDate: applications.hiredDate, jobTitleId: applications.jobTitleId })
      .from(applications)
      .where(eq(applications.id, applicationId));
    if (!application) throw new Error("APPLICATION_NOT_FOUND");
    if (!application.jobTitleId) throw new Error("APPLICATION_UNASSIGNED");
    const [jobTitle] = await db
      .select({ id: jobTitles.id })
      .from(jobTitles)
      .where(and(eq(jobTitles.id, application.jobTitleId), isNull(jobTitles.deletedAt)));
    if (!jobTitle) throw new Error("JOB_TITLE_NOT_FOUND");
    if (withdrawalType === "pre_joining" && !application.hiredDate) {
      throw new Error("PRE_JOINING_WITHDRAWAL_REQUIRES_HIRE");
    }
    await db
      .update(applications)
      .set({
        withdrawn: true,
        withdrawnAt: new Date(),
        withdrawalDate,
        withdrawalType,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));
    await reopenJobTitleIfNeeded(application.jobTitleId, actor.id);
    await recordAudit({
      actorId: actor.id,
      action:
        withdrawalType === "pre_joining"
          ? "application.pre_joining_withdrawal"
          : "application.withdraw",
      entityType: "application",
      entityId: applicationId,
      after: { withdrawalDate, withdrawalType },
    });
    return { applicationId };
  });
}

const cancelHireSchema = z.object({
  applicationId: z.string().uuid(),
  reason: z.string().trim().min(1).max(1000),
});

export async function cancelHireAction(input: z.infer<typeof cancelHireSchema>) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const { applicationId, reason } = cancelHireSchema.parse(input);
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId));
    if (!application?.hiredDate) throw new Error("HIRE_NOT_FOUND");
    if (!application.jobTitleId) throw new Error("APPLICATION_UNASSIGNED");
    const [activeTitle] = await db
      .select({ id: jobTitles.id })
      .from(jobTitles)
      .where(and(eq(jobTitles.id, application.jobTitleId), isNull(jobTitles.deletedAt)));
    if (!activeTitle) throw new Error("JOB_TITLE_NOT_FOUND");
    await db
      .update(applications)
      .set({
        hireCanceledAt: new Date(),
        hireCancellationReason: reason,
        withdrawn: true,
        withdrawnAt: new Date(),
        withdrawalDate: jakartaDate(),
        withdrawalType: "standard",
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));
    await reopenJobTitleIfNeeded(application.jobTitleId, actor.id);
    await recordAudit({
      actorId: actor.id,
      action: "application.cancel_hire",
      entityType: "application",
      entityId: applicationId,
      after: { reason },
    });
    return { applicationId };
  });
}

async function reopenJobTitleIfNeeded(jobTitleId: string, actorId: string) {
  const [jobTitle] = await db
    .select({ openings: jobTitles.openings, lifecycleStatus: jobTitles.lifecycleStatus })
    .from(jobTitles)
    .where(eq(jobTitles.id, jobTitleId));
  if (!jobTitle || jobTitle.lifecycleStatus !== "fulfilled") return;
  const [hired] = await db
    .select({ n: count() })
    .from(applications)
    .innerJoin(jobTitleStatuses, eq(applications.currentStatusId, jobTitleStatuses.id))
    .where(
      and(
        eq(applications.jobTitleId, jobTitleId),
        eq(applications.withdrawn, false),
        isNull(applications.hireCanceledAt),
        eq(jobTitleStatuses.name, "Hired"),
      ),
    );
  if (Number(hired.n) >= jobTitle.openings) return;
  await db
    .update(jobTitles)
    .set({ lifecycleStatus: "active", active: true, updatedAt: new Date() })
    .where(eq(jobTitles.id, jobTitleId));
  await db.insert(jobTitleLifecycleHistory).values({
    jobTitleId,
    status: "active",
    effectiveFrom: jakartaDate(),
    changedBy: actorId,
  });
}

export async function deleteCandidateAction(candidateId: string) {
  return runAction(async () => {
    const actor = await requireAdmin();

    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    if (!candidate || candidate.deletedAt) throw new Error("CANDIDATE_NOT_FOUND");

    // Soft delete: candidate + its applications (withdrawn) + primary document.
    await db
      .update(candidates)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(candidates.id, candidateId));
    await db
      .update(applications)
      .set({
        withdrawn: true,
        withdrawnAt: new Date(),
        withdrawalType: "standard",
        updatedAt: new Date(),
      })
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
    const actor = await requireAdmin();
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
        .where(
          and(
            eq(jobTitles.id, parsed.jobTitleId),
            eq(jobTitles.active, true),
            isNull(jobTitles.deletedAt),
          ),
        );
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

      const [existing] = await tx
        .select({
          id: applications.id,
          recruitmentCycle: applications.recruitmentCycle,
          withdrawn: applications.withdrawn,
        })
        .from(applications)
        .where(
          and(
            eq(applications.candidateId, candidateId),
            eq(applications.jobTitleId, parsed.jobTitleId),
          ),
        )
        .orderBy(desc(applications.recruitmentCycle))
        .limit(1);
      const [app] = existing?.withdrawn
        ? await tx
            .insert(applications)
            .values({
              candidateId,
              jobTitleId: parsed.jobTitleId,
              recruitmentCycle: existing.recruitmentCycle + 1,
              currentStatusId: status.id,
              createdBy: actor.id,
            })
            .returning({ id: applications.id })
        : existing
          ? await tx
              .update(applications)
              .set({ currentStatusId: status.id, updatedAt: new Date() })
              .where(eq(applications.id, existing.id))
              .returning({ id: applications.id })
          : await tx
              .insert(applications)
              .values({
                candidateId,
                jobTitleId: parsed.jobTitleId,
                currentStatusId: status.id,
                createdBy: actor.id,
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
    const actor = await requireAdmin();
    const { candidateId, jobTitleId } = assignSchema.parse(input);

    const [candidate] = await db
      .select({ id: candidates.id, deletedAt: candidates.deletedAt })
      .from(candidates)
      .where(eq(candidates.id, candidateId));
    if (!candidate || candidate.deletedAt) throw new Error("CANDIDATE_NOT_FOUND");

    const [jobTitle] = await db
      .select({ id: jobTitles.id })
      .from(jobTitles)
      .where(
        and(eq(jobTitles.id, jobTitleId), eq(jobTitles.active, true), isNull(jobTitles.deletedAt)),
      );
    if (!jobTitle) throw new Error("JOB_TITLE_NOT_FOUND");

    const [status] = await db
      .select()
      .from(jobTitleStatuses)
      .where(and(eq(jobTitleStatuses.jobTitleId, jobTitleId), eq(jobTitleStatuses.active, true)))
      .orderBy(asc(jobTitleStatuses.position))
      .limit(1);
    if (!status) throw new Error("NO_ACTIVE_STATUS");

    const [existing] = await db
      .select({
        id: applications.id,
        recruitmentCycle: applications.recruitmentCycle,
        withdrawn: applications.withdrawn,
      })
      .from(applications)
      .where(
        and(eq(applications.candidateId, candidateId), eq(applications.jobTitleId, jobTitleId)),
      )
      .orderBy(desc(applications.recruitmentCycle))
      .limit(1);
    const [app] = existing?.withdrawn
      ? await db
          .insert(applications)
          .values({
            candidateId,
            jobTitleId,
            recruitmentCycle: existing.recruitmentCycle + 1,
            currentStatusId: status.id,
            createdBy: actor.id,
          })
          .returning({ id: applications.id })
      : existing
        ? await db
            .update(applications)
            .set({ currentStatusId: status.id, updatedAt: new Date() })
            .where(eq(applications.id, existing.id))
            .returning({ id: applications.id })
        : await db
            .insert(applications)
            .values({
              candidateId,
              jobTitleId,
              currentStatusId: status.id,
              createdBy: actor.id,
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
    await requireAdmin();
    z.string().uuid().parse(candidateId);

    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    if (!candidate || candidate.deletedAt) throw new Error("CANDIDATE_NOT_FOUND");

    const active = await db
      .select()
      .from(jobTitles)
      .where(and(eq(jobTitles.active, true), isNull(jobTitles.deletedAt)));

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
    const actor = await requireAdmin();
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
