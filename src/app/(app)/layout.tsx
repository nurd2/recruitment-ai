import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/authz";
import { Nav } from "@/components/app/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <Nav user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-14">
        {children}
      </main>
    </div>
  );
}
