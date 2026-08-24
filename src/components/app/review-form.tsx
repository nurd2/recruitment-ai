"use client";

import { useState } from "react";
import { useRouter } from "@bprogress/next/app";
import { AlertTriangle, Sparkles } from "lucide-react";

import { confirmReviewAction, rematchRecommendationsAction } from "@/app/actions/review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { CandidateFields, FieldMeta } from "@/db/schema";
import type { DedupMatch } from "@/lib/dedup";
import { ageFromDob } from "@/lib/format";
import { CANDIDATE_SOURCE_LABELS, RESUME_SOURCES, type CandidateSource } from "@/lib/resume-sources";

type Recommendation = {
  id: string;
  jobTitleId: string;
  jobTitle: string;
  score: number | null;
  explanation: string | null;
  matchedCompetencies: string[];
  experienceFit: string | null;
  educationFit: string | null;
  unmetRequirements: string[];
};

export function ReviewForm({
  resumeDocumentId,
  resumeOriginalName,
  resumeMimeType,
  candidateSource,
  jobState,
  ocrUsed,
  fields,
  fieldMeta,
  conflicts,
  fieldsRequiringReview,
  recommendations: initialRecommendations,
  dedupMatches,
  availableJobTitles,
  contextJobTitle,
}: {
  resumeDocumentId: string;
  resumeOriginalName: string;
  resumeMimeType: string;
  candidateSource: string | null;
  jobState: string;
  ocrUsed: boolean;
  fields: CandidateFields;
  fieldMeta: Record<string, FieldMeta>;
  conflicts: { field: string; message: string }[];
  fieldsRequiringReview: string[];
  recommendations: Recommendation[];
  dedupMatches: DedupMatch[];
  availableJobTitles: { id: string; title: string }[];
  contextJobTitle: { id: string; title: string } | null;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(fields.fullName ?? "");
  const [email, setEmail] = useState(fields.email ?? "");
  const [phone, setPhone] = useState(fields.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(fields.dateOfBirth ?? "");
  const [location, setLocation] = useState(fields.location ?? "");
  const [source, setSource] = useState<CandidateSource | "">(
    candidateSource && RESUME_SOURCES.includes(candidateSource as CandidateSource)
      ? (candidateSource as CandidateSource)
      : "",
  );
  const [profileSummary, setProfileSummary] = useState(fields.profileSummary ?? "");
  const [skills, setSkills] = useState((fields.skills ?? []).join(", "));
  const [certifications, setCertifications] = useState((fields.certifications ?? []).join(", "));
  const [languages, setLanguages] = useState((fields.languages ?? []).join(", "));
  const [links, setLinks] = useState((fields.links ?? []).join(", "));
  const [totalYearsExperience, setTotalYearsExperience] = useState(
    fields.totalYearsExperience?.toString() ?? "",
  );
  const [selectedJobTitleId, setSelectedJobTitleId] = useState<string | null>(
    contextJobTitle ? contextJobTitle.id : null,
  );
  const [assignmentMode, setAssignmentMode] = useState<"pool" | "force">(
    contextJobTitle ? "force" : "pool",
  );
  const [dedupChoice, setDedupChoice] = useState<string>(
    dedupMatches.length > 0 ? dedupMatches[0].candidateId : "create",
  );
  const [submitting, setSubmitting] = useState(false);
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [rematching, setRematching] = useState(false);

  const metaFor = (key: string) => fieldMeta[key];

  function splitList(s: string) {
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function buildFields() {
    return {
      fullName: fullName || null,
      email: email || null,
      phone: phone || null,
      dateOfBirth: dateOfBirth || null,
      location: location || null,
      profileSummary: profileSummary || null,
      education: fields.education ?? [],
      workExperience: fields.workExperience ?? [],
      skills: splitList(skills),
      certifications: splitList(certifications),
      languages: splitList(languages),
      links: splitList(links),
      totalYearsExperience:
        totalYearsExperience.trim() === "" || !Number.isFinite(Number(totalYearsExperience))
          ? null
          : Number(totalYearsExperience),
    };
  }

  async function onRematch() {
    setRematching(true);
    const res = await rematchRecommendationsAction({
      resumeDocumentId,
      fields: buildFields(),
    });
    setRematching(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setRecommendations(res.data!.recommendations);
    toast.success("Recommendations re-matched with your edits.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const jobTitleId = contextJobTitle
      ? contextJobTitle.id
      : assignmentMode === "force"
        ? selectedJobTitleId
        : null;
    if (!contextJobTitle && assignmentMode === "force" && !jobTitleId) {
      toast.error("Choose a job title before forcing the assignment.");
      setSubmitting(false);
      return;
    }

    const res = await confirmReviewAction({
      resumeDocumentId,
      fields: buildFields(),
      source: source || null,
      jobTitleId,
      dedupCandidateId: dedupChoice === "create" ? null : dedupChoice,
    });

    if (!res.ok) {
      toast.error(res.error);
      setSubmitting(false);
      return;
    }

    toast.success("Candidate confirmed.");
    if (res.data!.applicationId) {
      router.push(`/job-title/${jobTitleId}`);
    } else {
      router.push("/candidates");
    }
    router.refresh();
  }

  function FieldMetaNote({ field }: { field: string }) {
    const meta = metaFor(field);
    if (!meta) return null;
    // Model may omit a numeric confidence; don't render that as a fake 0%.
    const pct =
      typeof meta.confidence === "number" ? ` (${Math.round(meta.confidence * 100)}%)` : "";
    const warn = meta.status === "needs_review" || (meta.confidence ?? 1) < 0.6;
    return (
      <span className="text-xs text-muted-foreground">
        {warn ? (
          <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-3" />
            {meta.status === "needs_review" ? "needs review" : `low confidence${pct}`}
          </span>
        ) : (
          <span>{`confidence${pct || " n/a"}`}</span>
        )}
        {meta.evidence ? <span className="ml-2">“{meta.evidence.slice(0, 80)}”</span> : null}
      </span>
    );
  }

  const education = fields.education ?? [];
  const workExperience = fields.workExperience ?? [];
  const resumeUrl = `/api/resumes/${resumeDocumentId}/download`;
  const isImage = resumeMimeType.startsWith("image/");
  const isPdf = resumeMimeType === "application/pdf";

  return (
    <div>
      <form onSubmit={onSubmit} className="grid gap-6 pb-8 lg:mr-[calc(min(42vw,25rem)+2rem)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Review candidate</h1>
            <Badge variant={jobState === "needs_review" ? "destructive" : "secondary"}>
              {jobState === "needs_review" ? "Needs review" : "Ready"}
            </Badge>
            {ocrUsed ? <Badge variant="outline">OCR processed</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and correct the extracted data, then confirm. AI output is always a draft until
            you confirm or edit it.
          </p>
        </div>

        {fieldsRequiringReview.length > 0 ? (
          <Card className="border-amber-500/40">
            <CardContent className="grid gap-1  text-sm">
              <p className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" />
                Fields requiring your review
              </p>
              <p className="text-muted-foreground">
                {fieldsRequiringReview.join(", ")} — please verify these before confirming.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {conflicts.length > 0 ? (
          <Card className="border-amber-500/40">
            <CardContent className="grid gap-1  text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">Conflicts detected</p>
              {conflicts.map((c, i) => (
                <p key={i} className="text-muted-foreground">
                  <span className="font-medium">{c.field}:</span> {c.message}
                </p>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Candidate data</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <FieldMetaNote field="fullName" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FieldMetaNote field="email" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <FieldMetaNote field="phone" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dateOfBirth">
                Date of birth
                {dateOfBirth ? (
                  <span className="ml-1 text-muted-foreground">
                    (age {ageFromDob(dateOfBirth) ?? "?"})
                  </span>
                ) : null}
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
              <FieldMetaNote field="dateOfBirth" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
              <FieldMetaNote field="location" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="source">Candidate source</Label>
              <Select
                value={source}
                onValueChange={(value) => setSource((value ?? "") as CandidateSource | "")}
              >
                <SelectTrigger id="source" className="w-full">
                  <SelectValue placeholder="Select source">
                    {source ? CANDIDATE_SOURCE_LABELS[source] : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {RESUME_SOURCES.map((value) => (
                    <SelectItem key={value} value={value} label={CANDIDATE_SOURCE_LABELS[value]}>
                      {CANDIDATE_SOURCE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="totalYearsExperience">Total years of experience</Label>
              <Input
                id="totalYearsExperience"
                type="number"
                min={0}
                step={0.5}
                value={totalYearsExperience}
                onChange={(e) => setTotalYearsExperience(e.target.value)}
              />
              <FieldMetaNote field="totalYearsExperience" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="profileSummary">Profile summary</Label>
              <Textarea
                id="profileSummary"
                rows={3}
                value={profileSummary}
                onChange={(e) => setProfileSummary(e.target.value)}
              />
              <FieldMetaNote field="profileSummary" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="skills">Skills (comma separated)</Label>
              <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="languages">Languages (comma separated)</Label>
              <Input
                id="languages"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="certifications">Certifications</Label>
              <Input
                id="certifications"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="links">Links / portfolio</Label>
              <Input id="links" value={links} onChange={(e) => setLinks(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Education &amp; work experience (read-only draft)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-2 font-medium text-muted-foreground">Education</p>
              {education.length === 0 ? (
                <p className="text-muted-foreground">—</p>
              ) : (
                education.map((ed, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-medium">{ed.institution}</p>
                    <p className="text-muted-foreground">
                      {[ed.degree, ed.field].filter(Boolean).join(" · ")}
                      {ed.startYear ? ` · ${ed.startYear}–${ed.endYear ?? "now"}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div>
              <p className="mb-2 font-medium text-muted-foreground">Work experience</p>
              {workExperience.length === 0 ? (
                <p className="text-muted-foreground">—</p>
              ) : (
                workExperience.map((w, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-medium">{w.title}</p>
                    <p className="text-muted-foreground">
                      {w.company}
                      {w.startDate ? ` · ${w.startDate}–${w.endDate ?? "now"}` : ""}
                    </p>
                    {w.description ? (
                      <p className="mt-0.5 text-muted-foreground">{w.description}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {dedupMatches.length > 0 ? (
          <Card className="border-amber-500/40">
            <CardHeader>
              <CardTitle>Possible duplicate candidate</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="dedup"
                  value="create"
                  checked={dedupChoice === "create"}
                  onChange={() => setDedupChoice("create")}
                />
                Create a new candidate
              </label>
              {dedupMatches.map((m) => (
                <label key={m.candidateId} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="dedup"
                    value={m.candidateId}
                    checked={dedupChoice === m.candidateId}
                    onChange={() => setDedupChoice(m.candidateId)}
                  />
                  Reuse existing candidate “{m.fullName ?? "Unnamed"}” (
                  {m.email ?? m.phone ?? m.candidateId.slice(0, 8)}) — matched by {m.matchedBy}
                </label>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {contextJobTitle ? (
          <Card>
            <CardHeader>
              <CardTitle>Application</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              This upload is for <span className="font-medium">{contextJobTitle.title}</span>.
              Confirming will create an application for this job title with its initial status.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Job title recommendation
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRematch}
                disabled={rematching}
              >
                {rematching ? "Re-matching…" : "Re-match with edits"}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-2">
              <p className="text-sm text-muted-foreground">
                AI recommendations are decision support only. An application is created only when
                you explicitly confirm a job title below. Edited the profile? Re-match to refresh
                the scores.
              </p>
              {recommendations.length === 0 ? (
                <div className="grid gap-3">
                  <p className="text-sm text-muted-foreground">
                    No recommendations matched. Choose where to save this candidate.
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="assignmentMode"
                      className="size-4"
                      checked={assignmentMode === "pool"}
                      onChange={() => {
                        setAssignmentMode("pool");
                        setSelectedJobTitleId(null);
                      }}
                    />
                    Save to candidate pool without an application
                  </label>
                  <div className="grid gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="assignmentMode"
                        className="size-4"
                        checked={assignmentMode === "force"}
                        onChange={() => setAssignmentMode("force")}
                      />
                      Force assign to a job title
                    </label>
                    <Select
                      value={selectedJobTitleId ?? ""}
                      onValueChange={(value) => {
                        setAssignmentMode("force");
                        setSelectedJobTitleId(value ?? null);
                      }}
                    >
                      <SelectTrigger
                        className="w-full sm:w-80"
                        disabled={assignmentMode !== "force"}
                      >
                        <SelectValue placeholder="Choose a job title">
                          {
                            availableJobTitles.find((title) => title.id === selectedJobTitleId)
                              ?.title
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableJobTitles.map((title) => (
                          <SelectItem key={title.id} value={title.id} label={title.title}>
                            {title.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableJobTitles.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No active job titles are available.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  {recommendations.map((r) => (
                    <label
                      key={r.id}
                      className="grid cursor-pointer gap-1 rounded-2xl border p-3 has-checked:border-primary"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="jobTitle"
                          className="size-4"
                          checked={
                            assignmentMode === "force" && selectedJobTitleId === r.jobTitleId
                          }
                          onChange={() => {
                            setAssignmentMode("force");
                            setSelectedJobTitleId(r.jobTitleId);
                          }}
                        />
                        <span className="font-medium">{r.jobTitle}</span>
                        <Badge variant="secondary">{(r.score ?? 0).toFixed(2)} score</Badge>
                      </span>
                      <span className="pl-6 text-sm text-muted-foreground">{r.explanation}</span>
                      {r.unmetRequirements.length > 0 ? (
                        <span className="pl-6 text-sm text-amber-600 dark:text-amber-400">
                          Gaps: {r.unmetRequirements.join(", ")}
                        </span>
                      ) : null}
                    </label>
                  ))}

                  <div className="mt-2 grid gap-2 rounded-2xl border p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="jobTitle"
                        className="size-4"
                        checked={
                          assignmentMode === "force" &&
                          !recommendations.some((r) => r.jobTitleId === selectedJobTitleId)
                        }
                        onChange={() => {
                          setAssignmentMode("force");
                          setSelectedJobTitleId(null);
                        }}
                      />
                      <span className="font-medium">Force assign to another job title</span>
                    </label>
                    <Select
                      value={
                        recommendations.some((r) => r.jobTitleId === selectedJobTitleId)
                          ? ""
                          : (selectedJobTitleId ?? "")
                      }
                      onValueChange={(value) => {
                        setAssignmentMode("force");
                        setSelectedJobTitleId(value ?? null);
                      }}
                    >
                      <SelectTrigger
                        className="w-full sm:w-80"
                        disabled={
                          assignmentMode !== "force" ||
                          recommendations.some((r) => r.jobTitleId === selectedJobTitleId)
                        }
                      >
                        <SelectValue placeholder="Choose another job title">
                          {
                            availableJobTitles.find((title) => title.id === selectedJobTitleId)
                              ?.title
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableJobTitles
                          .filter(
                            (title) => !recommendations.some((r) => r.jobTitleId === title.id),
                          )
                          .map((title) => (
                            <SelectItem key={title.id} value={title.id} label={title.title}>
                              {title.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {availableJobTitles.filter(
                      (title) => !recommendations.some((r) => r.jobTitleId === title.id),
                    ).length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No other active job titles are available.
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "Confirming…"
              : contextJobTitle
                ? "Confirm and create application"
                : selectedJobTitleId
                  ? "Confirm candidate & create application"
                  : "Save candidate only"}
          </Button>
        </div>
      </form>

      <aside className="mt-8 lg:fixed lg:right-6 lg:top-18 lg:bottom-6 lg:mt-0 lg:w-[min(42vw,39rem)]">
        <Card className="flex h-full min-h-128  p-0! gap-0! flex-col overflow-hidden">
          <CardHeader className="shrink-0 border-b p-4! gap-0!">
            <CardTitle className="truncate text-base" title={resumeOriginalName}>
              Candidate resume
            </CardTitle>
            <p className="truncate text-sm text-muted-foreground" title={resumeOriginalName}>
              {resumeOriginalName}
            </p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            {isPdf ? (
              <iframe
                src={resumeUrl}
                title={`Resume preview: ${resumeOriginalName}`}
                className="h-full min-h-112 w-full border-0"
              />
            ) : isImage ? (
              <div className="flex h-full min-h-112 items-start justify-center overflow-auto bg-muted/30 p-4">
                <img
                  src={resumeUrl}
                  alt={`Resume preview: ${resumeOriginalName}`}
                  className="h-auto max-w-full rounded-md border bg-background shadow-sm"
                />
              </div>
            ) : (
              <div className="grid h-full min-h-112 place-content-center gap-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Preview is not available for this file type.
                </p>
                <Button
                  nativeButton={false}
                  render={<a href={resumeUrl} download={resumeOriginalName} />}
                >
                  Download resume
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
