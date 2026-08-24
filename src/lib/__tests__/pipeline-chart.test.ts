import { describe, expect, it } from "vitest";

import { aggregatePipelineStatusCounts } from "@/lib/pipeline-chart";

describe("aggregatePipelineStatusCounts", () => {
  it("groups status names case-insensitively and trims the first label", () => {
    expect(
      aggregatePipelineStatusCounts([
        { statusName: " Screening ", n: 2 },
        { statusName: "SCREENING", n: 3 },
      ]),
    ).toEqual([{ label: "Screening", value: 5 }]);
  });

  it("groups missing and blank status names as Unassigned", () => {
    expect(
      aggregatePipelineStatusCounts([
        { statusName: null, n: 1 },
        { statusName: "   ", n: 2 },
        { statusName: null, n: 1 },
      ]),
    ).toEqual([{ label: "Unassigned", value: 4 }]);
  });

  it("sorts by count descending and label alphabetically for ties", () => {
    expect(
      aggregatePipelineStatusCounts([
        { statusName: "Zeta", n: 2 },
        { statusName: "Alpha", n: 2 },
        { statusName: "Screening", n: 3 },
      ]),
    ).toEqual([
      { label: "Screening", value: 3 },
      { label: "Alpha", value: 2 },
      { label: "Zeta", value: 2 },
    ]);
  });
});
