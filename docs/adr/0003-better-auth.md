# Better Auth for authentication and authorization

Authentication uses Better Auth (email/password with sign-up disabled, admin plugin for the Admin/Recruiter roles) with the Drizzle adapter and database sessions. It was chosen over Auth.js and managed providers (Clerk/Supabase) because user management must live inside the product (Admin adds users in-app) and it integrates directly with our Drizzle schema. All role checks are re-verified server-side on every action (the UI is never the only layer).
