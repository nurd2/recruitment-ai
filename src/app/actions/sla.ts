"use server";

import { asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { holidayHistory, holidays, slaPolicies } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { runAction } from "@/lib/action-result";
import { holidaySchema, slaPolicySchema } from "@/lib/validation";
import { jakartaDate } from "@/lib/sla";

export async function saveSlaPolicyAction(input: unknown) {
  return runAction(async () => {
    await requireAdmin();
    const parsed = slaPolicySchema.parse(input);
    await db
      .insert(slaPolicies)
      .values(parsed)
      .onConflictDoUpdate({
        target: slaPolicies.grade,
        set: { workingDays: parsed.workingDays, updatedAt: new Date() },
      });
    return parsed;
  });
}

export async function deleteSlaPolicyAction(id: string) {
  return runAction(async () => {
    await requireAdmin();
    await db.delete(slaPolicies).where(eq(slaPolicies.id, id));
    return { id };
  });
}

export async function saveHolidayAction(input: unknown) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const parsed = holidaySchema.parse(input);
    const [holiday] = await db
      .insert(holidays)
      .values(parsed)
      .onConflictDoUpdate({
        target: holidays.date,
        set: { name: parsed.name, type: parsed.type, deletedAt: null, updatedAt: new Date() },
      })
      .returning({ id: holidays.id });
    await db.insert(holidayHistory).values({
      holidayId: holiday.id,
      holidayDate: parsed.date,
      active: true,
      effectiveFrom: jakartaDate(),
      changedBy: actor.id,
    });
    return parsed;
  });
}

export async function deleteHolidayAction(id: string) {
  return runAction(async () => {
    const actor = await requireAdmin();
    const [holiday] = await db.select().from(holidays).where(eq(holidays.id, id));
    if (!holiday) throw new Error("HOLIDAY_NOT_FOUND");
    await db.insert(holidayHistory).values({
      holidayId: id,
      holidayDate: holiday.date,
      active: false,
      effectiveFrom: jakartaDate(),
      changedBy: actor.id,
    });
    await db
      .update(holidays)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(holidays.id, id));
    return { id };
  });
}

export async function importHolidaysAction(year: number) {
  return runAction(async () => {
    const actor = await requireAdmin();
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("INVALID_YEAR");
    const response = await fetch(
      `https://api.kemendesa.link/libur-nasional/api/holidays/${year}.json`,
      {
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) throw new Error("HOLIDAY_API_FAILED");
    const payload = (await response.json()) as {
      data?: Array<{ date: string; name: string; is_cuti_bersama?: boolean }>;
    };
    const rows = (payload.data ?? []).map((holiday) =>
      holidaySchema.parse({
        date: holiday.date,
        name: holiday.name,
        type: holiday.is_cuti_bersama ? "collective_leave" : "national_holiday",
      }),
    );
    for (const row of rows) {
      const [holiday] = await db
        .insert(holidays)
        .values({ ...row, source: "kemendesa" })
        .onConflictDoUpdate({
          target: holidays.date,
          set: {
            name: row.name,
            type: row.type,
            source: "kemendesa",
            deletedAt: null,
            updatedAt: new Date(),
          },
        })
        .returning({ id: holidays.id });
      await db.insert(holidayHistory).values({
        holidayId: holiday.id,
        holidayDate: row.date,
        active: true,
        effectiveFrom: jakartaDate(),
        changedBy: actor.id,
      });
    }
    return { imported: rows.length };
  });
}

export async function getSlaPolicies() {
  return db.select().from(slaPolicies).orderBy(asc(slaPolicies.grade));
}

export async function getHolidays() {
  return db.select().from(holidays).where(isNull(holidays.deletedAt)).orderBy(asc(holidays.date));
}
