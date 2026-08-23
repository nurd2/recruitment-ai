# Recruitment Monitoring Context

The recruitment context is where hiring needs (Job Titles), candidate resumes, AI-assisted extraction, and applications are managed. It owns the Candidate, Application, and pipeline vocabulary.

## Language

**Candidate**:
A person profile built from one or more Resume Documents, or entered directly by a recruiter through manual intake. A resume-based Candidate exists only after a recruiter reviews and confirms a Processing Result (draft); a manual Candidate has no Resume Document unless one is added later.
_Avoid_: Applicant, prospect, contact

**Application**:
The relationship between one Candidate and one Job Title, carrying its own current status and status history.
_Avoid_: Application record (as in a job application form)

**Job Title**:
A hiring need with criteria (description, competencies, minimum experience/education, location, work type) and its own ordered status pipeline.
_Avoid_: Role, position

**Application Status**:
A named stage in a Job Title's pipeline (for example, Screening) that belongs to the Application, never to the global Candidate profile.

**Resume Document**:
The original uploaded file (PDF or DOCX), stored privately, that produces a Processing Result.
_Avoid_: CV file

**Candidate Source**:
The known channel or origin through which a Candidate was obtained, such as a job portal, referral, agency, manual entry, or direct upload. It belongs to the Candidate's intake provenance and may be unknown. A Resume Document retains only file-level provenance.

**Processing Result**:
The structured draft extracted from a Resume Document: normalized fields plus per-field provenance, confidence, and evidence. This is the single draft entity a recruiter reviews.
_Avoid_: Extraction, Validation (kept as separate entities)

**Processing Job**:
The asynchronous unit of work over one Resume Document, running staged steps (extract → validate → recommend) with an observable state.
_Avoid_: Task, worker job

**Recommendation**:
An AI decision-support suggestion linking a Candidate to a Job Title. A recommendation never creates an Application by itself.
_Avoid_: Match, suggestion

**Confirm**:
The recruiter's explicit action that turns a Processing Result into a Candidate (and, when a Job Title is chosen, an Application). Manual intake creates a Candidate directly and attaches it to the selected Job Title in the same explicit action.
_Avoid_: Accept, approve

**Withdraw**:
Deactivate an Application — removes the candidate from that pipeline while retaining the Candidate and their other applications.
_Avoid_: Remove candidate

**Delete**:
Soft-delete a Candidate and cascade to its applications and resume documents.
_Avoid_: Purge, erase

**Deduplication**:
Matching a new Resume Document against existing Candidates by email, then phone, then name; the recruiter decides reuse versus new.
_Avoid_: Auto-merge, merge

**AI Provider**:
A named integration with one AI vendor (OpenAI, DeepSeek, Gemini, Anthropic, or a custom OpenAI-compatible endpoint) carrying the credentials (API key, model, optional base URL) used for extraction, validation, and recommendations. At most one is the default; a fallback may be enabled. API keys are encrypted at rest and never stored in plaintext.
_Avoid_: AI Config, model setting, AI setting
