"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChartPanel } from "@/components/app/chart-panel";

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
      <ChartPanel
        title="Candidate sources"
        description="Where the candidate pool is coming from."
        emptyMessage="No candidate data yet."
        isEmpty={sourceData.length === 0}
      >
        <DashboardBarChart
          data={sourceData}
          label="Candidates"
          color="var(--chart-1)"
        />
      </ChartPanel>
      <ChartPanel
        title="Application pipeline"
        description="Active applications grouped by their current status."
        emptyMessage="No application data yet."
        isEmpty={pipelineData.length === 0}
      >
        <DashboardBarChart
          data={pipelineData}
          label="Applications"
          color="var(--chart-2)"
        />
      </ChartPanel>
    </div>
  );
}
