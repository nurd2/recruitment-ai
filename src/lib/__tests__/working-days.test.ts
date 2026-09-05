import { describe, expect, it } from "vitest";

import { countWorkingDays } from "@/lib/working-days";

describe("countWorkingDays", () => {
  it("excludes weekends and holidays", () => {
    expect(countWorkingDays("2026-01-01", "2026-01-07", ["2026-01-01"])).toBe(4);
  });

  it("counts the start date when it is a working day", () => {
    expect(countWorkingDays("2026-01-05", "2026-01-05", [])).toBe(1);
  });
});
