"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type DashboardChartItem = {
  label: string;
  value: number;
  fill?: string;
};

function DashboardBarChart({
  data,
  label,
  color,
}: {
  data: DashboardChartItem[];
  label: string;
  color: string;
}) {
  const config = {
    value: {
      label,
      color,
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-70 w-full">
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          dataKey="label"
          type="category"
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          width={116}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} barSize={24}>
          <LabelList
            dataKey="value"
            position="right"
            className="fill-foreground font-medium"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function DashboardCharts({
  sourceData,
  pipelineData,
}: {
  sourceData: DashboardChartItem[];
  pipelineData: DashboardChartItem[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2">
          <h2 className="font-semibold">Candidate sources</h2>
          <p className="text-sm text-muted-foreground">
            Where the candidate pool is coming from.
          </p>
        </div>
        {sourceData.length === 0 ? (
          <p className="py-20 text-sm text-muted-foreground">No candidate data yet.</p>
        ) : (
          <DashboardBarChart data={sourceData} label="Candidates" color="var(--chart-1)" />
        )}
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2">
          <h2 className="font-semibold">Application pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Active applications grouped by their current status.
          </p>
        </div>
        {pipelineData.length === 0 ? (
          <p className="py-20 text-sm text-muted-foreground">No application data yet.</p>
        ) : (
          <DashboardBarChart
            data={pipelineData}
            label="Applications"
            color="var(--chart-2)"
          />
        )}
      </div>
    </div>
  );
}
