export type PipelineStatusCount = {
  statusName: string | null;
  n: number | string | bigint;
};

export type PipelineChartItem = {
  label: string;
  value: number;
};

export function aggregatePipelineStatusCounts(counts: PipelineStatusCount[]): PipelineChartItem[] {
  const grouped = new Map<string, PipelineChartItem>();

  for (const { statusName, n } of counts) {
    const label = statusName?.trim() || "Unassigned";
    const key = statusName?.trim().toLowerCase() || "unassigned";
    const current = grouped.get(key);

    if (current) {
      current.value += Number(n);
    } else {
      grouped.set(key, { label, value: Number(n) });
    }
  }

  return [...grouped.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}
