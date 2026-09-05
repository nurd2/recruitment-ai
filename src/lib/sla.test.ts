import { describe, expect, it } from "vitest";

import { groupCurrentHireDates } from "@/lib/sla";

describe("groupCurrentHireDates", () => {
  it("excludes applications that no longer have Hired as their current status", () => {
    const dates = groupCurrentHireDates([
      {
        applicationId: "application-1",
        jobTitleId: "job-title-1",
        currentStatus: "Rejected",
        withdrawn: false,
        candidateDeletedAt: null,
        changedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    expect(dates).toEqual(new Map());
  });

  it("counts a current hire once using its latest Hired transition", () => {
    const dates = groupCurrentHireDates([
      {
        applicationId: "application-1",
        jobTitleId: "job-title-1",
        currentStatus: "Hired",
        withdrawn: false,
        candidateDeletedAt: null,
        changedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      {
        applicationId: "application-1",
        jobTitleId: "job-title-1",
        currentStatus: "Hired",
        withdrawn: false,
        candidateDeletedAt: null,
        changedAt: new Date("2026-01-05T00:00:00.000Z"),
      },
    ]);

    expect(dates.get("job-title-1")).toEqual(["2026-01-05"]);
  });
});
