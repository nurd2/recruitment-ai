"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartPanel } from "@/components/app/chart-panel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Row = {
  title: string;
  grade: string;
  target: number;
  openings: number;
  hired: number;
  elapsed: number;
  state: string;
};
type Month = { month: string; compliant: number; breached: number; rate: number };

const config = {
  compliant: { label: "Compliant", color: "var(--chart-1)" },
  breached: { label: "Breached", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function SlaDashboard({ rows, months }: { rows: Row[]; months: Month[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">SLA compliance vs requirement</h2>
          <p className="text-sm text-muted-foreground">
            Live recruitment health measured in working days.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="pb-3 pr-4">Job Title</th>
                <th className="pb-3 pr-4">Grade</th>
                <th className="pb-3 pr-4">Progress</th>
                <th className="pb-3 pr-4">SLA</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.title} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{row.title}</td>
                  <td className="py-3 pr-4 capitalize">{row.grade}</td>
                  <td className="py-3 pr-4">
                    {row.hired}/{row.openings}
                  </td>
                  <td className="py-3 pr-4">
                    {row.elapsed}/{row.target} days
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${row.state.includes("breached") ? "bg-red-100 text-red-800" : row.state === "at_risk" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}
                    >
                      {row.state.replaceAll("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No recruitment data yet.
            </p>
          ) : null}
        </div>
      </section>
      <ChartPanel
        title="SLA compliance of hires"
        description="Current hires, grouped by their latest Hired date."
        emptyMessage="No completed hires yet."
        isEmpty={months.length === 0}
      >
        <ChartContainer config={config} className="h-72 w-full">
          <BarChart accessibilityLayer data={months}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="compliant"
              stackId="a"
              fill="var(--color-compliant)"
              radius={[4, 4, 0, 0]}
            />
            <Bar dataKey="breached" stackId="a" fill="var(--color-breached)" />
          </BarChart>
        </ChartContainer>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {months.slice(-2).map((month) => (
            <div key={month.month} className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{month.month}</p>
              <p className="text-xl font-semibold">{month.rate.toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </ChartPanel>
    </div>
  );
}
