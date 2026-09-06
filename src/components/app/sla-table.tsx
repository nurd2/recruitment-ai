"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SlaTableRow = {
  id: string;
  title: string;
  grade: string;
  requiredHc: number;
  fulfilledHc: number;
  withinHc: number;
  overHc: number;
  remainingHc: number;
  status: "on_track" | "at_risk" | "over_sla" | "fulfilled" | "on_hold";
};

const statusLabels: Record<SlaTableRow["status"], string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  over_sla: "Over SLA",
  fulfilled: "Fulfilled",
  on_hold: "On Hold",
};

function statusClass(status: SlaTableRow["status"]) {
  if (status === "over_sla") return "bg-red-50 text-red-700";
  if (status === "at_risk") return "bg-amber-50 text-amber-700";
  if (status === "on_hold" || status === "fulfilled") return "bg-slate-100 text-slate-600";
  return "bg-green-50 text-green-700";
}

export function SlaTable({ rows }: { rows: SlaTableRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filteredRows = rows.filter((row) => {
    const matchesQuery = row.title.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || row.status === status);
  });

  return (
    <Card className="rounded-[22px] border-0 p-6 shadow-[0_12px_30px_rgba(35,49,82,0.08)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[23px] font-bold">SLA Compliance vs Requirement (by Job Title)</h2>
          <p className="text-sm text-slate-500">
            Current status of each Job Title and headcount based on SLA.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search job title..."
            className="w-[230px] bg-white"
          />
          <Select value={status} onValueChange={(value) => value && setStatus(value)}>
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[#f8faff] text-xs text-slate-600">
            <tr>
              {[
                "No",
                "Job Title",
                "Grade",
                "Required HC",
                "Fulfilled HC",
                "HC SLA Result",
                "Remaining HC",
                "Current Status",
              ].map((heading) => (
                <th key={heading} className="px-3 py-3 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => {
              const statusOver =
                row.status === "over_sla" ? Math.max(row.overHc, row.remainingHc) : row.overHc;
              return (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-4">{index + 1}</td>
                  <td className="px-3 py-4 font-medium">{row.title}</td>
                  <td className="px-3 py-4 capitalize">{row.grade}</td>
                  <td className="px-3 py-4">{row.requiredHc}</td>
                  <td className="px-3 py-4">{row.fulfilledHc}</td>
                  <td className="px-3 py-4">
                    {row.withinHc || statusOver
                      ? `${row.withinHc ? `${row.withinHc} Within` : ""}${row.withinHc && statusOver ? ", " : ""}${statusOver ? `${statusOver} Over` : ""}`
                      : "-"}
                  </td>
                  <td className="px-3 py-4">{row.remainingHc}</td>
                  <td className="px-3 py-4">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        statusClass(row.status),
                      )}
                    >
                      {row.status === "over_sla" && statusOver
                        ? `${statusOver} HC Over SLA`
                        : statusLabels[row.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            No Job Titles match this filter.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
