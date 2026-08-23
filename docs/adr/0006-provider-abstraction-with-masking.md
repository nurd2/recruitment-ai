# Provider-abstracted AI with PII masking and decision-support scoring

All AI goes through a provider abstraction (OpenAI-compatible, DeepSeek, Gemini) with a provider-independent internal schema, zod-validated structured output, and provider/model metadata stored per result. Address, date-of-birth/age, and phone are masked before text leaves the server (configurable per provider); age and address never influence recommendation scoring. OpenAI-compatible is the default provider; fallback runs only when an admin enables it. This protects against provider lock-in and misuse of sensitive data.
