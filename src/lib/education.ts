export const EDUCATION_LEVELS = [
  { value: "SD", label: "SD (Sekolah Dasar)", rank: 1 },
  { value: "SMP", label: "SMP (Sekolah Menengah Pertama)", rank: 2 },
  { value: "SMA", label: "SMA / SMK", rank: 3 },
  { value: "D1", label: "D1 (Diploma 1)", rank: 4 },
  { value: "D2", label: "D2 (Diploma 2)", rank: 5 },
  { value: "D3", label: "D3 (Diploma 3)", rank: 6 },
  { value: "D4", label: "D4 (Diploma 4)", rank: 7 },
  { value: "S1", label: "S1 (Sarjana / Bachelor)", rank: 8 },
  { value: "S2", label: "S2 (Magister / Master)", rank: 9 },
  { value: "S3", label: "S3 (Doktor / Doctorate)", rank: 10 },
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number]["value"];

const EDUCATION_ALIASES: [EducationLevel, RegExp][] = [
  ["S3", /\b(s3|ph\.?d|doctorate|doctoral|doktor)\b/i],
  ["S2", /\b(s2|master|magister|msc|mba)\b/i],
  ["S1", /\b(s1|bachelor|sarjana|undergraduate|b\.?sc|b\.?a)\b/i],
  ["D4", /\b(d4|diploma\s*iv|sarjana\s+terapan)\b/i],
  ["D3", /\b(d3|diploma\s*iii)\b/i],
  ["D2", /\b(d2|diploma\s*ii)\b/i],
  ["D1", /\b(d1|diploma\s*i)\b/i],
  ["SMA", /\b(sma|smk|high\s+school|secondary\s+school)\b/i],
  ["SMP", /\b(smp|junior\s+high|middle\s+school)\b/i],
  ["SD", /\b(sd|sekolah\s+dasar|elementary\s+school|primary\s+school)\b/i],
];

export function normalizeEducationLevel(value?: string | null): EducationLevel | null {
  if (!value?.trim()) return null;
  for (const [level, pattern] of EDUCATION_ALIASES) {
    if (pattern.test(value)) return level;
  }
  return null;
}

export function educationRank(value?: string | null): number | null {
  const level = normalizeEducationLevel(value);
  return EDUCATION_LEVELS.find((item) => item.value === level)?.rank ?? null;
}

export function highestEducationLevel(
  education: { degree?: string; field?: string }[] = [],
): EducationLevel | null {
  return education
    .map((entry) => normalizeEducationLevel(`${entry.degree ?? ""} ${entry.field ?? ""}`))
    .map((level) => EDUCATION_LEVELS.find((item) => item.value === level))
    .filter((item): item is (typeof EDUCATION_LEVELS)[number] => Boolean(item))
    .sort((left, right) => right.rank - left.rank)[0]?.value ?? null;
}
