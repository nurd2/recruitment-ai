/**
 * Provider metadata shared between server (config/actions) and client
 * (admin UI). Kept free of SDK imports so it can be bundled client-side.
 */

export type AiProviderName =
  | "openai"
  | "deepseek"
  | "gemini"
  | "anthropic"
  | "openai_compatible";

export type AiProviderMeta = {
  value: AiProviderName;
  label: string;
  hint: string;
};

export const AI_PROVIDERS: AiProviderMeta[] = [
  { value: "openai", label: "OpenAI", hint: "https://api.openai.com/v1" },
  { value: "deepseek", label: "DeepSeek", hint: "https://api.deepseek.com" },
  { value: "gemini", label: "Gemini", hint: "Google AI Studio (no base URL)" },
  { value: "anthropic", label: "Anthropic", hint: "https://api.anthropic.com" },
  {
    value: "openai_compatible",
    label: "Custom (OpenAI-compatible)",
    hint: "Bring your own endpoint (URL required)",
  },
];

/** Preset base URLs for the named providers (custom providers set their own). */
export const PRESET_BASE_URLS: Partial<Record<AiProviderName, string>> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com",
  anthropic: "https://api.anthropic.com",
};

/** Sensible default model per provider, used as a placeholder in the admin UI. */
export const DEFAULT_MODELS: Partial<Record<AiProviderName, string>> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  gemini: "gemini-2.0-flash",
  anthropic: "claude-3-5-haiku-latest",
  openai_compatible: "gpt-4o-mini",
};
