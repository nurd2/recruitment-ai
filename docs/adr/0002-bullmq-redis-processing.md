# Redis + BullMQ for asynchronous processing

Document processing runs as one BullMQ job per document with staged steps (extract → validate → recommend), using Redis as the queue backend. A Postgres-backed queue was considered and rejected because BullMQ's retry/backoff and observability fit the required idempotent, retryable processing state machine with less custom code; the Redis dependency is accepted for the MVP.
