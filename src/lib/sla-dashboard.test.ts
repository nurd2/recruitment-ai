import { describe, expect, it } from "vitest";

import { buildSlaSnapshot } from "@/lib/sla-dashboard";

const title = {
  id: "job-1",
  title: "Mechanic",
  grade: "staff",
  target: 2,
  openings: 1,
  start: "2026-09-01",
  lifecycleStatus: "active" as const,
  deletedAt: null,
};

const common = {
  titles: [title],
  holidays: [],
  requirementChanges: [{ jobTitleId: "job-1", openings: 1, effectiveFrom: "2026-09-01" }],
  lifecycleChanges: [
    { jobTitleId: "job-1", status: "active" as const, effectiveFrom: "2026-09-01" },
  ],
  today: "2026-09-30",
};

describe("SLA dashboard snapshots", () => {
  it("keeps a pre-joining withdrawal in historical SLA but removes it from fulfillment", () => {
    const snapshot = buildSlaSnapshot({
      ...common,
      month: "2026-09",
      today: "2026-09-07",
      hires: [
        {
          applicationId: "application-1",
          jobTitleId: "job-1",
          hiredDate: "2026-09-02",
          withdrawn: true,
          withdrawnAt: new Date("2026-09-10T02:00:00Z"),
          withdrawalDate: "2026-09-05",
          withdrawalType: "pre_joining",
          hireCanceledAt: null,
        },
      ],
    });

    expect(snapshot.summary.within).toBe(1);
    expect(snapshot.summary.compliance).toBe(100);
    expect(snapshot.summary.preJoiningWithdrawals).toBe(1);
    expect(snapshot.summary.fulfilledHeadcount).toBe(0);
    expect(snapshot.rows[0]?.remainingHc).toBe(1);
  });

  it("uses requirement history at the selected cutoff", () => {
    const snapshot = buildSlaSnapshot({
      ...common,
      month: "2026-09",
      requirementChanges: [
        { jobTitleId: "job-1", openings: 1, effectiveFrom: "2026-09-01" },
        { jobTitleId: "job-1", openings: 3, effectiveFrom: "2026-09-20" },
      ],
      hires: [],
    });

    expect(snapshot.rows[0]?.requiredHc).toBe(3);
    expect(snapshot.rows[0]?.remainingHc).toBe(3);
  });

  it("does not let a hold create an SLA breach", () => {
    const snapshot = buildSlaSnapshot({
      ...common,
      month: "2026-09",
      titles: [{ ...title, target: 2 }],
      lifecycleChanges: [
        { jobTitleId: "job-1", status: "active", effectiveFrom: "2026-09-01" },
        { jobTitleId: "job-1", status: "hold", effectiveFrom: "2026-09-02" },
      ],
      hires: [],
    });

    expect(snapshot.rows[0]?.status).toBe("on_hold");
  });

  it("excludes removed job titles from the SLA snapshot", () => {
    const snapshot = buildSlaSnapshot({
      ...common,
      month: "2026-09",
      titles: [{ ...title, deletedAt: new Date("2026-09-03T00:00:00Z") }],
      hires: [
        {
          applicationId: "application-2",
          jobTitleId: "job-1",
          hiredDate: "2026-09-02",
          withdrawn: false,
          withdrawnAt: null,
          withdrawalDate: null,
          withdrawalType: null,
          hireCanceledAt: null,
        },
      ],
    });

    expect(snapshot.rows).toHaveLength(0);
    expect(snapshot.summary.totalHeadcount).toBe(0);
    expect(snapshot.summary.within).toBe(0);
  });
});
