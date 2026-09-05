import type { Metadata } from "next";

import { getHolidays, getSlaPolicies } from "@/app/actions/sla";
import { SlaAdmin } from "@/components/app/sla-admin";
import { requireAdminPage } from "@/lib/authz";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SLA & Holiday Calendar",
};

export default async function AdminSlaPage() {
  await requireAdminPage();
  const [policies, holidays] = await Promise.all([getSlaPolicies(), getHolidays()]);
  return <div className="grid max-w-4xl gap-6"><div><h1 className="text-2xl font-semibold tracking-tight">SLA & holiday calendar</h1><p className="text-sm text-muted-foreground">Configure hiring targets and working days used by recruitment reporting.</p></div><SlaAdmin policies={policies} holidays={holidays} /></div>;
}
