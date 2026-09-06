# Recruitment Monitoring Context

The recruitment context is where hiring needs (Job Titles), candidate resumes, AI-assisted extraction, and applications are managed. It owns the Candidate, Application, and pipeline vocabulary.

## Language

**Candidate**:
A person profile built from one or more Resume Documents, or entered directly through manual intake. A resume-based Candidate exists only after an administrator reviews and confirms a Processing Result (draft); a manual Candidate has no Resume Document unless one is added later.
_Avoid_: Applicant, prospect, contact

**Application**:
The relationship between one Candidate and one Job Title for one recruitment cycle, carrying its own current status, status history, and (when applicable) a Hired fact.
_Avoid_: Application record (as in a job application form)

**Hired Date**:
The business date on which an Application was actually hired. It is entered by HR when the Application moves to Hired and is distinct from the timestamp when the status was recorded.

**Hire Fact**:
A historical Hired Date attached to an Application. Moving the Application away from Hired does not erase the fact; an explicit hire cancellation is required to exclude it from SLA history.

**Recruitment Cycle**:
One attempt to recruit a Candidate for a Job Title. A rehire after withdrawal starts a new cycle rather than reactivating the prior cycle.

**Job Title**:
A hiring need with criteria (description, competencies, minimum experience/education, location, work type), a grade, a recruitment start date, and its own ordered status pipeline.
_Avoid_: Role, position

**Unassigned Application**:
An Application retained as Candidate history after its Job Title is removed. It has no Job Title or Application Status and is not part of an active pipeline or any dashboard calculation.

**Grade**:
The organizational hiring level assigned to a Job Title, such as staff or manager. A Grade has an SLA Policy.

**SLA Policy**:
The working-day target associated with a Grade. It defines how long a recruitment should take.

**Working Day**:
A Monday-Friday calendar day that is not listed as a national holiday or collective leave. For SLA elapsed time, Recruitment Start Date is day zero and hold periods are excluded.

**Recruitment Start Date**:
The date from which a Job Title's recruitment SLA begins. Existing Job Titles use their creation date.

**Holiday Calendar**:
The shared Indonesian calendar of national holidays and collective leave excluded from Working Day calculations.

**Application Status**:
A named stage in a Job Title's pipeline (for example, Screening) that belongs to the Application, never to the global Candidate profile.

**Pre-Joining Withdrawal**:
An explicit withdrawal outcome for an Application after a Hired fact but before joining. It reduces currently fulfilled headcount, while the historical Hired fact remains in SLA results.

**Required Headcount**:
The number of people a Job Title needs. Changes are effective-dated so historical dashboard snapshots use the requirement known at that cutoff.

**Job Title Lifecycle**:
The operational state of a Job Title: Active, On Hold, or Fulfilled. Hold periods stop the SLA clock; lifecycle history is effective-dated for historical reporting.

**Resume Document**:
The original uploaded file (PDF or DOCX), stored privately, that produces a Processing Result.
_Avoid_: CV file

**Candidate Source**:
The known channel or origin through which a Candidate was obtained, such as a job portal, referral, agency, manual entry, or direct upload. It belongs to the Candidate's intake provenance and may be unknown. A Resume Document retains only file-level provenance.

**Processing Result**:
The structured draft extracted from a Resume Document: normalized fields plus per-field provenance, confidence, and evidence. This is the single draft entity an administrator reviews.
_Avoid_: Extraction, Validation (kept as separate entities)

**Processing Job**:
The asynchronous unit of work over one Resume Document, running staged steps (extract → validate → recommend) with an observable state.
_Avoid_: Task, worker job

**Recommendation**:
An AI decision-support suggestion linking a Candidate to a Job Title. A recommendation never creates an Application by itself.
_Avoid_: Match, suggestion

**Confirm**:
An administrator's explicit action that turns a Processing Result into a Candidate (and, when a Job Title is chosen, an Application). Manual intake creates a Candidate directly and attaches it to the selected Job Title in the same explicit action.
_Avoid_: Accept, approve

**Withdraw**:
Deactivate an Application — removes the candidate from that pipeline while retaining the Candidate and their other applications.
_Avoid_: Remove candidate

**Withdrawal Date**:
The business date on which an Application was actually withdrawn, selected by an administrator. It is distinct from the system timestamp recording when the withdrawal was processed.

**Delete**:
Soft-delete a Candidate and cascade to its applications and resume documents.
_Avoid_: Purge, erase

**Remove Job Title**:
Soft-delete a Job Title and treat it as permanently unavailable. Its Applications remain as unassigned Candidate history, while Job Title-specific operational data is removed and audit history is retained.

**Deduplication**:
Matching a new Resume Document against existing Candidates by email, then phone, then name; the administrator decides reuse versus new.
_Avoid_: Auto-merge, merge

**AI Provider**:
A named integration with one AI vendor (OpenAI, DeepSeek, Gemini, Anthropic, or a custom OpenAI-compatible endpoint) carrying the credentials (API key, model, optional base URL) used for extraction, validation, and recommendations. At most one is the default; a fallback may be enabled. API keys are encrypted at rest and never stored in plaintext.
_Avoid_: AI Config, model setting, AI setting
