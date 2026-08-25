"use server";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { jobTitleStatuses, jobTitles } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { runAction } from "@/lib/action-result";
import { runAiJobTitleAutofill } from "@/lib/ai/autofill";
import { recordAudit } from "@/lib/audit";
import { DEFAULT_STATUSES } from "@/lib/defaults";
import { colorForDefaultStatus, type StatusColor } from "@/lib/status-colors";
import { jobTitleInputSchema, statusColorSchema, statusInputSchema } from "@/lib/validation";
import type { z } from "zod";

type JobTitleInput = z.infer<typeof jobTitleInputSchema>;

export async function autofillJobTitleAction(input: { title: string; prompt: string }) {
  return runAction(async () => {
    await requireRole("admin", "recruiter");
    const title = input.title.trim();
    const prompt = input.prompt.trim();
    if (!title) throw new Error("A job title is required before using Auto-fill.");
    if (prompt.length > 5000) throw new Error("Custom prompt is too long.");
    return runAiJobTitleAutofill({ title, prompt });
  });
}

export async function createJobTitleAction(input: JobTitleInput) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
    const parsed = jobTitleInputSchema.parse(input);
    const [title] = await db
      .insert(jobTitles)
      .values({
        title: parsed.title,
        openings: parsed.openings,
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
    const actor = await requireRole("admin", "recruiter");
    const parsed = jobTitleInputSchema.parse(input);
    const [updated] = await db
      .update(jobTitles)
      .set({
        title: parsed.title,
        openings: parsed.openings,
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

export async function deactivateJobTitleAction(id: string) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
    await db
      .update(jobTitles)
      .set({ active: false, lifecycleStatus: "fulfilled", updatedAt: new Date() })
      .where(eq(jobTitles.id, id));
    await recordAudit({
      actorId: actor.id,
      action: "job_title.deactivate",
      entityType: "job_title",
      entityId: id,
    });
    return { id };
  });
}

export async function addStatusAction(jobTitleId: string, name: string, color?: StatusColor) {
  return runAction(async () => {
    const actor = await requireRole("admin", "recruiter");
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
    const actor = await requireRole("admin", "recruiter");
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
    const actor = await requireRole("admin", "recruiter");
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
    const actor = await requireRole("admin", "recruiter");
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
    const actor = await requireRole("admin", "recruiter");
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
