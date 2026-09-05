import { JobTitleForm } from "@/components/app/job-title-form";
import { requireAdminPage } from "@/lib/authz";

export default async function NewJobTitlePage() {
  await requireAdminPage();
  return (
    <div className="grid max-w-2xl gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create job title</h1>
        <p className="text-sm text-muted-foreground">
          Define hiring criteria. A default status pipeline is created for you.
        </p>
      </div>
      <JobTitleForm mode="create" />
    </div>
  );
}
