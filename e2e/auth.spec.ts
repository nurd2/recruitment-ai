import { expect, test } from "@playwright/test";

/**
 * Smoke test for the core auth + dashboard flow.
 * Requires the seeded dev database (bun run db:migrate && bun run db:seed).
 */
test("admin can sign in and reach the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@recruitment.local");
  await page.getByLabel("Password").fill("admin123!");
  await page.getByRole("button", { name: "Sign in" }).click({ force: true });

  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  await expect(page.getByText("Demo Admin · admin")).toBeVisible();
});

test("a recruiter cannot access admin user management", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("recruiter@recruitment.local");
  await page.getByLabel("Password").fill("recruiter123!");
  await page.getByRole("button", { name: "Sign in" }).click({ force: true });

  await page.goto("/admin/users");
  // Server-side guard returns 404 for non-admins.
  await expect(page.getByRole("heading", { name: "This page couldn't load" })).toBeVisible();
});

test("a recruiter can view candidates but cannot access mutation pages", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("recruiter@recruitment.local");
  await page.getByLabel("Password").fill("recruiter123!");
  await page.getByRole("button", { name: "Sign in" }).click({ force: true });

  await page.goto("/candidates");
  await expect(page.getByRole("heading", { name: "Candidate pool" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Upload CV" })).toHaveCount(0);

  await page.goto("/job-titles/new");
  await expect(page.getByRole("heading", { name: "This page couldn't load" })).toBeVisible();
});
