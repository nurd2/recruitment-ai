/**
 * Semantic status colors for the application status pipeline.
 *
 * A status's color is stored on `job_title_status.color` as one of these stable
 * keys (never raw hex or Tailwind classes) so the palette stays theme-aware
 * (light + dark), safe to restyle later, and easy to render as badges, dots and
 * swatches.
 */
export const STATUS_COLORS = [
  "gray",
  "blue",
  "cyan",
  "violet",
  "amber",
  "green",
  "red",
  "orange",
] as const;

export type StatusColor = (typeof STATUS_COLORS)[number];

export const isStatusColor = (v: string | null | undefined): v is StatusColor =>
  !!v && (STATUS_COLORS as readonly string[]).includes(v);

/** Curated defaults for the default pipeline (see DEFAULT_STATUSES). */
export const DEFAULT_STATUS_COLORS: Record<string, StatusColor> = {
  Pending: "gray",
  Screening: "blue",
  "Interview 1": "cyan",
  "Interview 2": "violet",
  Offer: "amber",
  Hired: "green",
  Rejected: "red",
};

export const colorForDefaultStatus = (name: string): StatusColor =>
  DEFAULT_STATUS_COLORS[name] ?? "gray";

/* ------------------------------------------------------------------ */
/* Class maps (light + dark aware)                                     */
/* ------------------------------------------------------------------ */

const BADGE_CLASSES: Record<StatusColor, string> = {
  gray: "bg-muted text-muted-foreground",
  blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  cyan: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  red: "bg-red-500/10 text-red-700 dark:text-red-400",
  orange: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

const DOT_CLASSES: Record<StatusColor, string> = {
  gray: "bg-muted-foreground",
  blue: "bg-blue-500",
  cyan: "bg-cyan-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
};

export function statusBadgeClass(color: string | null | undefined): string {
  return BADGE_CLASSES[isStatusColor(color) ? color : "gray"];
}

export function statusDotClass(color: string | null | undefined): string {
  return DOT_CLASSES[isStatusColor(color) ? color : "gray"];
}

/** Solid swatch color for the picker (same hues as the dots). */
export const statusSwatchClass = statusDotClass;
