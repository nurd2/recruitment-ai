import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/authz";
import { Nav } from "@/components/app/nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Nav user={user} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center border-b px-4 sm:px-6">
            <SidebarTrigger />
          </header>
          <div className="w-full flex-1 px-4 py-6 pb-12 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
