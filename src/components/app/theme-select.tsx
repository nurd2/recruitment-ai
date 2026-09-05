"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * Light / Dark / System theme switcher. Uses the app theme provider (themes
 * are applied via the `.dark` class on <html> by the theme provider).
 */
export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const value = theme ?? "system";

  return (
    <Select value={value} onValueChange={(v) => setTheme(v ?? "system")}>
      <SelectTrigger size="sm" aria-label="Theme" className="w-full">
        <SelectValue>
          {(v) => {
            const current = OPTIONS.find((o) => o.value === v);
            return (
              <span className="flex items-center gap-1.5">
                {v === "dark" ? (
                  <Moon className="size-3.5" />
                ) : (
                  <Sun className="size-3.5" />
                )}
                {current?.label ?? "System"}
              </span>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} label={o.label}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
