"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { editCandidateAction } from "@/app/actions/applications";
import { CandidateProfileFields } from "@/components/app/candidate-profile-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CANDIDATE_SOURCE_LABELS, RESUME_SOURCES, type CandidateSource } from "@/lib/resume-sources";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CandidateEditForm({
  candidateId,
  initial,
}: {
  candidateId: string;
  initial: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    location: string;
    profileSummary: string;
    source: string | null;
    education: {
      institution: string;
      degree?: string;
      field?: string;
      startYear?: number;
      endYear?: number;
    }[];
    workExperience: {
      company: string;
      title: string;
      startDate?: string;
      endDate?: string;
      description?: string;
    }[];
    skills: string[];
    certifications: string[];
    languages: string[];
    links: string[];
    totalYearsExperience: number;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [education, setEducation] = useState(initial.education);
  const [workExperience, setWorkExperience] = useState(initial.workExperience);
  const [source, setSource] = useState<CandidateSource | "">(
    initial.source && RESUME_SOURCES.includes(initial.source as CandidateSource)
      ? (initial.source as CandidateSource)
      : "",
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const split = (key: string) =>
      String(form.get(key) ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

    const fields = {
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
    };

    const res = await editCandidateAction(candidateId, fields);
    if (!res.ok) {
      toast.error(res.error);
      setLoading(false);
      return;
    }
    toast.success("Candidate updated.");
    router.push(`/candidates/${candidateId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" defaultValue={initial.fullName} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={initial.email} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={initial.phone} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={initial.dateOfBirth}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={initial.location} />
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
            defaultValue={initial.totalYearsExperience}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="profileSummary">Profile summary</Label>
        <Textarea
          id="profileSummary"
          name="profileSummary"
          rows={4}
          defaultValue={initial.profileSummary}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="skills">Skills (comma separated)</Label>
          <Input id="skills" name="skills" defaultValue={initial.skills.join(", ")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="languages">Languages</Label>
          <Input id="languages" name="languages" defaultValue={initial.languages.join(", ")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="certifications">Certifications</Label>
          <Input
            id="certifications"
            name="certifications"
            defaultValue={initial.certifications.join(", ")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="links">Links</Label>
          <Input id="links" name="links" defaultValue={initial.links.join(", ")} />
        </div>
      </div>
      <CandidateProfileFields
        education={education}
        workExperience={workExperience}
        onEducationChange={setEducation}
        onWorkExperienceChange={setWorkExperience}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
