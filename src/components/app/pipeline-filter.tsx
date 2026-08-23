"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusDotClass } from "@/lib/status-colors";
import { cn } from "@/lib/utils";

const ALL = "__all__";

/**
 * Pipeline search + status filter. Updates the shareable URL after a short
 * pause so typing does not trigger a request for every character.
 */
export function PipelineFilter({
  q,
  statusId,
  statuses,
}: {
  q: string;
  statusId: string;
  statuses: { id: string; name: string; color: string | null }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(q);
  const [status, setStatus] = useState(statusId || ALL);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status !== ALL) params.set("status", status);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [pathname, query, router, status]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name or email"
        className="max-w-xs"
      />
      <Select value={status} onValueChange={(v) => setStatus(v ?? ALL)}>
        <SelectTrigger aria-label="Filter by status">
          <SelectValue>
            {(value) => {
              if (!value || value === ALL) return "All statuses";
              const current = statuses.find((s) => s.id === value);
              if (!current) return value;
              return (
                <span className="flex items-center gap-2">
                  <span
                    className={cn("size-2 shrink-0 rounded-full", statusDotClass(current.color))}
                  />
                  {current.name}
                </span>
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} label="All statuses">
            All statuses
          </SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s.id} value={s.id} label={s.name}>
              <span className="flex items-center gap-2">
                <span className={cn("size-2 shrink-0 rounded-full", statusDotClass(s.color))} />
                {s.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
