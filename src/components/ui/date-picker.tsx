"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { type Matcher } from "react-day-picker";
import { id as indonesiaLocale } from "react-day-picker/locale";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date) : "";
}

function toDateValue(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) =>
      index === 0 ? String(part).padStart(4, "0") : String(part).padStart(2, "0"),
    )
    .join("-");
}

export function DatePicker({
  id,
  name,
  value,
  onChange,
  placeholder = "Select date",
  min,
  max,
  required,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const fromDate = parseDate(min);
  const toDate = parseDate(max);
  const disabledDates: Matcher[] = [];
  if (fromDate) disabledDates.push({ before: fromDate });
  if (toDate) disabledDates.push({ after: toDate });

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-required={required}
              aria-expanded={open}
              className={cn(
                "w-full justify-between font-normal",
                !value && "text-muted-foreground",
                className,
              )}
            />
          }
        >
          <span className="truncate">{value ? formatDate(value) : placeholder}</span>
          <CalendarDays data-icon="inline-end" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(toDateValue(date));
              setOpen(false);
            }}
            disabled={disabledDates.length > 0 ? disabledDates : undefined}
            locale={indonesiaLocale}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
