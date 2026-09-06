"use client";

import { useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

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

type Summary = {
  totalHeadcount: number;
  fulfilledHeadcount: number;
  compliance: number | null;
  preJoiningWithdrawals: number;
  within: number;
  over: number;
};

type Snapshot = {
  month: string;
  summary: Summary;
  rows: Row[];
  asOf: string;
};

type Row = {
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

type Monthly = {
  month: string;
  within: number;
  over: number;
  compliance: number | null;
  preJoiningWithdrawals: number;
};

const statusLabels: Record<Row["status"], string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  over_sla: "Over SLA",
  fulfilled: "Fulfilled",
  on_hold: "On Hold",
};

const colors = { within: "#58b978", over: "#df6367" };

function formatMonth(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function statusClass(status: Row["status"]) {
  if (status === "over_sla") return "bg-red-50 text-red-700";
  if (status === "at_risk") return "bg-amber-50 text-amber-700";
  if (status === "on_hold") return "bg-slate-100 text-slate-600";
  if (status === "fulfilled") return "bg-slate-100 text-slate-600";
  return "bg-green-50 text-green-700";
}

export function SlaDashboard({
  stats,
  currentSummary,
  months,
  monthly,
  snapshots,
}: {
  stats: { activeTitles: number; holdTitles: number; fulfilledTitles: number; candidates: number };
  currentSummary: Summary;
  months: string[];
  monthly: Monthly[];
  snapshots: Snapshot[];
}) {
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1] ?? "");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const snapshot =
    snapshots.find((item) => item.month === selectedMonth) ?? snapshots[snapshots.length - 1];
  const rows = (snapshot?.rows ?? []).filter((row) => {
    const matchesQuery = row.title.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || row.status === status;
    return matchesQuery && matchesStatus;
  });
  const selectedSummary = snapshot?.summary ?? currentSummary;
  const chartData = monthly.map((item) => {
    const total = item.within + item.over;
    return {
      ...item,
      label: formatMonth(item.month),
      withinPct: total ? Math.round((item.within / total) * 100) : 0,
      overPct: total ? Math.round((item.over / total) * 100) : 0,
    };
  });
  const pieData = [
    { name: "Within SLA", value: selectedSummary.within, color: colors.within },
    { name: "Over SLA", value: selectedSummary.over, color: colors.over },
  ];

  const topCards = [
    {
      label: "Active job titles",
      value: stats.activeTitles,
      className: "bg-[#273762] text-white",
      labelClass: "text-white",
    },
    {
      label: "Job titles on hold",
      value: stats.holdTitles,
      className: "bg-[#effaf7] text-[#15233f]",
      labelClass: "text-[#398f8a]",
    },
    {
      label: "Fulfilled job titles",
      value: stats.fulfilledTitles,
      className: "bg-[#fff8eb] text-[#15233f]",
      labelClass: "text-[#bd6d1e]",
    },
    {
      label: "Candidates",
      value: stats.candidates,
      className: "bg-[#eef8ff] text-[#15233f]",
      labelClass: "text-[#2e73b6]",
    },
  ];

  return (
    <div className="grid gap-6 text-[#17243f]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {topCards.map((card) => (
          <Card
            key={card.label}
            className={cn(
              "min-h-[154px] rounded-[22px] border-0 px-6 py-5 shadow-[0_12px_30px_rgba(35,49,82,0.08)]",
              card.className,
            )}
          >
            <p className={cn("text-lg font-semibold", card.labelClass)}>{card.label}</p>
            <p className="mt-7 text-[44px] font-bold leading-none tracking-tight">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 pt-3">
        <h1 className="text-[27px] font-bold tracking-tight">Recruitment SLA Performance</h1>
        <div className="flex flex-wrap gap-3">
          <label className="grid min-w-[190px] gap-1 rounded-2xl border bg-white px-3 py-2 shadow-sm">
            <span className="text-xs text-slate-500">Month</span>
            <Select
              value={selectedMonth}
              onValueChange={(value) => value && setSelectedMonth(value)}
            >
              <SelectTrigger className="h-6 w-full border-0 p-0 text-base font-semibold shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Total Headcount"
          value={selectedSummary.totalHeadcount}
          helper="Total HC requirement"
        />
        <Metric
          label="HC Fulfilled"
          value={selectedSummary.fulfilledHeadcount}
          helper="Active hires at cutoff"
        />
        <Metric
          label="SLA Compliance"
          value={selectedSummary.compliance == null ? "—" : `${selectedSummary.compliance}%`}
          helper="Within SLA / total hires"
        />
        <Metric
          label="Pre-Joining Withdrawal"
          value={selectedSummary.preJoiningWithdrawals}
          helper="Historical outcome"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.75fr_1fr]">
        <Card className="rounded-[22px] border-0 p-6 shadow-[0_12px_30px_rgba(35,49,82,0.08)]">
          <h2 className="text-[23px] font-bold">Monthly SLA Compliance of Hires</h2>
          <p className="text-sm text-slate-500">
            Percentage of hires completed within and over SLA, grouped by Hired date.
          </p>
          <div className="mt-8 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="42%">
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#52617d", fontSize: 13 }}
                />
                <YAxis hide domain={[0, 100]} />
                <Bar dataKey="withinPct" stackId="a" fill={colors.within} radius={[0, 0, 0, 0]}>
                  {chartData.map((item) => (
                    <Cell key={item.month} fill={colors.within} />
                  ))}
                </Bar>
                <Bar dataKey="overPct" stackId="a" fill={colors.over} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-5 flex justify-center gap-6 border-t pt-4 text-sm">
            <LegendDot color={colors.within} label="Within SLA" />
            <LegendDot color={colors.over} label="Over SLA" />
          </div>
        </Card>

        <Card className="rounded-[22px] border-0 p-6 shadow-[0_12px_30px_rgba(35,49,82,0.08)]">
          <h2 className="text-[23px] font-bold">SLA Summary — {formatMonth(selectedMonth)}</h2>
          <div className="mt-3 grid items-center gap-4 sm:grid-cols-[1fr_1fr]">
            <div className="relative h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={52}
                    outerRadius={78}
                    strokeWidth={0}
                  >
                    {pieData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                <strong className="text-3xl">
                  {selectedSummary.within + selectedSummary.over}
                </strong>
                <span className="font-semibold">Hires</span>
              </div>
            </div>
            <div className="grid gap-2 text-sm">
              <SummaryLine
                color={colors.within}
                label="Within SLA"
                value={`${selectedSummary.within} (${selectedSummary.compliance ?? 0}%)`}
              />
              <SummaryLine
                color={colors.over}
                label="Over SLA"
                value={`${selectedSummary.over} (${selectedSummary.compliance == null ? 0 : 100 - selectedSummary.compliance}%)`}
              />
              <SummaryLine
                label="Pre-Joining Withdrawal"
                value={String(selectedSummary.preJoiningWithdrawals)}
              />
            </div>
          </div>
          <p className="mt-5 rounded-xl bg-[#eef4ff] px-3 py-3 text-sm text-[#31568e]">
            Pre-joining withdrawal does not change the historical SLA result. It is shown separately
            as an outcome.
          </p>
        </Card>
      </div>

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
              {rows.map((row, index) => {
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
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No Job Titles match this filter.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <Card className="rounded-[18px] border-0 px-6 py-5 shadow-[0_8px_24px_rgba(35,49,82,0.06)]">
      <p className="font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-[36px] font-bold leading-none">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{helper}</p>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="size-3 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function SummaryLine({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="flex items-center gap-2">
        {color ? <span className="size-3 rounded-full" style={{ backgroundColor: color }} /> : null}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
