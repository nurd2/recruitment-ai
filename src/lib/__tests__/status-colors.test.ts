import { describe, expect, it } from "vitest";

import { DEFAULT_STATUSES } from "@/lib/defaults";
import {
  DEFAULT_STATUS_COLORS,
  STATUS_COLORS,
  colorForDefaultStatus,
  isStatusColor,
  statusBadgeClass,
  statusDotClass,
  statusSwatchClass,
} from "@/lib/status-colors";
import { statusColorSchema } from "@/lib/validation";

describe("status color palette", () => {
  it("every default status has a valid color", () => {
    for (const name of DEFAULT_STATUSES) {
      expect(isStatusColor(colorForDefaultStatus(name))).toBe(true);
    }
  });

  it("DEFAULT_STATUS_COLORS covers the default pipeline", () => {
    for (const name of DEFAULT_STATUSES) {
      expect(DEFAULT_STATUS_COLORS).toHaveProperty(name);
    }
  });

  it("every palette color maps to badge, dot and swatch classes", () => {
    for (const c of STATUS_COLORS) {
      expect(statusBadgeClass(c)).toBeTruthy();
      expect(statusDotClass(c)).toBeTruthy();
      expect(statusSwatchClass(c)).toBeTruthy();
    }
  });

  it("falls back to gray for unknown or missing colors", () => {
    expect(statusBadgeClass("hotpink")).toBe(statusBadgeClass("gray"));
    expect(statusDotClass(null)).toBe(statusDotClass("gray"));
    expect(statusSwatchClass(undefined)).toBe(statusSwatchClass("gray"));
  });

  it("validation accepts palette colors and rejects others", () => {
    expect(statusColorSchema.safeParse({ color: "green" }).success).toBe(true);
    expect(statusColorSchema.safeParse({ color: "magenta" }).success).toBe(false);
  });
});
