"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/card";

export type SlaChartMonth = {
  month: string;
  within: number;
  over: number;
  compliance: number | null;
  preJoiningWithdrawals: number;
};

export type SlaChartSummary = {
  within: number;
  over: number;
  preJoiningWithdrawals: number;
};

const colors = { within: "#58b978", over: "#df6367" };

export function formatMonth(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

export function MonthlySlaChart({ months }: { months: SlaChartMonth[] }) {
  const chartData = months.map((item) => {
    const total = item.within + item.over;
    return {
      ...item,
      label: formatMonth(item.month),
      withinPct: total ? Math.round((item.within / total) * 100) : 0,
      overPct: total ? Math.round((item.over / total) * 100) : 0,
    };
  });

  return (
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
            <Bar dataKey="withinPct" stackId="a" fill={colors.within}>
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
  );
}

export function SlaSummaryChart({ month, summary }: { month: string; summary: SlaChartSummary }) {
  const pieData = [
    { name: "Within SLA", value: summary.within, color: colors.within },
    { name: "Over SLA", value: summary.over, color: colors.over },
  ];
  const total = summary.within + summary.over;
  const compliance = total ? Math.round((summary.within / total) * 100) : 0;

  return (
    <Card className="rounded-[22px] border-0 p-6 shadow-[0_12px_30px_rgba(35,49,82,0.08)]">
      <h2 className="text-[23px] font-bold">SLA Summary — {formatMonth(month)}</h2>
      <div className="mt-3 grid items-center gap-4 sm:grid-cols-[1fr_1fr]">
        <div className="relative h-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={52} outerRadius={78} strokeWidth={0}>
                {pieData.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <strong className="text-3xl">{total}</strong>
            <span className="font-semibold">Hires</span>
          </div>
        </div>
        <div className="grid gap-2 text-sm">
          <SummaryLine
            color={colors.within}
            label="Within SLA"
            value={`${summary.within} (${compliance}%)`}
          />
          <SummaryLine
            color={colors.over}
            label="Over SLA"
            value={`${summary.over} (${total ? 100 - compliance : 0}%)`}
          />
          <SummaryLine
            label="Pre-Joining Withdrawal"
            value={String(summary.preJoiningWithdrawals)}
          />
        </div>
      </div>
      <p className="mt-5 rounded-xl bg-[#eef4ff] px-3 py-3 text-sm text-[#31568e]">
        Pre-joining withdrawal does not change the historical SLA result. It is shown separately as
        an outcome.
      </p>
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
