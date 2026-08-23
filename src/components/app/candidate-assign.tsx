"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  assignCandidateToJobTitleAction,
  suggestMatchesForCandidateAction,
} from "@/app/actions/applications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Suggestion = {
  jobTitleId: string;
  jobTitle: string;
  score: number | null;
  explanation: string | null;
  matchedCompetencies: string[];
  experienceFit: string;
  educationFit: string;
  unmetRequirements: string[];
};

export function CandidateAssign({
  candidateId,
  availableJobTitles,
}: {
  candidateId: string;
  availableJobTitles: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [selectedJobTitleId, setSelectedJobTitleId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  async function assign(jobTitleId: string) {
    setAssigning(jobTitleId);
    const res = await assignCandidateToJobTitleAction({ candidateId, jobTitleId });
    setAssigning(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Candidate assigned to job title.");
    router.refresh();
  }

  async function suggest() {
    setSuggesting(true);
    const res = await suggestMatchesForCandidateAction(candidateId);
    setSuggesting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setSuggestions(res.data!.recommendations);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selectedJobTitleId ?? ""}
          onValueChange={(value) => setSelectedJobTitleId(value ?? null)}
        >
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder="Choose a job title">
              {availableJobTitles.find((t) => t.id === selectedJobTitleId)?.title}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableJobTitles.map((t) => (
              <SelectItem key={t.id} value={t.id} label={t.title}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          disabled={!selectedJobTitleId || assigning !== null}
          onClick={() => selectedJobTitleId && assign(selectedJobTitleId)}
        >
          {assigning === selectedJobTitleId ? "Assigning…" : "Assign"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={suggesting}
          onClick={suggest}
        >
          {suggesting ? "Matching…" : "Suggest matches"}
        </Button>
      </div>

      {availableJobTitles.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No active job titles are available.
        </p>
      ) : null}

      {suggestions ? (
        suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No job titles matched this candidate.
          </p>
        ) : (
          <div className="grid gap-2">
            {suggestions.map((s) => (
              <div key={s.jobTitleId} className="grid gap-1 rounded-2xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{s.jobTitle}</span>
                    <Badge variant="secondary">
                      {(s.score ?? 0).toFixed(2)} score
                    </Badge>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={assigning !== null}
                    onClick={() => assign(s.jobTitleId)}
                  >
                    {assigning === s.jobTitleId ? "Assigning…" : "Assign"}
                  </Button>
                </div>
                {s.explanation ? (
                  <span className="text-sm text-muted-foreground">
                    {s.explanation}
                  </span>
                ) : null}
                {s.unmetRequirements.length > 0 ? (
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    Gaps: {s.unmetRequirements.join(", ")}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
