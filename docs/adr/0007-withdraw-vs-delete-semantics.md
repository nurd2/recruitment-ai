# Withdraw (deactivate application) vs Delete (soft-delete candidate)

The action menu distinguishes two operations that are easy to conflate: **Withdraw** deactivates a single Application (candidate and other applications retained), while **Delete** soft-deletes the whole Candidate and cascades to its applications and documents. Delete is never a hard purge in the MVP so mistakes can be recovered, and both operations are written to the audit log.
