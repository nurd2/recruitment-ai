UPDATE "job_title"
SET
  "work_arrangement" = CASE
    WHEN "location" ~* '\\(hybrid\\)\\s*$' THEN 'Hybrid'
    WHEN "location" ~* '\\(remote\\)\\s*$' THEN 'Remote'
    WHEN "location" ~* '\\((on-site|onsite)\\)\\s*$' THEN 'On-site'
    WHEN "location" ~* '\\(flexible\\)\\s*$' THEN 'Flexible'
  END,
  "location" = regexp_replace(
    "location",
    '\\s*\\((hybrid|remote|on-site|onsite|flexible)\\)\\s*$',
    '',
    'i'
  )
WHERE "work_arrangement" IS NULL
  AND "location" ~* '\\((hybrid|remote|on-site|onsite|flexible)\\)\\s*$';
