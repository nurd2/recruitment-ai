"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { ThemeSelect } from "@/components/app/theme-select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { SessionUser } from "@/lib/authz";
import {
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  FileSearch,
  LayoutDashboard,
  LogOut,
  Upload,
  UserRound,
  Users,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/job-titles", label: "Job Titles", icon: BriefcaseBusiness },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/processing", label: "Processing", icon: FileSearch },
];

export function Nav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/" &&
      (pathname.startsWith(`${href}/`) ||
        (href === "/job-titles" && pathname.startsWith("/job-title/"))));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/"
              aria-label="Recruit home"
              title="Recruit"
              className="flex h-14 w-full items-center group-data-[collapsible=icon]:justify-center"
            >
              <Image
                src="/logo-recruit.png"
                alt="Recruit"
                width={260}
                height={80}
                className="h-20 w-auto group-data-[collapsible=icon]:hidden"
                priority
              />
              <Image
                src="/logo-r.png"
                alt=""
                width={48}
                height={48}
                className="hidden size-10 object-contain group-data-[collapsible=icon]:block"
                priority
              />
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    render={<Link href={link.href} />}
                    isActive={isActive(link.href)}
                    tooltip={link.label}
                  >
                    <link.icon />
                    <span>{link.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {user.role === "admin" ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/upload" />}
                    isActive={isActive("/upload")}
                    tooltip="Upload CV"
                  >
                    <Upload />
                    <span>Upload CV</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {user.role === "admin" ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/admin/users" />}
                    isActive={isActive("/admin/users")}
                    tooltip="User management"
                  >
                    <UserRound />
                    <span>User management</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/admin/ai" />}
                    isActive={isActive("/admin/ai")}
                    tooltip="AI Provider"
                  >
                    <Bot />
                    <span>AI Provider</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/admin/sla" />}
                    isActive={isActive("/admin/sla")}
                    tooltip="SLA & holidays"
                  >
                    <CalendarDays />
                    <span>SLA & holidays</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={`${user.name} (${user.role})`}>
              <UserRound />
              <span>{user.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <ThemeSelect />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={signOutAction}>
              <SidebarMenuButton type="submit" tooltip="Sign out">
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
