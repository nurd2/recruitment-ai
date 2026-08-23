import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { jobTitles } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function JobTitlesPage() {
  const titles = await db
    .select()
    .from(jobTitles)
    .where(eq(jobTitles.active, true))
    .orderBy(desc(jobTitles.createdAt));

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Job titles</h1>
        <Button nativeButton={false} render={<Link href="/job-titles/new" />}>
          Create job title
        </Button>
      </div>

      {titles.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No active job titles yet. Create one to start hiring.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {titles.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <Link href={`/job-title/${t.id}`} className="hover:underline">
                    {t.title}
                  </Link>
                  <Badge variant="secondary">
                    {t.minYearsExperience ? `${t.minYearsExperience} yr` : "—"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground">
                <p className="line-clamp-2">{t.description || "No description"}</p>
                <p>
                  {[t.location, t.workType, t.workArrangement, t.minEducation].filter(Boolean).join(" · ") ||
                    "No criteria set"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
