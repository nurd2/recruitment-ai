import { countWorkingDays } from "@/lib/working-days";

export type SlaState = "on_track" | "at_risk" | "breached" | "compliant" | "partially_breached";

export type CurrentHireRow = {
  applicationId: string;
  jobTitleId: string;
  currentStatus: string;
  withdrawn: boolean;
  candidateDeletedAt: Date | null;
  changedAt: Date;
};

export function getCurrentHireRows<T extends CurrentHireRow>(rows: T[]) {
  const latestHireByApplication = new Map<string, T>();
  for (const row of rows) {
    if (row.currentStatus !== "Hired" || row.withdrawn || row.candidateDeletedAt) continue;
    const previous = latestHireByApplication.get(row.applicationId);
    if (!previous || row.changedAt > previous.changedAt) latestHireByApplication.set(row.applicationId, row);
  }
  return [...latestHireByApplication.values()];
}

export function groupCurrentHireDates(rows: CurrentHireRow[]) {
  const datesByTitle = new Map<string, string[]>();
  for (const row of getCurrentHireRows(rows)) {
    const dates = datesByTitle.get(row.jobTitleId) ?? [];
    datesByTitle.set(row.jobTitleId, [...dates, row.changedAt.toISOString().slice(0, 10)]);
  }
  return datesByTitle;
}

export function hireIsCompliant(start: string, hiredAt: string, targetDays: number, holidays: string[]) {
  return countWorkingDays(start, hiredAt, holidays) <= targetDays;
}

export function currentSlaState({ start, today, targetDays, openings, hiredDates, holidays }: { start: string; today: string; targetDays: number; openings: number; hiredDates: string[]; holidays: string[] }): SlaState {
  const compliantHires = hiredDates.filter((date) => hireIsCompliant(start, date, targetDays, holidays)).length;
  if (hiredDates.length >= openings) return compliantHires === hiredDates.length ? "compliant" : "partially_breached";
  if (countWorkingDays(start, today, holidays) > targetDays) return "breached";
  if (countWorkingDays(start, today, holidays) >= targetDays * 0.8) return "at_risk";
  return "on_track";
}
