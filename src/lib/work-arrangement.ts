export const WORK_ARRANGEMENTS = [
  "On-site",
  "Hybrid",
  "Remote",
  "Flexible",
] as const;

export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number];

export function normalizeWorkArrangement(value?: string | null): WorkArrangement | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "onsite" || normalized === "on-site") return "On-site";
  if (normalized === "hybrid") return "Hybrid";
  if (normalized === "remote") return "Remote";
  if (normalized === "flexible") return "Flexible";
  return null;
}

export function arrangementFromLegacyLocation(value?: string | null): WorkArrangement | null {
  const match = value?.match(/\((hybrid|remote|on-site|onsite|flexible)\)\s*$/i);
  return normalizeWorkArrangement(match?.[1]);
}

export function locationWithoutArrangement(value?: string | null): string {
  return value?.replace(/\s*\((hybrid|remote|on-site|onsite|flexible)\)\s*$/i, "").trim() ?? "";
}
