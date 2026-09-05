import { relations } from "drizzle-orm";
import type { JobTitleLifecycleStatus } from "@/lib/job-title-status";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Better Auth core tables (managed by the auth plugin)                */
/* ------------------------------------------------------------------ */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    // Admin plugin
    role: text("role").notNull().default("recruiter"), // admin | recruiter
    banned: boolean("banned").notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_email_idx").on(t.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    // Synthetic issuer for local providers: "local:credential" (see
    // createLocalAccountIssuer in better-auth). Required by sign-in to
    // locate the credential account for password verification.
    issuer: text("issuer").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Domain: Job Title & per-job-title status pipeline                   */
/* ------------------------------------------------------------------ */

export const jobTitles = pgTable("job_title", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  openings: integer("openings").notNull().default(1),
  grade: text("grade").notNull().default("staff"),
  recruitmentStartDate: date("recruitment_start_date"),
  slaWorkingDays: integer("sla_working_days").notNull().default(30),
  description: text("description"),
  competencies: jsonb("competencies").$type<Competency[]>().notNull().default([]),
  minYearsExperience: doublePrecision("min_years_experience").notNull().default(0),
  minEducation: text("min_education"),
  location: text("location"),
  workType: text("work_type"),
  workArrangement: text("work_arrangement"),
  language: text("language"),
  lifecycleStatus: text("lifecycle_status").$type<JobTitleLifecycleStatus>().notNull().default("active"),
  active: boolean("active").notNull().default(true),
  deletedAt: timestamp("deleted_at"),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const slaPolicies = pgTable("sla_policy", {
  id: uuid("id").defaultRandom().primaryKey(),
  grade: text("grade").notNull().unique(),
  workingDays: integer("working_days").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const holidays = pgTable("holiday", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // national_holiday | collective_leave
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const jobTitleStatuses = pgTable(
  "job_title_status",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobTitleId: uuid("job_title_id")
      .notNull()
      .references(() => jobTitles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    active: boolean("active").notNull().default(true),
    // Semantic palette key from STATUS_COLORS (see lib/status-colors.ts).
    color: text("color").notNull().default("gray"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("job_title_status_job_idx").on(t.jobTitleId)],
);

/* ------------------------------------------------------------------ */
/* Domain: Resume documents (private storage)                          */
/* ------------------------------------------------------------------ */

export const resumeDocuments = pgTable(
  "resume_document",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storagePath: text("storage_path").notNull(), // gs://bucket/object or bucket/object
    bucket: text("bucket").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: text("checksum").notNull(), // sha256 hex
    uploaderId: text("uploader_id").references(() => user.id),
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"), // soft delete
  },
  (t) => [index("resume_document_uploader_idx").on(t.uploaderId)],
);

/* ------------------------------------------------------------------ */
/* Domain: Processing jobs & draft results                             */
/* ------------------------------------------------------------------ */

export const processingJobs = pgTable(
  "processing_job",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resumeDocumentId: uuid("resume_document_id")
      .notNull()
      .references(() => resumeDocuments.id, { onDelete: "cascade" }),
    jobTitleId: uuid("job_title_id").references(() => jobTitles.id), // intake context
    // queued | processing | needs_review | ready | failed
    state: text("state").notNull().default("queued"),
    // extract | validate | recommend | done
    stage: text("stage").notNull().default("extract"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    correlationId: text("correlation_id"),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("processing_job_resume_idx").on(t.resumeDocumentId)],
);

export const processingResults = pgTable(
  "processing_result",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resumeDocumentId: uuid("resume_document_id")
      .notNull()
      .references(() => resumeDocuments.id, { onDelete: "cascade" }),
    processingJobId: uuid("processing_job_id").references(() => processingJobs.id),
    schemaVersion: text("schema_version").notNull().default("1"),
    rawText: text("raw_text"),
    ocrUsed: boolean("ocr_used").notNull().default(false),
    ocrRuntime: text("ocr_runtime"),
    // Normalized candidate fields (the draft)
    fields: jsonb("fields").$type<CandidateFields>().notNull().default({}),
    // Per-field provenance / confidence / evidence
    fieldMeta: jsonb("field_meta").$type<Record<string, FieldMeta>>().notNull().default({}),
    conflicts: jsonb("conflicts").$type<Conflict[]>().notNull().default([]),
    fieldsRequiringReview: jsonb("fields_requiring_review").$type<string[]>().notNull().default([]),
    provider: text("provider"),
    model: text("model"),
    aiTimestamp: timestamp("ai_timestamp"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("processing_result_resume_unique").on(t.resumeDocumentId)],
);

/* ------------------------------------------------------------------ */
/* Domain: Candidates & applications                                   */
/* ------------------------------------------------------------------ */

export const candidates = pgTable(
  "candidate",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: text("full_name"),
    email: text("email"),
    phone: text("phone"),
    dateOfBirth: date("date_of_birth"),
    location: text("location"),
    profileSummary: text("profile_summary"),
    source: text("source"),
    education: jsonb("education").$type<EducationEntry[]>().notNull().default([]),
    workExperience: jsonb("work_experience").$type<WorkExperienceEntry[]>().notNull().default([]),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    certifications: jsonb("certifications").$type<string[]>().notNull().default([]),
    languages: jsonb("languages").$type<string[]>().notNull().default([]),
    links: jsonb("links").$type<string[]>().notNull().default([]),
    totalYearsExperience: doublePrecision("total_years_experience"),
    primaryResumeDocumentId: uuid("primary_resume_document_id").references(
      () => resumeDocuments.id,
    ),
    createdBy: text("created_by").references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"), // soft delete
  },
  (t) => [
    index("candidate_email_idx").on(t.email),
    index("candidate_phone_idx").on(t.phone),
    index("candidate_name_idx").on(t.fullName),
  ],
);

export const applications = pgTable(
  "application",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    jobTitleId: uuid("job_title_id")
      .notNull()
      .references(() => jobTitles.id, { onDelete: "cascade" }),
    currentStatusId: uuid("current_status_id").references(() => jobTitleStatuses.id),
    createdBy: text("created_by").references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    withdrawn: boolean("withdrawn").notNull().default(false),
    withdrawnAt: timestamp("withdrawn_at"),
  },
  (t) => [
    uniqueIndex("application_candidate_job_unique").on(t.candidateId, t.jobTitleId),
    index("application_job_status_idx").on(t.jobTitleId, t.currentStatusId),
  ],
);

export const applicationStatusHistory = pgTable(
  "application_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStatusId: uuid("from_status_id").references(() => jobTitleStatuses.id),
    toStatusId: uuid("to_status_id").references(() => jobTitleStatuses.id),
    changedBy: text("changed_by").references(() => user.id),
    changedAt: timestamp("changed_at").notNull().defaultNow(),
  },
  (t) => [index("app_status_history_application_idx").on(t.applicationId)],
);

/* ------------------------------------------------------------------ */
/* Domain: Recommendations & audit                                     */
/* ------------------------------------------------------------------ */

export const recommendations = pgTable(
  "recommendation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    processingResultId: uuid("processing_result_id").references(() => processingResults.id),
    resumeDocumentId: uuid("resume_document_id").references(() => resumeDocuments.id),
    candidateId: uuid("candidate_id").references(() => candidates.id),
    jobTitleId: uuid("job_title_id")
      .notNull()
      .references(() => jobTitles.id, { onDelete: "cascade" }),
    score: doublePrecision("score"),
    explanation: text("explanation"),
    matchedCompetencies: jsonb("matched_competencies").$type<string[]>().notNull().default([]),
    experienceFit: text("experience_fit"),
    educationFit: text("education_fit"),
    unmetRequirements: jsonb("unmet_requirements").$type<string[]>().notNull().default([]),
    // pending | confirmed | rejected
    status: text("status").notNull().default("pending"),
    provider: text("provider"),
    model: text("model"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("recommendation_resume_idx").on(t.resumeDocumentId)],
);

export const auditLogs = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").references(() => user.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_actor_idx").on(t.actorId),
  ],
);

export const aiConfigs = pgTable("ai_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  // openai | deepseek | gemini | anthropic | openai_compatible (custom)
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  baseUrl: text("base_url"), // required for openai_compatible; preset for others
  model: text("model").notNull(),
  // AES-256-GCM ciphertext of the API key, encrypted with APP_ENCRYPTION_KEY.
  // Never the plaintext key.
  apiKeyEnc: text("api_key_enc"),
  enabled: boolean("enabled").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  fallbackEnabled: boolean("fallback_enabled").notNull().default(false),
  masking: jsonb("masking").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Shared JSON shapes (also mirrored in src/lib/validation.ts)         */
/* ------------------------------------------------------------------ */

export type Competency = {
  name: string;
  required: boolean;
};

export type EducationEntry = {
  institution: string;
  degree?: string;
  field?: string;
  startYear?: number;
  endYear?: number;
};

export type WorkExperienceEntry = {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  description?: string;
};

export type CandidateFields = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  dateOfBirth?: string | null; // ISO date
  profileSummary?: string | null;
  education?: EducationEntry[];
  workExperience?: WorkExperienceEntry[];
  skills?: string[];
  certifications?: string[];
  languages?: string[];
  links?: string[];
  totalYearsExperience?: number | null;
};

export type FieldMeta = {
  source: "resume" | "ai" | "manual";
  confidence?: number; // 0..1
  evidence?: string;
  page?: number;
  status: "confirmed" | "draft" | "unknown" | "needs_review";
};

export type Conflict = {
  field: string;
  message: string;
};

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const jobTitlesRelations = relations(jobTitles, ({ many }) => ({
  statuses: many(jobTitleStatuses),
  applications: many(applications),
}));

export const jobTitleStatusesRelations = relations(jobTitleStatuses, ({ one }) => ({
  jobTitle: one(jobTitles, {
    fields: [jobTitleStatuses.jobTitleId],
    references: [jobTitles.id],
  }),
}));

export const resumeDocumentsRelations = relations(resumeDocuments, ({ many, one }) => ({
  processingResults: many(processingResults),
  processingJobs: many(processingJobs),
  uploader: one(user, {
    fields: [resumeDocuments.uploaderId],
    references: [user.id],
  }),
}));

export const processingJobsRelations = relations(processingJobs, ({ one }) => ({
  resumeDocument: one(resumeDocuments, {
    fields: [processingJobs.resumeDocumentId],
    references: [resumeDocuments.id],
  }),
  jobTitle: one(jobTitles, {
    fields: [processingJobs.jobTitleId],
    references: [jobTitles.id],
  }),
}));

export const processingResultsRelations = relations(processingResults, ({ one }) => ({
  resumeDocument: one(resumeDocuments, {
    fields: [processingResults.resumeDocumentId],
    references: [resumeDocuments.id],
  }),
}));

export const candidatesRelations = relations(candidates, ({ many, one }) => ({
  applications: many(applications),
  primaryResumeDocument: one(resumeDocuments, {
    fields: [candidates.primaryResumeDocumentId],
    references: [resumeDocuments.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ many, one }) => ({
  candidate: one(candidates, {
    fields: [applications.candidateId],
    references: [candidates.id],
  }),
  jobTitle: one(jobTitles, {
    fields: [applications.jobTitleId],
    references: [jobTitles.id],
  }),
  currentStatus: one(jobTitleStatuses, {
    fields: [applications.currentStatusId],
    references: [jobTitleStatuses.id],
  }),
  statusHistory: many(applicationStatusHistory),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  processingResult: one(processingResults, {
    fields: [recommendations.processingResultId],
    references: [processingResults.id],
  }),
  jobTitle: one(jobTitles, {
    fields: [recommendations.jobTitleId],
    references: [jobTitles.id],
  }),
}));
