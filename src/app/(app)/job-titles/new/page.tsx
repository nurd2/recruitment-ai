import { JobTitleForm } from "@/components/app/job-title-form";
import { requireAdminPage } from "@/lib/authz";
import { getSlaPolicies } from "@/app/actions/sla";

export default async function NewJobTitlePage() {
  await requireAdminPage();
  const policies = await getSlaPolicies();
  return (
    <div className="grid max-w-2xl gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create job title</h1>
        <p className="text-sm text-muted-foreground">
          Define hiring criteria. A default status pipeline is created for you.
        </p>
      </div>
      <JobTitleForm mode="create" policies={policies} />
    </div>
  );
}
