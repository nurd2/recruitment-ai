# Product Requirements Document: Recruva

## Document Purpose

This document is the product source of truth for the MVP. Requirements use explicit actors, preconditions, actions, outcomes, and acceptance criteria so they can be converted into implementation tasks and automated tests.

## Draft Map

1. [Product Scope](docs/drafts/01-product-scope.md)
2. [Domain And Data](docs/drafts/02-domain-and-data.md)
3. [UX And Workflows](docs/drafts/03-ux-and-workflows.md)
4. [OCR And AI](docs/drafts/04-ocr-and-ai.md)
5. [Security And Non-Functional Requirements](docs/drafts/05-security-and-nfr.md)
6. [Delivery And Open Decisions](docs/drafts/06-delivery-and-open-decisions.md)

## 1. Product Summary

The system helps recruitment teams manage hiring needs, upload candidate resumes, extract structured data with text extraction or OCR, validate extracted data with AI, and review AI-generated job title recommendations.

AI is an assistive system, not the hiring decision-maker. A recruiter must review candidate data and explicitly confirm a job title before the system creates an application.

## 2. Problem Statement

Recruitment data is often distributed across spreadsheets, file folders, and conversations. Recruiters repeatedly re-enter resume data, interpret resumes inconsistently, struggle to identify suitable job titles, and lose visibility into candidate pipeline progress.

The product centralizes hiring requirements, candidate profiles, source documents, AI processing results, applications, and status history.

## 3. Goals And Success Metrics

### MVP Goals

- `G-001`: Admin can manage system users and their roles.
- `G-002`: Recruiter can create and manage job titles and hiring criteria.
- `G-003`: Recruiter can upload resumes and store source documents privately.
- `G-004`: The system can extract key candidate fields from PDF and DOCX resumes.
- `G-005`: AI can validate extraction results and identify uncertain fields or conflicts.
- `G-006`: AI can recommend relevant job titles with reasons and requirement gaps.
- `G-007`: Recruiter must explicitly confirm a job title before an application is created.
- `G-008`: Recruiter can monitor applications and change their status from the job title detail page.
- `G-009`: Important changes are traceable through actor and timestamp metadata.

### Initial Success Metrics

- At least 90% of supported resumes produce a reviewable candidate draft.
- A recruiter can move one resume to the review stage in under two minutes, excluding external provider latency.
- Recruiters can monitor candidates by job title and status without a separate spreadsheet.
- Zero applications are created from an AI recommendation without recruiter confirmation.

## 4. Users And Access Model

The MVP has exactly two roles.

### Admin

Admin can add users, assign or change roles, activate or deactivate users, manage AI configuration, manage default statuses, and access all recruitment data.

### Recruiter

Recruiter can create and manage job titles, upload and review resumes, manage candidates and applications, and change application status. Recruiter cannot add users, change roles, deactivate users, or manage access configuration.

### Access Matrix

| Capability | Admin | Recruiter |
|---|---:|---:|
| Add user | Yes | No |
| Change user role | Yes | No |
| Activate or deactivate user | Yes | No |
| Manage AI configuration | Yes | No |
| Create and manage job title | Yes | Yes |
| Configure status per job title | Yes | Yes |
| Upload and review resume | Yes | Yes |
| Manage candidate and application | Yes | Yes |
| Change application status | Yes | Yes |

The system must not allow the last active Admin to be deleted or deactivated without an active Admin replacement.

## 5. MVP Scope

### 5.1 Job Title Management

**Actor:** Admin or Recruiter

The user can create, view, edit, and deactivate a job title with title, job description, required competencies or skills, minimum years of experience, minimum education level, and optional location, work type, and language requirements.

Each job title has its own ordered application status list. The default list may include `Pending`, `Screening`, `Interview 1`, `Interview 2`, `Offer`, `Hired`, and `Rejected`. Users can add, rename, reorder, and deactivate statuses for that job title.

### 5.2 Resume Upload And Storage

**Actor:** Admin or Recruiter

The user can upload a resume from a general candidate intake page without a selected job title or from a job title detail page where the selected job title provides processing context.

MVP supports PDF and DOCX. The system stores the original file privately in Google Cloud Storage with file name, size, MIME type, checksum, uploader, and upload timestamp.

### 5.3 Extraction And OCR

After upload, the system creates a processing job with states `Queued`, `Processing`, `Needs Review`, `Ready`, or `Failed`.

The extraction draft may contain full name, email, phone number, address or location, date of birth or age when present, profile summary, education history, work experience, skills, certifications, languages, and portfolio or professional profile links.

The pipeline should use a PDF text layer before OCR. A free local OCR option such as Tesseract may process scanned documents. Missing information must remain empty or `unknown`; the system must not invent values.

### 5.4 AI Validation

AI receives extracted data and, when needed, source text or page snippets. It returns normalized field values, field-level confidence, conflicts, fields requiring recruiter review, supporting evidence, and a safe actionable error when the provider fails.

AI output is always a draft until the recruiter confirms or edits it. AI must never silently overwrite confirmed or manually edited data.

### 5.5 Job Title Recommendation

The system compares the candidate profile with active job titles and returns recommendations containing the recommended job title, explanation, matching competencies or skills, experience fit, education fit, unmet requirements, and a confidence or score clearly labeled as decision support.

For general intake, the recruiter must select one recommendation before an application is created. The recruiter may reject all recommendations and save the candidate without an application.

For upload from a job title detail page, the job title is the application context. The recruiter must still review and confirm the extracted candidate data before the application enters the active pipeline.

### 5.6 Candidate And Application Monitoring

The job title detail page is available at `/job-title/[id]`.

The candidate table must show candidate name, age when available, total years of experience, application status, date added, and an action menu. The action menu must support changing application status, opening candidate details, editing candidate data, opening or downloading the original resume, and removing the candidate from the job title or deleting candidate data according to access rules.

Every status change stores the actor and timestamp. Delete actions require confirmation and should use soft delete in the MVP.

## 6. Core Workflows

### WF-001: Create Job Title

**Trigger:** User selects `Create job title`.

**Preconditions:** User is authenticated as Admin or Recruiter.

**Steps:** Enter required fields, optionally configure status order, and submit the form.

**Expected outcome:** The system validates required fields and creates an active job title with a valid initial status.

### WF-002: General Resume Intake

**Trigger:** User uploads a resume without selecting a job title.

**Steps:** Validate file, store original, create processing job, extract text or run OCR, validate with AI, display draft and confidence, display recommendations, review or edit candidate data, and confirm one recommendation or reject all.

**Expected outcome:** The system creates a candidate and an application only when a job title is explicitly selected. Otherwise, it saves a candidate without an application.

### WF-003: Job Title Resume Intake

**Trigger:** User uploads a resume from `/job-title/[id]`.

**Steps:** Validate file, store original, process with the selected job title as context, show extraction and validation results, run deduplication check, and require recruiter confirmation.

**Expected outcome:** The system creates or reuses a candidate and creates an application for the selected job title with its initial status.

### WF-004: Monitor Pipeline

**Trigger:** User opens a job title detail page.

**Steps:** Search or filter candidates, open the action menu, select a valid status, and confirm the change.

**Expected outcome:** The table reflects the new application status and a status history record is created.

## 7. Domain Rules

- `Candidate` is a person profile and may have multiple applications.
- `Application` is the relationship between one candidate and one job title.
- Application status belongs to the application, not to the global candidate profile.
- A candidate may be `Interview 2` for Finance and `Screening` for Accounting at the same time.
- A recommendation never creates an application automatically.
- Extraction and validation values remain drafts until reviewed or confirmed.
- Candidate deduplication prioritizes email, then phone, then name plus supporting evidence.
- Processing retries are idempotent and must not create duplicate candidates or applications.

## 8. Functional Requirements

### User Management

- `FR-USER-001`: Admin can add a user and assign `Admin` or `Recruiter`.
- `FR-USER-002`: Admin can change a user's role.
- `FR-USER-003`: Admin can activate or deactivate a user.
- `FR-USER-004`: Recruiter cannot access user-management actions.
- `FR-USER-005`: Server-side authorization protects every user-management route or action.

### Job Titles And Applications

- `FR-JOB-001`: The system validates required job title and hiring criteria fields.
- `FR-JOB-002`: Each job title has an independent ordered status list.
- `FR-APP-001`: One candidate may have multiple applications.
- `FR-APP-002`: Application status changes create status history.
- `FR-APP-003`: A candidate without an application can be retained for later review.

### AI And Processing

- `FR-AI-001`: The system supports an OpenAI-compatible custom provider or proxy/router, Gemini API, and DeepSeek API.
- `FR-AI-002`: Internal extraction and validation schemas remain provider-independent.
- `FR-AI-003`: Each AI result stores provider, model, timestamp, and prompt or schema version.
- `FR-AI-004`: Structured AI output is schema-validated before persistence.
- `FR-AI-005`: Provider failure is visible as `Failed` and can be retried without duplication.

## 9. Non-Functional Requirements

- **Security:** Resume files are private; access uses authorization and short-lived signed URLs or protected endpoints.
- **Privacy:** Personal data sent to external providers follows organizational policy. Age and address must not be used for scoring without explicit policy.
- **Reliability:** Processing jobs are asynchronous, observable, retryable, and idempotent.
- **Performance:** Candidate lists are paginated; uploads do not block the UI while OCR or AI runs.
- **Accessibility:** Forms, tables, dialogs, menus, and upload controls support keyboard and screen-reader usage.
- **Auditability:** Changes to candidates, applications, statuses, documents, AI configuration, and user access are attributable.
- **Portability:** The internal data contract does not depend on provider-specific output.

## 10. Technology Constraints

- Framework: Next.js.
- UI: shadcn/ui.
- Styling: Tailwind CSS.
- Database: PostgreSQL.
- File storage: Google Cloud Storage.
- AI providers: OpenAI-compatible custom provider or proxy/router, Gemini API, and DeepSeek API.
- OCR: PDF text extraction first, with a free local OCR option such as Tesseract for scanned files.
- Python may be used for document processing or OCR workers when appropriate.

## 11. MVP Non-Goals

- External job board integrations.
- Candidate self-service portal.
- Automated email, WhatsApp, or calendar workflows.
- Payroll or employee onboarding.
- Automatic rejection, hiring, or ranking-based final decisions.
- Model fine-tuning.
- Multi-tenant billing and subscription management.
- Advanced recruitment analytics.

## 12. Acceptance Criteria

- `AC-001`: An Admin can add another user and assign either supported role.
- `AC-002`: A Recruiter cannot add users or change user roles, even by directly calling a protected server action.
- `AC-003`: A user can create a job title with job description, competency, minimum experience, and minimum education.
- `AC-004`: A user can configure statuses independently for each job title.
- `AC-005`: A user can upload a PDF or DOCX from general intake and from a job title detail page.
- `AC-006`: The original resume is stored privately and processing status is visible.
- `AC-007`: The system produces structured candidate fields and marks uncertain or missing values.
- `AC-008`: AI validation returns structured output with confidence and evidence without silently overwriting confirmed data.
- `AC-009`: The system returns job title recommendations with explanation and gaps.
- `AC-010`: No application is created from a recommendation until a recruiter explicitly confirms a job title.
- `AC-011`: `/job-title/[id]` shows candidate name, age when available, total experience, and application status.
- `AC-012`: A user can change application status from the table and the system records status history.
- `AC-013`: A user can edit and delete candidate data according to authorization rules.
- `AC-014`: One candidate can have different application statuses for different job titles.
- `AC-015`: OCR or provider failures are visible, retryable, and do not create duplicate records.
- `AC-016`: The system prevents deactivation or deletion of the last active Admin without a replacement.

## 13. Risks And Mitigations

| Risk | Mitigation |
|---|---|
| OCR misreads scanned resumes | Confidence, evidence, and mandatory review for important fields |
| AI fabricates information | Structured output, evidence, schema validation, and manual confirmation |
| Provider outage or cost spike | Provider abstraction, bounded retries, optional fallback, and usage logging |
| Recommendation bias | Human confirmation, restricted scoring fields, and periodic review |
| Duplicate candidates | Contact matching, manual review, and later merge workflow |
| Resume data exposure | Private bucket, short-lived signed URLs, authorization, and audit log |

## 14. Open Decisions

1. Is the MVP single-tenant or multi-tenant?
2. What are the maximum file size and batch upload limits?
3. Is age or date of birth display-only, or may it influence recommendations?
4. Which fields must be removed or masked before external AI processing?
5. Is an unassigned candidate pool required in the MVP?
6. Are status transitions constrained, for example preventing `Hired` to `Screening`?
7. What retention and recovery policy applies to resumes?
8. Which provider is the default, and when is fallback allowed?
9. Is page-level evidence required for every important extracted field?

## 15. Recommended Delivery Order

1. Domain model and database schema for users, job titles, statuses, candidates, applications, and resume documents.
2. User authentication, role-based authorization, and Admin user management.
3. Job title CRUD and custom statuses.
4. Private resume upload and document metadata.
5. Processing state machine, text extraction, and OCR fallback.
6. Provider adapters, structured extraction, validation, and evidence.
7. Recommendation review and recruiter confirmation.
8. Job title detail page, candidate table, filters, and status changes.
9. Candidate editing, deletion, audit history, retry hardening, and security review.
