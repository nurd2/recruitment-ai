import { describe, expect, it, vi } from "vitest";

const createCompletion = vi.fn();

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = { completions: { create: createCompletion } };
  },
}));

import { callProvider } from "@/lib/ai/providers";

describe("callProvider", () => {
  it("reports truncated OpenAI-compatible JSON responses clearly", async () => {
    createCompletion.mockResolvedValue({
      choices: [
        {
          finish_reason: "length",
          message: { content: '{"fields": "truncated' },
        },
      ],
    });

    await expect(
      callProvider(
        {
          provider: "openai_compatible",
          model: "test-model",
          apiKey: "test-key",
        },
        { system: "Return JSON.", user: "{}" },
      ),
    ).rejects.toThrow(
      "EMPTY_AI_RESPONSE: output truncated (raise AI_MAX_TOKENS)",
    );
  });
});