import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export type Role = "admin" | "recruiter";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
};

/**
 * Every server action / route handler that touches sensitive data MUST call
 * one of these guards. The UI is never the only layer of authorization.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const user = session.user as unknown as SessionUser;
  if (user.banned) return null;
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("UNAUTHORIZED");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) {
    throw new AuthError("FORBIDDEN");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("admin");
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
