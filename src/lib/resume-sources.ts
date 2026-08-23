export const RESUME_SOURCES = [
  "linkedin",
  "jobstreet",
  "kalibrr",
  "glints",
  "indeed",
  "referral",
  "agency",
  "career_page",
  "manual",
  "other",
] as const;

export type ResumeSource = (typeof RESUME_SOURCES)[number];

export const RESUME_SOURCE_LABELS: Record<ResumeSource, string> = {
  linkedin: "LinkedIn",
  jobstreet: "JobStreet",
  kalibrr: "Kalibrr",
  glints: "Glints",
  indeed: "Indeed",
  referral: "Employee referral",
  agency: "Recruitment agency",
  career_page: "Company career page",
  manual: "Manual upload",
  other: "Other",
};
