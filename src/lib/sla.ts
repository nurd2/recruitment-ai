import { countWorkingDays } from "@/lib/working-days";

export type SlaState = "on_track" | "at_risk" | "breached" | "compliant" | "partially_breached";

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
