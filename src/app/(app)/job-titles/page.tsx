import Link from "next/link";
import type { Metadata } from "next";
import { desc, isNull } from "drizzle-orm";

import { db } from "@/db";
import { jobTitles } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JOB_TITLE_LIFECYCLE_LABELS } from "@/lib/job-title-status";
import { getSessionUser } from "@/lib/authz";
import { JobTitleActions } from "@/components/app/job-title-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Job Titles",
};

export default async function JobTitlesPage() {
  const user = await getSessionUser();
  const titles = await db
    .select()
    .from(jobTitles)
    .where(isNull(jobTitles.deletedAt))
    .orderBy(desc(jobTitles.createdAt));

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Job titles</h1>
        {user?.role === "admin" ? (
          <Button nativeButton={false} render={<Link href="/job-titles/new" />}>
            Create job title
          </Button>
        ) : null}
      </div>

      {titles.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No job titles yet. Create one to start hiring.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {titles.map((t) => (
            <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="min-w-0">
                      <Link href={`/job-title/${t.id}`} className="hover:underline">
                        {t.title}
                      </Link>
                    </CardTitle>
                    {user?.role === "admin" ? <JobTitleActions id={t.id} title={t.title} /> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {JOB_TITLE_LIFECYCLE_LABELS[t.lifecycleStatus] ?? t.lifecycleStatus}
                    </Badge>
                    <Badge variant="secondary">Needs: {t.openings}</Badge>
                    <Badge variant="secondary">
                      {t.minYearsExperience ? `${t.minYearsExperience} yr` : "—"}
                    </Badge>
                  </div>
                </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground">
                <p className="line-clamp-2">{t.description || "No description"}</p>
                <p>
                  {[t.location, t.workType, t.workArrangement, t.minEducation]
                    .filter(Boolean)
                    .join(" · ") || "No criteria set"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
