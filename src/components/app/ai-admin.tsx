"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Power, Star, Trash2 } from "lucide-react";

import {
  deleteAiConfigAction,
  testAiConfigAction,
  updateAiConfigFlagsAction,
  upsertAiConfigAction,
} from "@/app/actions/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AI_PROVIDERS,
  DEFAULT_MODELS,
  PRESET_BASE_URLS,
} from "@/lib/ai/providers-meta";
import type { AiProviderName } from "@/lib/ai/providers-meta";
import { toast } from "sonner";

export type AiConfigRow = {
  id: string;
  provider: string;
  name: string;
  baseUrl: string | null;
  model: string;
  hasApiKey: boolean;
  enabled: boolean;
  isDefault: boolean;
  fallbackEnabled: boolean;
  masking: string[];
};

const MASK_DEFAULTS = ["address", "dateOfBirth", "phone"];

function providerLabel(value: string): string {
  return AI_PROVIDERS.find((p) => p.value === value)?.label ?? value;
}

type FormInput = {
  provider: AiProviderName;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  isDefault: boolean;
  fallbackEnabled: boolean;
  masking: string[];
};

function ConfigForm({
  onSubmit,
  initial,
  submitLabel,
}: {
  onSubmit: (input: FormInput) => Promise<void>;
  initial?: Partial<AiConfigRow>;
  submitLabel: string;
}) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [provider, setProvider] = useState<AiProviderName>(
    (initial?.provider as AiProviderName) ?? "openai",
  );

  const isCustom = provider === "openai_compatible";
  const presetBase = PRESET_BASE_URLS[provider];

  function collectFromForm(form: HTMLFormElement): FormInput {
    const data = new FormData(form);
    const masking = String(data.get("masking") ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return {
      provider,
      name: String(data.get("name") ?? ""),
      baseUrl: String(data.get("baseUrl") ?? ""),
      model: String(data.get("model") ?? ""),
      apiKey: String(data.get("apiKey") ?? ""),
      enabled: data.get("enabled") === "on",
      isDefault: data.get("isDefault") === "on",
      fallbackEnabled: data.get("fallbackEnabled") === "on",
      masking,
    };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(collectFromForm(e.currentTarget));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const form = e.currentTarget.form;
    if (!form) return;
    setTesting(true);
    try {
      const input: FormInput = collectFromForm(form);
      const res = await testAiConfigAction({ ...input, id: initial?.id } as never);
      if (res.ok && res.data) {
        if (res.data.ok) toast.success(res.data.message ?? "Connection OK.");
        else toast.error(res.data.message ?? "Connection failed.");
      } else {
        toast.error("error" in res ? res.error : "Test failed.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  }

  const uid = initial?.id ?? "new";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border p-4">
      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`provider-${uid}`}>Provider</Label>
          <Select
            value={provider}
            onValueChange={(v) => setProvider(v as AiProviderName)}
          >
            <SelectTrigger id={`provider-${uid}`} className="w-full">
              <SelectValue>
                {(value) => {
                  const meta = AI_PROVIDERS.find((p) => p.value === value);
                  return meta ? meta.label : (value ?? "");
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value} label={p.label}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {AI_PROVIDERS.find((p) => p.value === provider)?.hint}
          </p>
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`name-${uid}`}>Display name</Label>
          <Input
            id={`name-${uid}`}
            name="name"
            required
            defaultValue={initial?.name}
            placeholder="e.g. Production OpenAI"
          />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`model-${uid}`}>Model</Label>
          <Input
            key={`model-${provider}`}
            id={`model-${uid}`}
            name="model"
            required
            defaultValue={initial?.model}
            placeholder={DEFAULT_MODELS[provider] ?? "model-id"}
          />
        </div>
        {isCustom ? (
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor={`baseUrl-${uid}`}>Base URL</Label>
            <Input
              key={`baseurl-custom-${provider}`}
              id={`baseUrl-${uid}`}
              name="baseUrl"
              required
              placeholder="https://api.openai.com/v1"
              defaultValue={initial?.baseUrl ?? ""}
            />
            <p className="text-xs text-muted-foreground">
              Required for custom OpenAI-compatible endpoints.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-1.5">
            <Label>Base URL</Label>
            <Input
              key={`baseurl-preset-${provider}`}
              name="baseUrl"
              value={presetBase ?? ""}
              readOnly
              placeholder="Managed by provider SDK"
              className="bg-input/20 text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Preset for {providerLabel(provider)}. Use the Custom provider for
              other endpoints.
            </p>
          </div>
        )}
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`apiKey-${uid}`}>API key</Label>
          <Input
            id={`apiKey-${uid}`}
            name="apiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={initial?.hasApiKey ? "Leave blank to keep existing key" : "sk-…"}
          />
          <p className="text-xs text-muted-foreground">
            Encrypted at rest (AES-256-GCM). Never stored or shown in plaintext.
          </p>
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`masking-${uid}`}>Masked fields (comma)</Label>
          <Input
            id={`masking-${uid}`}
            name="masking"
            defaultValue={(initial?.masking ?? MASK_DEFAULTS).join(", ")}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 border-t pt-3 text-sm sm:grid-cols-3">
        <label htmlFor={`enabled-${uid}`} className="flex items-center gap-2">
          <Checkbox
            id={`enabled-${uid}`}
            name="enabled"
            defaultChecked={initial?.enabled ?? true}
          />
          <span>Enabled</span>
        </label>
        <label htmlFor={`default-${uid}`} className="flex items-center gap-2">
          <Checkbox
            id={`default-${uid}`}
            name="isDefault"
            defaultChecked={initial?.isDefault}
          />
          <span>Default provider</span>
        </label>
        <label htmlFor={`fallback-${uid}`} className="flex items-center gap-2">
          <Checkbox
            id={`fallback-${uid}`}
            name="fallbackEnabled"
            defaultChecked={initial?.fallbackEnabled}
          />
          <span>Allow fallback</span>
        </label>
      </div>
      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? "Saving…" : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={testing}
          onClick={handleTest}
          className="w-fit"
        >
          {testing ? "Testing…" : "Test connection"}
        </Button>
      </div>
    </form>
  );
}

export function AiAdmin({ configs }: { configs: AiConfigRow[] }) {
  const router = useRouter();
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AiConfigRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  async function onUpsert(input: FormInput, id?: string) {
    const res = await upsertAiConfigAction({ ...input, id } as never);
    if (!res.ok) throw new Error(res.error);
    toast.success("AI provider saved.");
    if (!id) setAddProviderOpen(false);
    router.refresh();
  }

  async function onDeleteConfirmed() {
    if (!confirmDelete) return;
    const res = await deleteAiConfigAction(confirmDelete.id);
    setConfirmDelete(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("AI provider deleted.");
    router.refresh();
  }

  async function updateFlags(input: {
    id: string;
    isDefault?: boolean;
    enabled?: boolean;
  }) {
    const res = await updateAiConfigFlagsAction(input);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("AI provider updated.");
    router.refresh();
  }

  return (
    <div className="grid max-w-6xl gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI configuration</h1>
          <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
            Admin only. Choose OpenAI, DeepSeek, Gemini, Anthropic, or a custom
            OpenAI-compatible endpoint. API keys are AES-256-GCM encrypted at
            rest and never stored or displayed in plaintext.
          </p>
        </div>
        <Button type="button" onClick={() => setAddProviderOpen(true)}>
          Add provider
        </Button>
      </div>

      {configs.length === 0 ? (
        <div className="rounded-3xl border p-8 text-center text-sm text-muted-foreground">
          No AI providers configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {configs.map((c) => (
            <div key={c.id} className="rounded-3xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-medium">{c.name}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{providerLabel(c.provider)}</Badge>
                    {c.isDefault ? <Badge>default</Badge> : null}
                    {!c.enabled ? (
                      <Badge variant="destructive">inactive</Badge>
                    ) : null}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${c.name} actions`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setEditingConfig(c)}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateFlags({ id: c.id, enabled: !c.enabled })}
                    >
                      <Power className="size-4" />
                      {c.enabled ? "Set inactive" : "Set active"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={c.isDefault}
                      onClick={() => updateFlags({ id: c.id, isDefault: true })}
                    >
                      <Star className="size-4" />
                      {c.isDefault ? "Current default" : "Make default"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setConfirmDelete({ id: c.id, name: c.name })}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
                <p className="truncate">{c.model}</p>
                <p className="truncate">{c.baseUrl ?? "Managed by provider SDK"}</p>
                <p>{c.hasApiKey ? "API key configured" : "No API key"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addProviderOpen} onOpenChange={setAddProviderOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add provider</DialogTitle>
            <DialogDescription>
              Configure an AI provider for resume processing and recommendations.
            </DialogDescription>
          </DialogHeader>
          <ConfigForm onSubmit={(input) => onUpsert(input)} submitLabel="Add config" />
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingConfig !== null}
        onOpenChange={(open) => !open && setEditingConfig(null)}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit provider</DialogTitle>
            <DialogDescription>
              Update the provider settings and credentials.
            </DialogDescription>
          </DialogHeader>
          {editingConfig ? (
            <ConfigForm
              key={editingConfig.id}
              onSubmit={(input) => onUpsert(input, editingConfig.id)}
              initial={editingConfig}
              submitLabel="Save config"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`Delete AI provider "${confirmDelete?.name ?? ""}"?`}
        description="This removes the provider configuration. Jobs already processed are unaffected."
        confirmLabel="Delete"
        destructive
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}
