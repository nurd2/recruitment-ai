# Candidate materializes on confirmation (draft = Processing Result)

A Candidate record is created only when a recruiter confirms a reviewed draft (or reuses a deduplicated existing Candidate). Before that, an upload owns a Resume Document + Processing Result (the draft). Extraction and validation were collapsed into a single Processing Result with per-field provenance/confidence/evidence rather than two near-identical entities. This keeps deduplication clean and matches the rule that AI output is always a draft until confirmed.
