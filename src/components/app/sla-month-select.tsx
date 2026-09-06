"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatMonth(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

export function SlaMonthSelect({ months, value }: { months: string[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function changeMonth(month: string | null) {
    if (!month) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <label className="grid min-w-[190px] gap-1 rounded-2xl border bg-white px-3 py-2 shadow-sm">
      <span className="text-xs text-slate-500">Month</span>
      <Select value={value} onValueChange={changeMonth} disabled={pending}>
        <SelectTrigger className="h-6 w-full border-0 p-0 text-base font-semibold shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month} value={month}>
              {formatMonth(month)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
