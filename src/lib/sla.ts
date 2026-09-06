import { countSlaWorkingDays, type HoldPeriod } from "@/lib/working-days";

export type SlaState = "on_track" | "at_risk" | "over_sla" | "fulfilled" | "on_hold";

export type HireFact = {
  applicationId: string;
  jobTitleId: string;
  hiredDate: string;
  withdrawn: boolean;
  withdrawnAt: Date | null;
  hireCanceledAt: Date | null;
  candidateDeletedAt?: Date | null;
};

export function hireIsCompliant(
  start: string,
  hiredDate: string,
  targetDays: number,
  holidays: string[],
  holds: HoldPeriod[] = [],
) {
  return countSlaWorkingDays(start, hiredDate, holidays, holds) <= targetDays;
}

export function getSlaState({
  start,
  asOf,
  targetDays,
  requiredHc,
  fulfilledHc,
  withinHc,
  overHc,
  isOnHold,
  holidays,
  holds,
}: {
  start: string;
  asOf: string;
  targetDays: number;
  requiredHc: number;
  fulfilledHc: number;
  withinHc: number;
  overHc: number;
  isOnHold: boolean;
  holidays: string[];
  holds: HoldPeriod[];
}): SlaState {
  if (isOnHold) return "on_hold";
  if (overHc > 0) return "over_sla";
  if (fulfilledHc >= requiredHc && withinHc >= requiredHc) return "fulfilled";
  const elapsed = countSlaWorkingDays(start, asOf, holidays, holds);
  if (elapsed > targetDays) return "over_sla";
  if (elapsed >= targetDays * 0.8) return "at_risk";
  return "on_track";
}

export function jakartaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function jakartaDateFromTimestamp(value: Date | null) {
  return value ? jakartaDate(value) : null;
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function monthEnd(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Date(Date.UTC(year, value, 0)).toISOString().slice(0, 10);
}

export function addMonths(month: string, amount: number) {
  const [year, value] = month.split("-").map(Number);
  return new Date(Date.UTC(year, value - 1 + amount, 1)).toISOString().slice(0, 7);
}

export function lastSixMonths(asOf = jakartaDate()) {
  const current = monthKey(asOf);
  return Array.from({ length: 6 }, (_, index) => addMonths(current, index - 5));
}
