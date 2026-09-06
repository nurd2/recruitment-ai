"use server";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  applicationStatusHistory,
  applications,
  auditLogs,
  jobTitleHeadcountHistory,
  jobTitleLifecycleHistory,
  jobTitleSlaHistory,
  jobTitleStatuses,
  jobTitles,
  processingJobs,
  processingResults,
  recommendations,
  slaPolicies,
} from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { runAction } from "@/lib/action-result";
import { runAiJobTitleAutofill } from "@/lib/ai/autofill";
import { recordAudit } from "@/lib/audit";
import { DEFAULT_STATUSES } from "@/lib/defaults";
import { colorForDefaultStatus, type StatusColor } from "@/lib/status-colors";
import { jobTitleInputSchema, statusColorSchema, statusInputSchema } from "@/lib/validation";
import { jakartaDate } from "@/lib/sla";
import type { z } from "zod";

type JobTitleInput = z.infer<typeof jobTitleInputSchema>;

export async function autofillJobTitleAction(input: { title: string; prompt: string }) {
  return runAction(async () => {
    await requireAdmin();
    const title = input.title.trim();
    const prompt = input.prompt.trim();
    if (!title) throw new Error("A job title is required before using Auto-fill.");
    if (prompt.length > 5000) throw new Error("Custom prompt is too long.");
    return runAiJobTitleAutofill({ title, prompt });
  });
}

export async function createJobTitleAction(input: JobTitleInput) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const parsed = jobTitleInputSchema.parse(input);
    const [title] = await db
      .insert(jobTitles)
      .values({
        title: parsed.title,
        openings: parsed.openings,
        grade: parsed.grade,
        recruitmentStartDate: parsed.recruitmentStartDate,
        slaWorkingDays: await getSlaDays(parsed.grade, parsed.slaWorkingDays),
        description: parsed.description || null,
        competencies: parsed.competencies,
        minYearsExperience: parsed.minYearsExperience,
        minEducation: parsed.minEducation || null,
        location: parsed.location || null,
        workType: parsed.workType || null,
        workArrangement: parsed.workArrangement || null,
        language: parsed.language || null,
        lifecycleStatus: parsed.lifecycleStatus,
        active: parsed.lifecycleStatus === "active",
        createdBy: actor.id,
      })
      .returning({ id: jobTitles.id });

    for (let i = 0; i < DEFAULT_STATUSES.length; i++) {
      await db.insert(jobTitleStatuses).values({
        jobTitleId: title.id,
        name: DEFAULT_STATUSES[i],
        position: i,
        isDefault: true,
        color: colorForDefaultStatus(DEFAULT_STATUSES[i]),
      });
    }
    await db.insert(jobTitleHeadcountHistory).values({
      jobTitleId: title.id,
      openings: parsed.openings,
      effectiveFrom: parsed.recruitmentStartDate,
      changedBy: actor.id,
    });
    await db.insert(jobTitleLifecycleHistory).values({
      jobTitleId: title.id,
      status: parsed.lifecycleStatus,
      effectiveFrom: parsed.recruitmentStartDate,
      changedBy: actor.id,
    });
    await db.insert(jobTitleSlaHistory).values({
      jobTitleId: title.id,
      recruitmentStartDate: parsed.recruitmentStartDate,
      slaWorkingDays: await getSlaDays(parsed.grade, parsed.slaWorkingDays),
      effectiveFrom: parsed.recruitmentStartDate,
      changedBy: actor.id,
    });
    await recordAudit({
      actorId: actor.id,
      action: "job_title.create",
      entityType: "job_title",
      entityId: title.id,
      after: { title: parsed.title },
    });
    return { id: title.id };
  });
}

export async function updateJobTitleAction(id: string, input: JobTitleInput) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const parsed = jobTitleInputSchema.parse(input);
    const [before] = await db
      .select({
        openings: jobTitles.openings,
        lifecycleStatus: jobTitles.lifecycleStatus,
        recruitmentStartDate: jobTitles.recruitmentStartDate,
        slaWorkingDays: jobTitles.slaWorkingDays,
      })
      .from(jobTitles)
      .where(and(eq(jobTitles.id, id), isNull(jobTitles.deletedAt)));
    if (!before) throw new Error("JOB_TITLE_NOT_FOUND");
    const [updated] = await db
      .update(jobTitles)
      .set({
        title: parsed.title,
        openings: parsed.openings,
        grade: parsed.grade,
        recruitmentStartDate: parsed.recruitmentStartDate,
        slaWorkingDays: await getSlaDays(parsed.grade, parsed.slaWorkingDays),
        description: parsed.description || null,
        competencies: parsed.competencies,
        minYearsExperience: parsed.minYearsExperience,
        minEducation: parsed.minEducation || null,
        location: parsed.location || null,
        workType: parsed.workType || null,
        workArrangement: parsed.workArrangement || null,
        language: parsed.language || null,
        lifecycleStatus: parsed.lifecycleStatus,
        active: parsed.lifecycleStatus === "active",
        updatedAt: new Date(),
      })
      .where(eq(jobTitles.id, id))
      .returning({ id: jobTitles.id });
    if (before && before.openings !== parsed.openings) {
      await db.insert(jobTitleHeadcountHistory).values({
        jobTitleId: id,
        openings: parsed.openings,
        effectiveFrom: jakartaDate(),
        changedBy: actor.id,
      });
    }
    if (before && before.lifecycleStatus !== parsed.lifecycleStatus) {
      await db.insert(jobTitleLifecycleHistory).values({
        jobTitleId: id,
        status: parsed.lifecycleStatus,
        effectiveFrom: jakartaDate(),
        changedBy: actor.id,
      });
    }
    if (
      before &&
      (before.recruitmentStartDate !== parsed.recruitmentStartDate ||
        before.slaWorkingDays !== parsed.slaWorkingDays)
    ) {
      await db.insert(jobTitleSlaHistory).values({
        jobTitleId: id,
        recruitmentStartDate: parsed.recruitmentStartDate,
        slaWorkingDays: parsed.slaWorkingDays,
        effectiveFrom: jakartaDate(),
        changedBy: actor.id,
      });
    }
    await recordAudit({
      actorId: actor.id,
      action: "job_title.update",
      entityType: "job_title",
      entityId: id,
      after: { title: parsed.title },
    });
    return { id: updated.id };
  });
}

async function getSlaDays(grade: string, requestedDays: number) {
  const [policy] = await db.select().from(slaPolicies).where(eq(slaPolicies.grade, grade));
  if (!policy) throw new Error("SLA_NOT_CONFIGURED");
  if (policy.workingDays !== requestedDays) throw new Error("SLA_VALUE_MISMATCH");
  return policy.workingDays;
}

export async function deleteJobTitleAction(id: string) {
  return runAction(async () => {
    const actor = await requireAdmin();
    await db.transaction(async (tx) => {
      const [title] = await tx
        .select({ id: jobTitles.id, title: jobTitles.title })
        .from(jobTitles)
        .where(and(eq(jobTitles.id, id), isNull(jobTitles.deletedAt)));
      if (!title) throw new Error("JOB_TITLE_NOT_FOUND");

      const titleApplications = await tx
        .select({ id: applications.id })
        .from(applications)
        .where(eq(applications.jobTitleId, id));
      const applicationIds = titleApplications.map((application) => application.id);

      const titleJobs = await tx
        .select({ id: processingJobs.id })
        .from(processingJobs)
        .where(eq(processingJobs.jobTitleId, id));
      const processingJobIds = titleJobs.map((job) => job.id);
      const titleResults = processingJobIds.length
        ? await tx
            .select({ id: processingResults.id })
            .from(processingResults)
            .where(inArray(processingResults.processingJobId, processingJobIds))
        : [];
      const processingResultIds = titleResults.map((result) => result.id);

      await tx.delete(recommendations).where(eq(recommendations.jobTitleId, id));
      if (processingResultIds.length > 0) {
        await tx
          .delete(recommendations)
          .where(inArray(recommendations.processingResultId, processingResultIds));
      }
      if (processingJobIds.length > 0) {
        await tx
          .delete(processingResults)
          .where(inArray(processingResults.processingJobId, processingJobIds));
        await tx.delete(processingJobs).where(inArray(processingJobs.id, processingJobIds));
      }
      if (applicationIds.length > 0) {
        await tx
          .delete(applicationStatusHistory)
          .where(inArray(applicationStatusHistory.applicationId, applicationIds));
        await tx
          .update(applications)
          .set({ jobTitleId: null, currentStatusId: null, updatedAt: new Date() })
          .where(inArray(applications.id, applicationIds));
      }

      await tx.delete(jobTitleStatuses).where(eq(jobTitleStatuses.jobTitleId, id));
      await tx.delete(jobTitleHeadcountHistory).where(eq(jobTitleHeadcountHistory.jobTitleId, id));
      await tx.delete(jobTitleLifecycleHistory).where(eq(jobTitleLifecycleHistory.jobTitleId, id));
      await tx.delete(jobTitleSlaHistory).where(eq(jobTitleSlaHistory.jobTitleId, id));
      await tx
        .update(jobTitles)
        .set({ active: false, deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(jobTitles.id, id));
      await tx.insert(auditLogs).values({
        actorId: actor.id,
        action: "job_title.delete",
        entityType: "job_title",
        entityId: id,
        before: { title: title.title },
        after: { deleted: true, applicationsUnassigned: applicationIds.length },
      });
    });
    return { id };
  });
}

async function assertActiveJobTitle(jobTitleId: string) {
  const [title] = await db
    .select({ id: jobTitles.id })
    .from(jobTitles)
    .where(and(eq(jobTitles.id, jobTitleId), isNull(jobTitles.deletedAt)));
  if (!title) throw new Error("JOB_TITLE_NOT_FOUND");
}

export async function addStatusAction(jobTitleId: string, name: string, color?: StatusColor) {
  return runAction(async () => {
    const actor = await requireAdmin();
    await assertActiveJobTitle(jobTitleId);
    const parsed = statusInputSchema.parse({ name });
    const parsedColor = color ? statusColorSchema.parse({ color }).color : "gray";
    const statuses = await db
      .select()
      .from(jobTitleStatuses)
      .where(and(eq(jobTitleStatuses.jobTitleId, jobTitleId), eq(jobTitleStatuses.active, true)));
    const nextPosition = statuses.reduce((max, s) => Math.max(max, s.position), -1) + 1;
    const [status] = await db
      .insert(jobTitleStatuses)
      .values({
        jobTitleId,
        name: parsed.name,
        position: nextPosition,
        color: parsedColor,
      })
      .returning({ id: jobTitleStatuses.id });
    await recordAudit({
      actorId: actor.id,
      action: "status.create",
      entityType: "job_title_status",
      entityId: status.id,
      after: { jobTitleId, name: parsed.name, color: parsedColor },
    });
    return { id: status.id };
  });
}

export async function updateStatusAction(statusId: string, name: string) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const [existing] = await db
      .select()
      .from(jobTitleStatuses)
      .where(eq(jobTitleStatuses.id, statusId));
    if (existing?.name === "Hired") throw new Error("HIRED_STATUS_LOCKED");
    if (!existing) throw new Error("STATUS_NOT_FOUND");
    await assertActiveJobTitle(existing.jobTitleId);
    const parsed = statusInputSchema.parse({ name });
    await db
      .update(jobTitleStatuses)
      .set({ name: parsed.name, updatedAt: new Date() })
      .where(eq(jobTitleStatuses.id, statusId));
    await recordAudit({
      actorId: actor.id,
      action: "status.update",
      entityType: "job_title_status",
      entityId: statusId,
      after: { name: parsed.name },
    });
    return { id: statusId };
  });
}

export async function setStatusColorAction(statusId: string, color: string) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const [existing] = await db
      .select({ jobTitleId: jobTitleStatuses.jobTitleId })
      .from(jobTitleStatuses)
      .where(eq(jobTitleStatuses.id, statusId));
    if (!existing) throw new Error("STATUS_NOT_FOUND");
    await assertActiveJobTitle(existing.jobTitleId);
    const parsed = statusColorSchema.parse({ color });
    await db
      .update(jobTitleStatuses)
      .set({ color: parsed.color, updatedAt: new Date() })
      .where(eq(jobTitleStatuses.id, statusId));
    await recordAudit({
      actorId: actor.id,
      action: "status.color",
      entityType: "job_title_status",
      entityId: statusId,
      after: { color: parsed.color },
    });
    return { id: statusId };
  });
}

export async function reorderStatusesAction(jobTitleId: string, orderedIds: string[]) {
  return runAction(async () => {
    const actor = await requireAdmin();
    await assertActiveJobTitle(jobTitleId);
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(jobTitleStatuses)
        .set({ position: i, updatedAt: new Date() })
        .where(
          and(eq(jobTitleStatuses.id, orderedIds[i]), eq(jobTitleStatuses.jobTitleId, jobTitleId)),
        );
    }
    await recordAudit({
      actorId: actor.id,
      action: "status.reorder",
      entityType: "job_title",
      entityId: jobTitleId,
      after: { orderedIds },
    });
    return { jobTitleId };
  });
}

export async function deactivateStatusAction(statusId: string) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const [existing] = await db
      .select()
      .from(jobTitleStatuses)
      .where(eq(jobTitleStatuses.id, statusId));
    if (existing?.name === "Hired") throw new Error("HIRED_STATUS_LOCKED");
    if (!existing) throw new Error("STATUS_NOT_FOUND");
    await assertActiveJobTitle(existing.jobTitleId);
    await db
      .update(jobTitleStatuses)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(jobTitleStatuses.id, statusId));
    await recordAudit({
      actorId: actor.id,
      action: "status.deactivate",
      entityType: "job_title_status",
      entityId: statusId,
    });
    return { id: statusId };
  });
}

export async function getActiveStatuses(jobTitleId: string) {
  return db
    .select()
    .from(jobTitleStatuses)
    .where(and(eq(jobTitleStatuses.jobTitleId, jobTitleId), eq(jobTitleStatuses.active, true)))
    .orderBy(asc(jobTitleStatuses.position));
}
