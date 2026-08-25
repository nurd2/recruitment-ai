export const JOB_TITLE_LIFECYCLE_STATUSES = ["active", "hold", "fulfilled"] as const;

export type JobTitleLifecycleStatus = (typeof JOB_TITLE_LIFECYCLE_STATUSES)[number];

export const JOB_TITLE_LIFECYCLE_LABELS: Record<JobTitleLifecycleStatus, string> = {
  active: "Active",
  hold: "On hold",
  fulfilled: "Fulfilled",
};