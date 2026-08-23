"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { STATUS_COLORS, statusSwatchClass, type StatusColor } from "@/lib/status-colors";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Small swatch button that opens a palette grid. Used in the status editor to
 * pick the pipeline color for an Application Status.
 */
export function ColorPicker({
  value,
  onChange,
  label = "Status color",
  align = "left",
}: {
  value: StatusColor;
  onChange: (color: StatusColor) => void;
  label?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className={cn(
              "size-5 shrink-0 rounded-full ring-1 ring-inset ring-foreground/25 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring",
              statusSwatchClass(value),
            )}
          />
        }
      />
      <PopoverContent
        role="listbox"
        aria-label={label}
        align={align === "right" ? "end" : "start"}
        className="grid w-32 grid-cols-4 gap-1.5 rounded-xl border p-2"
      >
            {STATUS_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="option"
                aria-selected={c === value}
                aria-label={c}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full ring-1 ring-inset ring-foreground/25",
                  statusSwatchClass(c),
                )}
              >
                {c === value ? (
                  <Check className="pointer-events-none size-3.5 text-white drop-shadow" />
                ) : null}
              </button>
            ))}
      </PopoverContent>
    </Popover>
  );
}
