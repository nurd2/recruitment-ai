"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSelect } from "@/components/app/theme-select";
import type { SessionUser } from "@/lib/authz";
import { ChevronDown } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/job-titles", label: "Job Titles" },
  { href: "/candidates", label: "Candidates" },
  { href: "/processing", label: "Processing" },
];

export function Nav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const linkClass = (href: string) =>
    pathname === href ||
    (href !== "/" &&
      (pathname.startsWith(`${href}/`) ||
        (href === "/job-titles" && pathname.startsWith("/job-title/"))))
      ? "rounded-full bg-muted px-3 py-1.5 font-medium text-foreground"
      : "rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground";
  const adminActive = pathname.startsWith("/admin/");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Recruit
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
          {user.role === "admin" ? (
            <Link href="/upload" className={linkClass("/upload")}>
              Upload CV
            </Link>
          ) : null}
          {user.role === "admin" ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" />}
                className={
                  adminActive
                    ? "rounded-full bg-muted px-3 py-1.5 font-medium text-foreground"
                    : "rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
                }
              >
                Admin
                <ChevronDown className="ml-1 size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem render={<Link href="/admin/users" />}>
                  User management
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/admin/ai" />}>AI Provider</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
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
