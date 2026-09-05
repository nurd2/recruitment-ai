// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SlaAdmin } from "@/components/app/sla-admin";

const actions = vi.hoisted(() => ({
  importHolidaysAction: vi.fn(),
  saveSlaPolicyAction: vi.fn(),
}));

vi.mock("@/app/actions/sla", () => ({
  deleteHolidayAction: vi.fn(),
  deleteSlaPolicyAction: vi.fn(),
  importHolidaysAction: actions.importHolidaysAction,
  saveHolidayAction: vi.fn(),
  saveSlaPolicyAction: actions.saveSlaPolicyAction,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("SlaAdmin", () => {
  afterEach(cleanup);

  beforeEach(() => {
    actions.saveSlaPolicyAction.mockResolvedValue({ ok: true });
    actions.importHolidaysAction.mockResolvedValue({ ok: true });
  });

  it("submits policy and calendar import forms", async () => {
    render(createElement(SlaAdmin, { policies: [], holidays: [] }));

    fireEvent.change(screen.getByLabelText("Grade"), {
      target: { value: "General Manager" },
    });
    fireEvent.change(screen.getByLabelText("Working days"), {
      target: { value: "40" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save policy" }));

    await waitFor(() =>
      expect(actions.saveSlaPolicyAction).toHaveBeenCalledWith({
        grade: "General Manager",
        workingDays: "40",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Import from API" }));

    await waitFor(() => expect(actions.importHolidaysAction).toHaveBeenCalledWith(2026));
  });

  it("filters holidays by calendar year", async () => {
    const user = userEvent.setup();
    render(
      createElement(SlaAdmin, {
        policies: [],
        holidays: [
          { id: "2025", date: "2025-12-25", name: "Christmas", type: "national_holiday" },
          { id: "2026", date: "2026-01-01", name: "New Year", type: "national_holiday" },
        ],
      }),
    );

    await user.click(screen.getByLabelText("Calendar year"));
    await user.click(screen.getByRole("option", { name: "2025" }));

    await waitFor(() =>
      expect(
        screen.getAllByText((_, element) => element?.textContent === "2025-12-25 Christmas (National holiday)").length,
      ).toBeGreaterThan(0),
    );
    expect(screen.queryAllByText((_, element) => element?.textContent?.includes("New Year") ?? false)).toHaveLength(0);
  });
});
