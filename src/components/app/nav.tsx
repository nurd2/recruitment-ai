"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeSelect } from "@/components/app/theme-select";
import type { SessionUser } from "@/lib/authz";

const links = [
  { href: "/job-titles", label: "Job Titles" },
  { href: "/upload", label: "Upload CV" },
  { href: "/candidates", label: "Candidates" },
  { href: "/processing", label: "Processing" },
];

export function Nav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const items =
    user.role === "admin"
      ? [
          ...links,
          { href: "/admin/users", label: "Admin" },
          { href: "/admin/ai", label: "AI Provider" },
        ]
      : links;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Recruit
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {items.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname === l.href || pathname.startsWith(`${l.href}/`)
                  ? "rounded-full bg-muted px-3 py-1.5 font-medium text-foreground"
                  : "rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <ThemeSelect />
          <span className="hidden text-muted-foreground sm:inline">
            {user.name} · {user.role}
          </span>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
