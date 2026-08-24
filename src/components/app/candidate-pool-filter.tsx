"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CANDIDATE_SOURCE_LABELS,
  RESUME_SOURCES,
  type CandidateSource,
} from "@/lib/resume-sources";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export function CandidatePoolFilter({ q, source }: { q: string; source: CandidateSource | "" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [candidateSource, setCandidateSource] = useState(source || ALL);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (candidateSource !== ALL) params.set("source", candidateSource);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [candidateSource, pathname, query, router]);

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-nowrap">
      <Input
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name or email"
        className={cn(
          "max-w-xs",
          query.trim() ? "border-primary bg-primary/5 ring-1 ring-primary/20" : undefined,
        )}
      />
      <Select value={candidateSource} onValueChange={(value) => setCandidateSource(value ?? ALL)}>
        <SelectTrigger
          aria-label="Filter by candidate source"
          className={
            candidateSource !== ALL ? "border-primary bg-primary/5 text-primary" : undefined
          }
        >
          <SelectValue>
            {(value) =>
              value && value !== ALL
                ? (CANDIDATE_SOURCE_LABELS[value as CandidateSource] ?? value)
                : "All sources"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} label="All sources">
            All sources
          </SelectItem>
          {RESUME_SOURCES.map((value) => (
            <SelectItem key={value} value={value} label={CANDIDATE_SOURCE_LABELS[value]}>
              {CANDIDATE_SOURCE_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
