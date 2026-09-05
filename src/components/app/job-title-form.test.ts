// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JobTitleForm } from "@/components/app/job-title-form";

const actions = vi.hoisted(() => ({
  autofillJobTitleAction: vi.fn(),
  createJobTitleAction: vi.fn(),
}));

vi.mock("@/app/actions/job-titles", () => ({
  autofillJobTitleAction: actions.autofillJobTitleAction,
  createJobTitleAction: actions.createJobTitleAction,
  updateJobTitleAction: vi.fn(),
}));

vi.mock("@bprogress/next/app", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("JobTitleForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    actions.autofillJobTitleAction.mockReset();
    actions.autofillJobTitleAction.mockResolvedValue({
      ok: true,
      data: {
        description: "AI generated description",
        competencies: [{ name: "Kubernetes", required: true }],
        minYearsExperience: 3,
        minEducation: "S1",
        location: "Jakarta",
        workType: "Full-time",
        workArrangement: "Hybrid",
        language: "English",
      },
    });
    actions.createJobTitleAction.mockReset();
    actions.createJobTitleAction.mockResolvedValue({ ok: true, data: { id: "job-1" } });
  });

  it("preserves the selected grade after AI auto-fill", async () => {
    const user = userEvent.setup();
    render(
      createElement(JobTitleForm, {
        mode: "create",
        policies: [
          { grade: "staff", workingDays: 30 },
          { grade: "manager", workingDays: 60 },
        ],
      }),
    );

    fireEvent.change(screen.getByLabelText("Title *"), {
      target: { value: "Platform Engineer" },
    });
    await user.click(screen.getByLabelText("Grade *"));
    await user.click(screen.getByRole("option", { name: /manager/i }));

    await user.click(screen.getByRole("button", { name: "Auto-fill with AI" }));
    await user.click(screen.getByRole("button", { name: "Generate criteria" }));
    await waitFor(() =>
      expect((screen.getByLabelText("Job description") as HTMLTextAreaElement).value).toBe(
        "AI generated description",
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Create job title" }));

    await waitFor(() => expect(actions.createJobTitleAction).toHaveBeenCalledOnce());
    expect(actions.createJobTitleAction.mock.calls[0][0]).toMatchObject({
      grade: "manager",
      slaWorkingDays: 60,
    });
  });
});
