import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { betterAuth } from "better-auth";

import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // Better Auth looks up models by name ("user", "session", ...); map them
    // to the table objects in our schema.
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // No self-registration: an Admin provisions users (FR-USER-001).
    disableSignUp: true,
  },
  plugins: [
    admin({
      defaultRole: "recruiter" as const,
      adminRoles: ["admin"] as const,
      bannedUserMessage: "This account has been deactivated by an administrator.",
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
