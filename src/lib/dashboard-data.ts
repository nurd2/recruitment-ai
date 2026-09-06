import { cache } from "react";
import { and, count, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  applications,
  candidates,
  holidayHistory,
  holidays,
  jobTitleHeadcountHistory,
  jobTitleLifecycleHistory,
  jobTitleSlaHistory,
  jobTitleStatuses,
  jobTitles,
} from "@/db/schema";
import { requireUser } from "@/lib/authz";
import { jakartaDate, lastSixMonths } from "@/lib/sla";
import {
  buildMonthlySla,
  buildSlaSnapshot,
  type DashboardHire,
  type DashboardTitle,
} from "@/lib/sla-dashboard";
import { aggregatePipelineStatusCounts } from "@/lib/pipeline-chart";
import { CANDIDATE_SOURCE_LABELS, type CandidateSource } from "@/lib/resume-sources";

export const getDashboardMonths = cache(async () => {
  return lastSixMonths(jakartaDate());
});

export const getActiveTitleCount = cache(async () => {
  await requireUser();
  const [row] = await db
    .select({ n: count() })
    .from(jobTitles)
    .where(and(eq(jobTitles.lifecycleStatus, "active"), isNull(jobTitles.deletedAt)));
  return Number(row?.n ?? 0);
});

export const getHoldTitleCount = cache(async () => {
  await requireUser();
  const [row] = await db
    .select({ n: count() })
    .from(jobTitles)
    .where(and(eq(jobTitles.lifecycleStatus, "hold"), isNull(jobTitles.deletedAt)));
  return Number(row?.n ?? 0);
});

export const getFulfilledTitleCount = cache(async () => {
  await requireUser();
  const [row] = await db
    .select({ n: count() })
    .from(jobTitles)
    .where(and(eq(jobTitles.lifecycleStatus, "fulfilled"), isNull(jobTitles.deletedAt)));
  return Number(row?.n ?? 0);
});

export const getCandidateCount = cache(async () => {
  await requireUser();
  const [row] = await db
    .select({ n: count() })
    .from(candidates)
    .where(isNull(candidates.deletedAt));
  return Number(row?.n ?? 0);
});

export const getCandidateSourceData = cache(async () => {
  await requireUser();
  const rows = await db
    .select({ source: candidates.source, n: count() })
    .from(candidates)
    .where(isNull(candidates.deletedAt))
    .groupBy(candidates.source);
  return rows
    .map(({ source, n }) => ({
      label: source
        ? (CANDIDATE_SOURCE_LABELS[source as CandidateSource] ?? source)
        : "Not specified",
      value: Number(n),
    }))
    .sort((a, b) => b.value - a.value);
});

export const getPipelineData = cache(async () => {
  await requireUser();
  const rows = await db
    .select({ statusName: jobTitleStatuses.name, n: count() })
    .from(applications)
    .innerJoin(jobTitles, eq(applications.jobTitleId, jobTitles.id))
    .leftJoin(jobTitleStatuses, eq(applications.currentStatusId, jobTitleStatuses.id))
    .where(and(eq(applications.withdrawn, false), isNull(jobTitles.deletedAt)))
    .groupBy(jobTitleStatuses.name);
  return aggregatePipelineStatusCounts(rows);
});

const getSlaFacts = cache(async () => {
  await requireUser();
  const [
    titles,
    holidayRows,
    holidayChanges,
    hires,
    requirementChanges,
    lifecycleChanges,
    slaChanges,
  ] = await Promise.all([
    db.select().from(jobTitles).where(isNull(jobTitles.deletedAt)),
    db.select({ date: holidays.date }).from(holidays).where(isNull(holidays.deletedAt)),
    db.select().from(holidayHistory),
    db
      .select({
        applicationId: applications.id,
        jobTitleId: applications.jobTitleId,
        hiredDate: applications.hiredDate,
        withdrawn: applications.withdrawn,
        withdrawnAt: applications.withdrawnAt,
        withdrawalDate: applications.withdrawalDate,
        withdrawalType: applications.withdrawalType,
        hireCanceledAt: applications.hireCanceledAt,
      })
      .from(applications)
      .where(isNotNull(applications.hiredDate)),
    db.select().from(jobTitleHeadcountHistory),
    db.select().from(jobTitleLifecycleHistory),
    db.select().from(jobTitleSlaHistory),
  ]);

  const dashboardTitles: DashboardTitle[] = titles.map((title) => ({
    id: title.id,
    title: title.title,
    grade: title.grade,
    target: title.slaWorkingDays,
    openings: title.openings,
    start: title.recruitmentStartDate ?? title.createdAt.toISOString().slice(0, 10),
    lifecycleStatus: title.lifecycleStatus,
    deletedAt: title.deletedAt,
  }));
  const activeTitleIds = new Set(titles.map((title) => title.id));
  const dashboardHires: DashboardHire[] = hires.flatMap((hire) => {
    if (!hire.hiredDate || !hire.jobTitleId || !activeTitleIds.has(hire.jobTitleId)) return [];
    return [
      {
        applicationId: hire.applicationId,
        jobTitleId: hire.jobTitleId,
        hiredDate: hire.hiredDate,
        withdrawn: hire.withdrawn,
        withdrawnAt: hire.withdrawnAt,
        withdrawalDate: hire.withdrawalDate,
        withdrawalType: hire.withdrawalType,
        hireCanceledAt: hire.hireCanceledAt,
      },
    ];
  });

  return {
    titles: dashboardTitles,
    hires: dashboardHires,
    holidays: holidayRows.map((row) => row.date),
    holidayChanges: holidayChanges.map((change) => ({
      holidayDate: change.holidayDate,
      active: change.active,
      effectiveFrom: change.effectiveFrom,
      createdAt: change.createdAt,
    })),
    requirementChanges: requirementChanges
      .filter((change) => activeTitleIds.has(change.jobTitleId))
      .map((change) => ({
        jobTitleId: change.jobTitleId,
        openings: change.openings,
        effectiveFrom: change.effectiveFrom,
        createdAt: change.createdAt,
      })),
    lifecycleChanges: lifecycleChanges
      .filter((change) => activeTitleIds.has(change.jobTitleId))
      .map((change) => ({
        jobTitleId: change.jobTitleId,
        status: change.status,
        effectiveFrom: change.effectiveFrom,
        createdAt: change.createdAt,
      })),
    slaChanges: slaChanges
      .filter((change) => activeTitleIds.has(change.jobTitleId))
      .map((change) => ({
        jobTitleId: change.jobTitleId,
        recruitmentStartDate: change.recruitmentStartDate,
        slaWorkingDays: change.slaWorkingDays,
        effectiveFrom: change.effectiveFrom,
        createdAt: change.createdAt,
      })),
  };
});

export const getSlaSnapshot = cache(async (month: string) => {
  const facts = await getSlaFacts();
  return buildSlaSnapshot({ ...facts, month, today: jakartaDate() });
});

export const getSlaMonthlyData = cache(async () => {
  const [facts, months] = await Promise.all([getSlaFacts(), getDashboardMonths()]);
  return buildMonthlySla({ ...facts, months, today: jakartaDate() });
});

export const getFulfillmentRate = cache(async () => {
  const [facts, months] = await Promise.all([getSlaFacts(), getDashboardMonths()]);
  const current = buildSlaSnapshot({
    ...facts,
    month: months[months.length - 1],
    today: jakartaDate(),
    titles: facts.titles.filter((title) => !title.deletedAt),
  });
  const openIds = new Set(
    facts.titles
      .filter(
        (title) =>
          !title.deletedAt &&
          (title.lifecycleStatus === "active" || title.lifecycleStatus === "hold"),
      )
      .map((title) => title.id),
  );
  const openRows = current.rows.filter((row) => openIds.has(row.id));
  const required = openRows.reduce((sum, row) => sum + row.requiredHc, 0);
  const fulfilled = openRows.reduce((sum, row) => sum + row.fulfilledHc, 0);
  return required ? Math.min(100, Math.round((fulfilled / required) * 100)) : 0;
});

export function validDashboardMonth(value: string | undefined, months: string[]): string {
  return value && months.includes(value) ? value : (months[months.length - 1] ?? "");
}
