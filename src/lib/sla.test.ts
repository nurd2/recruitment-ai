import { describe, expect, it } from "vitest";

import { getSlaState, hireIsCompliant } from "@/lib/sla";

describe("SLA calculations", () => {
  it("treats the recruitment start date as day zero", () => {
    expect(hireIsCompliant("2026-09-01", "2026-09-01", 0, [])).toBe(true);
    expect(hireIsCompliant("2026-09-01", "2026-09-02", 0, [])).toBe(false);
  });

  it("excludes hold dates from elapsed SLA days", () => {
    expect(
      hireIsCompliant(
        "2026-09-01",
        "2026-09-04",
        2,
        [],
        [{ start: "2026-09-02", end: "2026-09-03" }],
      ),
    ).toBe(true);
  });

  it("marks missing headcount over SLA after the deadline", () => {
    expect(
      getSlaState({
        start: "2026-09-01",
        asOf: "2026-09-04",
        targetDays: 2,
        requiredHc: 2,
        fulfilledHc: 1,
        withinHc: 1,
        overHc: 1,
        isOnHold: false,
        holidays: [],
        holds: [],
      }),
    ).toBe("over_sla");
  });

  it("keeps on-hold as a lifecycle status ahead of SLA risk", () => {
    expect(
      getSlaState({
        start: "2026-09-01",
        asOf: "2026-09-30",
        targetDays: 2,
        requiredHc: 1,
        fulfilledHc: 0,
        withinHc: 0,
        overHc: 1,
        isOnHold: true,
        holidays: [],
        holds: [{ start: "2026-09-02", end: null }],
      }),
    ).toBe("on_hold");
  });
});
