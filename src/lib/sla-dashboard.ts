import {
  getSlaState,
  hireIsCompliant,
  jakartaDate,
  jakartaDateFromTimestamp,
  monthEnd,
  monthKey,
} from "@/lib/sla";
import type { HoldPeriod } from "@/lib/working-days";
import { countSlaWorkingDays } from "@/lib/working-days";

export type DashboardTitle = {
  id: string;
  title: string;
  grade: string;
  target: number;
  openings: number;
  start: string;
  lifecycleStatus: "active" | "hold" | "fulfilled";
  deletedAt: Date | null;
};

export type DashboardHire = {
  applicationId: string;
  jobTitleId: string;
  hiredDate: string;
  withdrawn: boolean;
  withdrawnAt: Date | null;
  withdrawalDate: string | null;
  withdrawalType: string | null;
  hireCanceledAt: Date | null;
};

export type RequirementChange = {
  jobTitleId: string;
  openings: number;
  effectiveFrom: string;
  createdAt?: Date;
};
export type LifecycleChange = {
  jobTitleId: string;
  status: "active" | "hold" | "fulfilled";
  effectiveFrom: string;
  createdAt?: Date;
};
export type HolidayChange = {
  holidayDate: string;
  active: boolean;
  effectiveFrom: string;
  createdAt?: Date;
};
export type SlaChange = {
  jobTitleId: string;
  recruitmentStartDate: string;
  slaWorkingDays: number;
  effectiveFrom: string;
  createdAt?: Date;
};

export type SlaDashboardRow = {
  id: string;
  title: string;
  grade: string;
  requiredHc: number;
  fulfilledHc: number;
  withinHc: number;
  overHc: number;
  remainingHc: number;
  status: "on_track" | "at_risk" | "over_sla" | "fulfilled" | "on_hold";
};

export type SlaMonth = {
  month: string;
  within: number;
  over: number;
  compliance: number | null;
  preJoiningWithdrawals: number;
};

function latestAt<T extends { jobTitleId: string; effectiveFrom: string; createdAt?: Date }>(
  rows: T[],
  jobTitleId: string,
  asOf: string,
) {
  return rows
    .filter((row) => row.jobTitleId === jobTitleId && row.effectiveFrom <= asOf)
    .sort((a, b) => {
      const dateOrder = b.effectiveFrom.localeCompare(a.effectiveFrom);
      if (dateOrder !== 0) return dateOrder;
      return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    })[0];
}

function holdPeriods(jobTitleId: string, changes: LifecycleChange[], asOf: string): HoldPeriod[] {
  const relevant = changes
    .filter((change) => change.jobTitleId === jobTitleId && change.effectiveFrom <= asOf)
    .sort((a, b) => {
      const dateOrder = a.effectiveFrom.localeCompare(b.effectiveFrom);
      if (dateOrder !== 0) return dateOrder;
      return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
    });
  const holds: HoldPeriod[] = [];
  let holdStart: string | null = null;
  for (const change of relevant) {
    if (change.status === "hold" && !holdStart) holdStart = change.effectiveFrom;
    if (change.status !== "hold" && holdStart) {
      holds.push({ start: holdStart, end: change.effectiveFrom });
      holdStart = null;
    }
  }
  if (holdStart) holds.push({ start: holdStart, end: null });
  return holds;
}

function isActiveAt(hire: DashboardHire, asOf: string) {
  const withdrawnDate = hire.withdrawalDate ?? jakartaDateFromTimestamp(hire.withdrawnAt);
  const canceledDate = jakartaDateFromTimestamp(hire.hireCanceledAt);
  return (
    hire.hiredDate <= asOf &&
    (!withdrawnDate || withdrawnDate > asOf) &&
    (!canceledDate || canceledDate > asOf)
  );
}

function holidaysAt(changes: HolidayChange[], asOf: string, fallback: string[]) {
  if (changes.length === 0) return fallback;
  const latestByDate = new Map<string, HolidayChange>();
  for (const change of changes) {
    if (change.effectiveFrom <= asOf) {
      const previous = latestByDate.get(change.holidayDate);
      if (
        !previous ||
        previous.effectiveFrom < change.effectiveFrom ||
        (previous.effectiveFrom === change.effectiveFrom &&
          (previous.createdAt?.getTime() ?? 0) <= (change.createdAt?.getTime() ?? 0))
      ) {
        latestByDate.set(change.holidayDate, change);
      }
    }
  }
  return [...latestByDate.values()]
    .filter((change) => change.active)
    .map((change) => change.holidayDate);
}

export function getAsOf(month: string, today = jakartaDate()) {
  return monthEnd(month) < today ? monthEnd(month) : today;
}

export function buildSlaSnapshot({
  month,
  today = jakartaDate(),
  titles,
  hires,
  holidays,
  holidayChanges = [],
  requirementChanges,
  lifecycleChanges,
  slaChanges = [],
}: {
  month: string;
  today?: string;
  titles: DashboardTitle[];
  hires: DashboardHire[];
  holidays: string[];
  holidayChanges?: HolidayChange[];
  requirementChanges: RequirementChange[];
  lifecycleChanges: LifecycleChange[];
  slaChanges?: SlaChange[];
}) {
  const asOf = getAsOf(month, today);
  const effectiveHolidays = holidaysAt(holidayChanges, asOf, holidays);
  const rows: SlaDashboardRow[] = [];
  let within = 0;
  let over = 0;
  let preJoiningWithdrawals = 0;

  for (const hire of hires) {
    if (hire.hireCanceledAt || hire.hiredDate > asOf) continue;
    const title = titles.find((item) => item.id === hire.jobTitleId);
    const sla = title && latestAt(slaChanges, title.id, asOf);
    const start = sla?.recruitmentStartDate ?? title?.start;
    const target = sla?.slaWorkingDays ?? title?.target;
    if (!title || title.deletedAt || !start || target == null || start > asOf) continue;
    const holds = holdPeriods(title.id, lifecycleChanges, asOf);
    if (
      monthKey(hire.hiredDate) === month &&
      hireIsCompliant(start, hire.hiredDate, target, effectiveHolidays, holds)
    )
      within++;
    else if (monthKey(hire.hiredDate) === month) over++;
    const withdrawnDate = hire.withdrawalDate ?? jakartaDateFromTimestamp(hire.withdrawnAt);
    if (hire.withdrawalType === "pre_joining" && withdrawnDate && monthKey(withdrawnDate) === month)
      preJoiningWithdrawals++;
  }

  for (const title of titles) {
    if (title.deletedAt) continue;
    const sla = latestAt(slaChanges, title.id, asOf);
    const start = sla?.recruitmentStartDate ?? title.start;
    const target = sla?.slaWorkingDays ?? title.target;
    if (start > asOf) continue;
    const requirement = latestAt(requirementChanges, title.id, asOf)?.openings ?? title.openings;
    const lifecycle = latestAt(lifecycleChanges, title.id, asOf)?.status ?? title.lifecycleStatus;
    const holds = holdPeriods(title.id, lifecycleChanges, asOf);
    const titleHires = hires.filter(
      (hire) => hire.jobTitleId === title.id && !hire.hireCanceledAt && hire.hiredDate <= asOf,
    );
    const activeHires = titleHires.filter((hire) => isActiveAt(hire, asOf));
    const withinHc = titleHires.filter((hire) =>
      hireIsCompliant(start, hire.hiredDate, target, effectiveHolidays, holds),
    ).length;
    const overHc = titleHires.length - withinHc;
    const fulfilledHc = Math.min(requirement, activeHires.length);
    const elapsed = countSlaWorkingDays(start, asOf, effectiveHolidays, holds);
    const missingOver =
      fulfilledHc < requirement && elapsed > target ? requirement - fulfilledHc : 0;
    rows.push({
      id: title.id,
      title: title.title,
      grade: title.grade,
      requiredHc: requirement,
      fulfilledHc,
      withinHc,
      overHc,
      remainingHc: Math.max(requirement - fulfilledHc, 0),
      status: getSlaState({
        start,
        asOf,
        targetDays: target,
        requiredHc: requirement,
        fulfilledHc,
        withinHc,
        overHc: overHc + missingOver,
        isOnHold: lifecycle === "hold",
        holidays: effectiveHolidays,
        holds,
      }),
    });
  }

  const total = within + over;
  return {
    asOf,
    rows,
    summary: {
      totalHeadcount: rows.reduce((sum, row) => sum + row.requiredHc, 0),
      fulfilledHeadcount: rows.reduce((sum, row) => sum + row.fulfilledHc, 0),
      compliance: total ? Math.round((within / total) * 100) : null,
      preJoiningWithdrawals,
      within,
      over,
    },
  };
}

export function buildMonthlySla({
  months,
  titles,
  hires,
  holidays,
  holidayChanges,
  requirementChanges,
  lifecycleChanges,
  slaChanges,
  today = jakartaDate(),
}: Omit<Parameters<typeof buildSlaSnapshot>[0], "month" | "today"> & {
  months: string[];
  today?: string;
}) {
  return months.map((month) => {
    const snapshot = buildSlaSnapshot({
      month,
      today,
      titles,
      hires,
      holidays,
      holidayChanges,
      requirementChanges,
      lifecycleChanges,
      slaChanges,
    });
    return {
      month,
      within: snapshot.summary.within,
      over: snapshot.summary.over,
      compliance: snapshot.summary.compliance,
      preJoiningWithdrawals: snapshot.summary.preJoiningWithdrawals,
    } satisfies SlaMonth;
  });
}
