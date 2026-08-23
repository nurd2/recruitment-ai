import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

import type { AiProviderName } from "@/lib/ai/providers-meta";

export type ResolvedAiConfig = {
  provider: AiProviderName;
  model: string;
  baseUrl?: string;
  apiKey: string;
};

export type AiPrompt = {
  system: string;
  user: string;
};

// Output-token budgets. Too small and the JSON answer is truncated (invalid
// JSON) or, for reasoning models, empty because chain-of-thought ate the whole
// budget before the answer. 8192 is safely supported by all current chat
// models; reasoning models (deepseek-v4-flash, gemini 2.5 thinking) need extra
// headroom for hidden reasoning. ponytail: knobs — raise if long resumes still
// truncate, lower if cost matters.
const MAX_TOKENS = Number(process.env.AI_MAX_TOKENS ?? 8192);
const REASONING_MAX_TOKENS = Number(
  process.env.AI_MAX_TOKENS_REASONING ?? 16384,
);

/** Call a single provider and parse the JSON response. */
export async function callProvider(
  config: ResolvedAiConfig,
  prompt: AiPrompt,
): Promise<unknown> {
  switch (config.provider) {
    case "openai":
    case "openai_compatible":
    case "deepseek": {
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
      const completion = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        // DeepSeek is a reasoning model, while custom compatible endpoints
        // need an explicit budget to avoid truncating long resume payloads.
        ...(config.provider === "deepseek"
          ? { max_tokens: REASONING_MAX_TOKENS }
          : config.provider === "openai_compatible"
            ? { max_tokens: MAX_TOKENS }
            : {})
      });
      const choice = completion.choices[0];
      const content = choice?.message?.content;
      if (!content) {
        // Reasoning models can burn the whole budget on CoT and return no
        // content (finish_reason "length"). Make that actionable.
        if (choice?.finish_reason === "length") {
          throw new Error(
            "EMPTY_AI_RESPONSE: output truncated (raise AI_MAX_TOKENS)",
          );
        }
        throw new Error("EMPTY_AI_RESPONSE");
      }
      if (choice.finish_reason === "length") {
        throw new Error(
          "EMPTY_AI_RESPONSE: output truncated (raise AI_MAX_TOKENS)",
        );
      }
      return JSON.parse(content);
    }
    case "gemini": {
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const model = genAI.getGenerativeModel({ model: config.model });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: `${prompt.system}\n\n${prompt.user}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          // Gemini 2.5 spends a variable share on "thinking"; give headroom so
          // the JSON answer isn't truncated/empty.
          maxOutputTokens: REASONING_MAX_TOKENS,
        },
      });
      if (result.response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
        throw new Error(
          "EMPTY_AI_RESPONSE: output truncated (raise AI_MAX_TOKENS_REASONING)",
        );
      }
      const text = result.response.text();
      if (!text) throw new Error("EMPTY_AI_RESPONSE");
      return JSON.parse(text);
    }
    case "anthropic": {
      const client = new Anthropic({
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
      });
      const msg = await client.messages.create({
        model: config.model,
        max_tokens: MAX_TOKENS,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
        temperature: 0.1,
      });
      const text = msg.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      if (!text || msg.stop_reason === "max_tokens") {
        throw new Error(
          "EMPTY_AI_RESPONSE: output truncated (raise AI_MAX_TOKENS)",
        );
      }
      return JSON.parse(text);
    }
    default:
      throw new Error(`UNSUPPORTED_PROVIDER: ${config.provider}`);
  }
}

/**
 * Cheap connectivity/credential check against a provider, used by the
 * admin "Test connection" button. Sends a tiny request that costs little.
 */
export async function testProvider(
  config: ResolvedAiConfig,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    switch (config.provider) {
      case "openai":
      case "openai_compatible":
      case "deepseek": {
        const client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseUrl,
        });
        const completion = await client.chat.completions.create({
          model: config.model,
          messages: [{ role: "user", content: "Reply with the single word OK." }],
          max_tokens: config.provider === "deepseek" ? 4096 : 64,
        });
        const message = completion.choices?.[0]?.message;
        if (!message?.content && !(message as { reasoning_content?: string } | undefined)?.reasoning_content) {
          throw new Error("EMPTY_AI_RESPONSE");
        }
        return { ok: true };
      }
      case "gemini": {
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const model = genAI.getGenerativeModel({ model: config.model });
        const result = await model.generateContent(
          "Reply with the single word OK.",
        );
        if (!result.response.text()) throw new Error("EMPTY_AI_RESPONSE");
        return { ok: true };
      }
      case "anthropic": {
        const client = new Anthropic({
          apiKey: config.apiKey,
          ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
        });
        const msg = await client.messages.create({
          model: config.model,
          max_tokens: 5,
          messages: [{ role: "user", content: "Reply with the single word OK." }],
        });
        if (!msg.content.length) throw new Error("EMPTY_AI_RESPONSE");
        return { ok: true };
      }
      default:
        return { ok: false, message: `UNSUPPORTED_PROVIDER: ${config.provider}` };
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
