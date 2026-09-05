import { and, asc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { jobTitleStatuses, jobTitles } from "@/db/schema";
import { JobTitleForm } from "@/components/app/job-title-form";
import { StatusEditor } from "@/components/app/status-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/authz";
import { getSlaPolicies } from "@/app/actions/sla";

export const dynamic = "force-dynamic";

export default async function EditJobTitlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [title] = await db
    .select()
    .from(jobTitles)
    .where(and(eq(jobTitles.id, id), isNull(jobTitles.deletedAt)));
  if (!title) notFound();

  const statuses = await db
    .select()
    .from(jobTitleStatuses)
    .where(and(eq(jobTitleStatuses.jobTitleId, id), eq(jobTitleStatuses.active, true)))
    .orderBy(asc(jobTitleStatuses.position));
  const policies = await getSlaPolicies();

  return (
    <div className="grid max-w-2xl gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit job title</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <JobTitleForm
            mode="edit"
            id={id}
            initial={{
              title: title.title,
              openings: title.openings,
              grade: title.grade,
              recruitmentStartDate: title.recruitmentStartDate ?? title.createdAt.toISOString().slice(0, 10),
              slaWorkingDays: title.slaWorkingDays,
              description: title.description ?? "",
              competencies: title.competencies ?? [],
              minYearsExperience: title.minYearsExperience,
              minEducation: title.minEducation ?? "",
              location: title.location ?? "",
              workType: title.workType ?? "",
              workArrangement: title.workArrangement ?? "",
              language: title.language ?? "",
              lifecycleStatus: title.lifecycleStatus,
            }}
            policies={policies}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Application status pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusEditor jobTitleId={id} statuses={statuses} />
        </CardContent>
      </Card>
    </div>
  );
}
