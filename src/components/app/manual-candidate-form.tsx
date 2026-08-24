"use client";

import { useState } from "react";
import { useRouter } from "@bprogress/next/app";
import { toast } from "sonner";

import { createManualCandidateAction } from "@/app/actions/applications";
import { CandidateProfileFields } from "@/components/app/candidate-profile-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EducationEntry, WorkExperienceEntry } from "@/db/schema";
import { CANDIDATE_SOURCE_LABELS, RESUME_SOURCES, type CandidateSource } from "@/lib/resume-sources";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Match = {
  candidateId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  matchedBy: string;
};

export function ManualCandidateForm({ jobTitleId }: { jobTitleId: string }) {
  const router = useRouter();
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [workExperience, setWorkExperience] = useState<WorkExperienceEntry[]>([]);
  const [source, setSource] = useState<CandidateSource | "">("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [dedupChoice, setDedupChoice] = useState("create");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const split = (key: string) =>
      String(form.get(key) ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    const res = await createManualCandidateAction({
      jobTitleId,
      dedupCandidateId: matches.length && dedupChoice !== "create" ? dedupChoice : undefined,
      forceCreate: matches.length > 0 && dedupChoice === "create",
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      dateOfBirth: String(form.get("dateOfBirth") ?? ""),
      location: String(form.get("location") ?? ""),
      profileSummary: String(form.get("profileSummary") ?? ""),
      source: source || null,
      education,
      workExperience,
      skills: split("skills"),
      certifications: split("certifications"),
      languages: split("languages"),
      links: split("links"),
      totalYearsExperience: Number(form.get("totalYearsExperience") ?? 0) || 0,
    });
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (res.data && "matches" in res.data) {
      setMatches(res.data.matches);
      setDedupChoice("create");
      toast.message("Possible duplicate candidates found. Choose how to continue.");
      return;
    }
    toast.success("Candidate added to the job title.");
    router.push(`/job-title/${jobTitleId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-6">
      <section className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" autoFocus />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="source">Candidate source</Label>
            <Select value={source} onValueChange={(value) => setSource((value ?? "") as CandidateSource | "")}>
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
          <div className="grid gap-2">
            <Label htmlFor="totalYearsExperience">Total years of experience</Label>
            <Input
              id="totalYearsExperience"
              name="totalYearsExperience"
              type="number"
              min={0}
              step={0.5}
              defaultValue={0}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profileSummary">Profile summary</Label>
          <Textarea id="profileSummary" name="profileSummary" rows={4} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="skills">Skills (comma separated)</Label>
            <Input id="skills" name="skills" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="languages">Languages</Label>
            <Input id="languages" name="languages" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="certifications">Certifications</Label>
            <Input id="certifications" name="certifications" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="links">Links (comma separated)</Label>
            <Input id="links" name="links" />
          </div>
        </div>
      </section>
      <CandidateProfileFields
        education={education}
        workExperience={workExperience}
        onEducationChange={setEducation}
        onWorkExperienceChange={setWorkExperience}
      />
      {matches.length > 0 ? (
        <section className="grid gap-3 rounded-xl border border-amber-500/40 p-4">
          <div>
            <h2 className="font-medium">Possible duplicate candidate</h2>
            <p className="text-sm text-muted-foreground">
              Reuse an existing profile or create a new one.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="dedup"
              checked={dedupChoice === "create"}
              onChange={() => setDedupChoice("create")}
            />
            Create a new candidate
          </label>
          {matches.map((match) => (
            <label key={match.candidateId} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="dedup"
                checked={dedupChoice === match.candidateId}
                onChange={() => setDedupChoice(match.candidateId)}
              />
              Reuse {match.fullName || "Unnamed candidate"} (
              {match.email || match.phone || "matched name"}) via {match.matchedBy}
            </label>
          ))}
        </section>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : matches.length > 0 ? "Confirm candidate" : "Add candidate"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
