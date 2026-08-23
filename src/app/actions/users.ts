"use server";

import { and, count, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { runAction } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().trim().max(300),
  password: z.string().min(8).max(200),
  role: z.enum(["admin", "recruiter"]),
});

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "recruiter"]),
});

const activeSchema = z.object({
  userId: z.string().min(1),
  active: z.boolean(),
});

const deleteUserSchema = z.object({
  userId: z.string().min(1),
});

async function countActiveAdmins(): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(user)
    .where(and(eq(user.role, "admin"), eq(user.banned, false)));
  return rows[0]?.n ?? 0;
}

async function guardLastAdmin(targetId: string): Promise<void> {
  const [target] = await db
    .select({ id: user.id, role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, targetId));
  if (!target || target.role !== "admin" || target.banned) return;
  const activeAdmins = await countActiveAdmins();
  if (activeAdmins <= 1) {
    throw new Error(
      "LAST_ADMIN: you cannot deactivate, demote, or delete the last active Admin without an Admin replacement.",
    );
  }
}

export async function createUserAction(input: z.infer<typeof createUserSchema>) {
  return runAction(async () => {
    await requireAdmin();
    const parsed = createUserSchema.parse(input);
    const created = await auth.api.createUser({
      body: {
        name: parsed.name,
        email: parsed.email,
        password: parsed.password,
        // Type-only cast: the admin plugin's inferred role union is narrower
        // than the text column it writes to; any role string is accepted.
        role: parsed.role as "user" | "admin",
      },
      headers: await headers(),
    });
    const actor = await requireAdmin();
    await recordAudit({
      actorId: actor.id,
      action: "user.create",
      entityType: "user",
      entityId: created.user.id,
      after: { email: created.user.email, role: created.user.role },
    });
    return { userId: created.user.id };
  });
}

export async function changeRoleAction(input: z.infer<typeof roleSchema>) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const parsed = roleSchema.parse(input);
    await guardLastAdmin(parsed.userId);
    await auth.api.setRole({
      body: {
        userId: parsed.userId,
        role: parsed.role as "user" | "admin",
      },
      headers: await headers(),
    });
    await recordAudit({
      actorId: actor.id,
      action: "user.change_role",
      entityType: "user",
      entityId: parsed.userId,
      after: { role: parsed.role },
    });
    return { userId: parsed.userId };
  });
}

export async function setUserActiveAction(input: z.infer<typeof activeSchema>) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const parsed = activeSchema.parse(input);
    if (!parsed.active) {
      await guardLastAdmin(parsed.userId);
      await auth.api.banUser({
        body: {
          userId: parsed.userId,
          banReason: "Deactivated by admin",
          banExpiresIn: 1000 * 60 * 60 * 24 * 365 * 100,
        },
        headers: await headers(),
      });
    } else {
      await auth.api.unbanUser({
        body: { userId: parsed.userId },
        headers: await headers(),
      });
    }
    await recordAudit({
      actorId: actor.id,
      action: parsed.active ? "user.activate" : "user.deactivate",
      entityType: "user",
      entityId: parsed.userId,
      after: { active: parsed.active },
    });
    return { userId: parsed.userId };
  });
}

export async function deleteUserAction(input: z.infer<typeof deleteUserSchema>) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const parsed = deleteUserSchema.parse(input);
    await guardLastAdmin(parsed.userId);
    await auth.api.removeUser({
      body: { userId: parsed.userId },
      headers: await headers(),
    });
    await recordAudit({
      actorId: actor.id,
      action: "user.delete",
      entityType: "user",
      entityId: parsed.userId,
    });
    return { userId: parsed.userId };
  });
}
