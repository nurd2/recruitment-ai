"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import {
  autofillJobTitleAction,
  createJobTitleAction,
  updateJobTitleAction,
} from "@/app/actions/job-titles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { EDUCATION_LEVELS, normalizeEducationLevel } from "@/lib/education";
import { delayDialogClose } from "@/lib/utils";
import { WORK_ARRANGEMENTS } from "@/lib/work-arrangement";
import { toast } from "sonner";

const WORK_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Freelance",
  "Internship",
  "Temporary",
  "Volunteer",
] as const;

type Initial = {
  title: string;
  description: string;
  competencies: { name: string; required: boolean }[];
  minYearsExperience: number;
  minEducation: string;
  location: string;
  workType: string;
  workArrangement: string;
  language: string;
};

export function JobTitleForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: Initial;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [competencies, setCompetencies] = useState(
    (initial?.competencies ?? []).map((c) => `${c.name}${c.required ? " *" : ""}`).join("\n"),
  );
  const [minYearsExperience, setMinYearsExperience] = useState(
    String(initial?.minYearsExperience ?? 0),
  );
  const [minEducation, setMinEducation] = useState(
    normalizeEducationLevel(initial?.minEducation) ?? "",
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [workType, setWorkType] = useState(initial?.workType ?? "");
  const [workArrangement, setWorkArrangement] = useState(initial?.workArrangement ?? "");
  const [language, setLanguage] = useState(initial?.language ?? "");
  const [customPrompt, setCustomPrompt] = useState(
    "Focus on practical requirements and make the criteria suitable for a modern hiring team.",
  );

  async function onAutofill() {
    if (!title.trim()) return;
    setAutofillLoading(true);
    const res = await autofillJobTitleAction({ title, prompt: customPrompt });
    if (!res.ok) {
      toast.error(res.error);
      setAutofillLoading(false);
      return;
    }
    const result = res.data!;
    setDescription(result.description);
    setCompetencies(
      result.competencies.map((c) => `${c.name}${c.required ? " *" : ""}`).join("\n"),
    );
    setMinYearsExperience(String(result.minYearsExperience));
    setMinEducation(normalizeEducationLevel(result.minEducation) ?? result.minEducation);
    setLocation(result.location);
    setWorkType(result.workType);
    setWorkArrangement(result.workArrangement);
    setLanguage(result.language);
    await delayDialogClose();
    setPromptOpen(false);
    setAutofillLoading(false);
    toast.success("Job criteria filled by AI. Review before saving.");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const parsedCompetencies = String(form.get("competencies") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        name: line.replace(/\s*\*$/, "").trim(),
        required: line.endsWith("*"),
      }));
    const input = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      competencies: parsedCompetencies,
      minYearsExperience: Number(form.get("minYearsExperience") ?? 0) || 0,
      minEducation: String(form.get("minEducation") ?? ""),
      location: String(form.get("location") ?? ""),
      workType: String(form.get("workType") ?? ""),
      workArrangement: String(form.get("workArrangement") ?? ""),
      language: String(form.get("language") ?? ""),
    };
    const res =
      mode === "create"
        ? await createJobTitleAction(input)
        : await updateJobTitleAction(id!, input);
    if (!res.ok) {
      toast.error(res.error);
      setLoading(false);
      return;
    }
    toast.success(mode === "create" ? "Job title created." : "Job title updated.");
    router.push(`/job-title/${mode === "create" ? res.data!.id : id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Frontend Engineer"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Job description</Label>
        <div className="relative">
          <Textarea
            id="description"
            name="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={title.trim() ? "pb-12" : undefined}
          />
          {title.trim() ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={autofillLoading}
              onClick={() => setPromptOpen(true)}
              className="absolute right-2 bottom-2"
            >
              <Sparkles className="size-4" />
              {autofillLoading ? "Filling…" : "Auto-fill with AI"}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="competencies">
          Required competencies / skills
          <span className="ml-2 font-normal text-muted-foreground">
            (one per line, append &quot;*&quot; for required)
          </span>
        </Label>
        <Textarea
          id="competencies"
          name="competencies"
          rows={4}
          value={competencies}
          onChange={(e) => setCompetencies(e.target.value)}
          placeholder={"React *\nTypeScript *\nCSS"}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="minYearsExperience">Minimum years of experience</Label>
          <Input
            id="minYearsExperience"
            name="minYearsExperience"
            type="number"
            min={0}
            step={0.5}
            value={minYearsExperience}
            onChange={(e) => setMinYearsExperience(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="minEducation">Minimum education</Label>
          <Select
            name="minEducation"
            value={minEducation}
            onValueChange={(value) => setMinEducation(value ?? "")}
          >
            <SelectTrigger id="minEducation" className="w-full">
              <SelectValue placeholder="No minimum education" />
            </SelectTrigger>
            <SelectContent>
              {EDUCATION_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value} label={level.label}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Jakarta (hybrid)"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="workType">Work type</Label>
          <Select
            name="workType"
            value={workType}
            onValueChange={(value) => setWorkType(value ?? "")}
          >
            <SelectTrigger id="workType" className="w-full">
              <SelectValue placeholder="Select work type">
                {(value) => value || "Select work type"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WORK_TYPES.map((value) => (
                <SelectItem key={value} value={value} label={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="workArrangement">Work arrangement</Label>
          <Select
            name="workArrangement"
            value={workArrangement}
            onValueChange={(value) => setWorkArrangement(value ?? "")}
          >
            <SelectTrigger id="workArrangement" className="w-full">
              <SelectValue placeholder="Select work arrangement">
                {(value) => value || "Select work arrangement"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WORK_ARRANGEMENTS.map((value) => (
                <SelectItem key={value} value={value} label={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="language">Language requirements</Label>
          <Input
            id="language"
            name="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="English, Indonesian"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : mode === "create" ? "Create job title" : "Save changes"}
        </Button>
      </div>
      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-fill job criteria</DialogTitle>
            <DialogDescription>
              Tell the AI what to prioritize. It will draft the fields for your review.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="customPrompt">Custom prompt</Label>
            <Textarea
              id="customPrompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="e.g. Prioritize senior frontend architecture, accessibility, and remote work."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPromptOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={onAutofill} disabled={autofillLoading}>
              <Sparkles className="size-4" />
              {autofillLoading ? "Filling…" : "Generate criteria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
