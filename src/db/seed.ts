import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import {
  account,
  jobTitleStatuses,
  jobTitles,
  slaPolicies,
  user,
} from "@/db/schema";
import { colorForDefaultStatus } from "@/lib/status-colors";

const DEFAULT_STATUSES = [
  "Pending",
  "Screening",
  "Interview 1",
  "Interview 2",
  "Offer",
  "Hired",
  "Rejected",
];

/**
 * Seed demo data (idempotent): an admin, a recruiter, and a demo job title
 * with default statuses.
 *
 *   bun run db:seed
 */
async function seed() {
  await db.insert(slaPolicies).values([
    { grade: "staff", workingDays: 30 },
    { grade: "manager", workingDays: 60 },
  ]).onConflictDoNothing();
  const productionSeed =
    process.env.NODE_ENV === "production" || process.env.SEED_MODE === "production";
  const adminEmail = productionSeed
    ? process.env.SEED_ADMIN_EMAIL
    : (process.env.SEED_ADMIN_EMAIL ?? "admin@recruitment.local");
  const adminPassword = productionSeed
    ? process.env.SEED_ADMIN_PASSWORD
    : (process.env.SEED_ADMIN_PASSWORD ?? "admin123!");
  if (!adminEmail || !adminPassword || adminPassword.length < 8) {
    throw new Error(
      "Production seed requires SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (minimum 8 characters)",
    );
  }
  const recruiterEmail =
    process.env.SEED_RECRUITER_EMAIL ?? "recruiter@recruitment.local";
  const recruiterPassword = process.env.SEED_RECRUITER_PASSWORD ?? "recruiter123!";

  // --- Users ---
  let adminId: string | null = null;
  const [existingAdmin] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, adminEmail));
  if (existingAdmin) {
    adminId = existingAdmin.id;
    console.log(`[seed] admin already exists: ${adminEmail}`);
  } else {
    adminId = nanoid(24);
    const passwordHash = await hashPassword(adminPassword);
    await db.insert(user).values({
      id: adminId,
      name: "Demo Admin",
      email: adminEmail,
      emailVerified: true,
      role: "admin",
    });
    await db.insert(account).values({
      id: nanoid(24),
      accountId: adminId,
      providerId: "credential",
      issuer: "local:credential",
      userId: adminId,
      password: passwordHash,
    });
    console.log(`[seed] created admin ${adminEmail}`);
  }

  if (productionSeed) {
    console.log("[seed] production bootstrap complete (admin only)");
    return;
  }

  let recruiterId: string | null = null;
  const [existingRecruiter] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, recruiterEmail));
  if (existingRecruiter) {
    recruiterId = existingRecruiter.id;
    console.log(`[seed] recruiter already exists: ${recruiterEmail}`);
  } else {
    recruiterId = nanoid(24);
    const passwordHash = await hashPassword(recruiterPassword);
    await db.insert(user).values({
      id: recruiterId,
      name: "Demo Recruiter",
      email: recruiterEmail,
      emailVerified: true,
      role: "recruiter",
    });
    await db.insert(account).values({
      id: nanoid(24),
      accountId: recruiterId,
      providerId: "credential",
      issuer: "local:credential",
      userId: recruiterId,
      password: passwordHash,
    });
    console.log(`[seed] created recruiter ${recruiterEmail}`);
  }

  // --- Demo job title + default statuses ---
  const [existingTitle] = await db
    .select({ id: jobTitles.id })
    .from(jobTitles)
    .where(eq(jobTitles.title, "Frontend Engineer"));
  if (existingTitle) {
    console.log("[seed] demo job title already exists");
  } else {
    const [title] = await db
      .insert(jobTitles)
      .values({
        title: "Frontend Engineer",
        grade: "staff",
        recruitmentStartDate: new Date().toISOString().slice(0, 10),
        slaWorkingDays: 30,
        description:
          "Build and maintain user-facing web applications using React and TypeScript.",
        competencies: [
          { name: "React", required: true },
          { name: "TypeScript", required: true },
          { name: "CSS", required: false },
        ],
        minYearsExperience: 3,
        minEducation: "Bachelor's degree",
        location: "Jakarta",
        workType: "Full-time",
        workArrangement: "Hybrid",
        language: "English, Indonesian",
        createdBy: adminId ?? recruiterId,
      })
      .returning({ id: jobTitles.id });

    for (let i = 0; i < DEFAULT_STATUSES.length; i++) {
      await db.insert(jobTitleStatuses).values({
        jobTitleId: title.id,
        name: DEFAULT_STATUSES[i],
        position: i,
        isDefault: true,
        color: colorForDefaultStatus(DEFAULT_STATUSES[i]),
      });
    }
    console.log(
      `[seed] created demo job title "Frontend Engineer" with ${DEFAULT_STATUSES.length} default statuses`,
    );
  }

  console.log("[seed] done");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  });
