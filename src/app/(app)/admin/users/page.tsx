import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { user } from "@/db/schema";
import { requireAdminPage } from "@/lib/authz";
import { UserAdmin, type UserRow } from "@/components/app/user-admin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  let admin;
  try {
    admin = await requireAdminPage();
  } catch {
    notFound();
  }

  const rows = await db.select().from(user).orderBy(asc(user.createdAt));
  const userRows: UserRow[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    banned: u.banned,
    createdAt: u.createdAt,
  }));

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User management</h1>
        <p className="text-sm text-muted-foreground">
          Admin only. Recruiters cannot access this page (server-side enforced).
        </p>
      </div>
      <UserAdmin users={userRows} currentUserId={admin.id} />
    </div>
  );
}
