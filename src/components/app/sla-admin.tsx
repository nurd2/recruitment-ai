"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteHolidayAction, deleteSlaPolicyAction, importHolidaysAction, saveHolidayAction, saveSlaPolicyAction } from "@/app/actions/sla";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Policy = { id: string; grade: string; workingDays: number };
type Holiday = { id: string; date: string; name: string; type: string };

export function SlaAdmin({ policies, holidays }: { policies: Policy[]; holidays: Holiday[] }) {
  const router = useRouter();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [calendarYear, setCalendarYear] = useState(String(new Date().getFullYear()));
  const [holidayType, setHolidayType] = useState("national_holiday");
  const [busy, setBusy] = useState(false);
  const calendarYears = [...new Set([
    String(new Date().getFullYear()),
    ...holidays.map((holiday) => holiday.date.slice(0, 4)),
  ])].sort((a, b) => b.localeCompare(a));
  const visibleHolidays = holidays.filter((holiday) =>
    holiday.date.startsWith(`${calendarYear}-`),
  );
  async function run(action: Promise<{ ok: boolean; error?: string }>, message: string) {
    setBusy(true);
    const result = await action;
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else { toast.success(message); router.refresh(); }
  }
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader><CardTitle>SLA policies</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <form className="flex flex-wrap items-end gap-3" action={(form) => run(saveSlaPolicyAction({ grade: form.get("grade"), workingDays: form.get("workingDays") }), "SLA policy saved") }>
            <div className="grid gap-1"><Label htmlFor="grade">Grade</Label><Input id="grade" name="grade" placeholder="staff" required /></div>
            <div className="grid gap-1"><Label htmlFor="workingDays">Working days</Label><Input id="workingDays" name="workingDays" type="number" min="1" required /></div>
            <Button type="submit" disabled={busy}>Save policy</Button>
          </form>
          <div className="grid gap-2">{policies.map((policy) => <div key={policy.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"><span><strong>{policy.grade}</strong> <span className="text-muted-foreground">{policy.workingDays} working days</span></span><Button variant="ghost" size="sm" onClick={() => run(deleteSlaPolicyAction(policy.id), "SLA policy deleted")}>Delete</Button></div>)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Holiday calendar</CardTitle><p className="text-sm text-muted-foreground">Weekends and listed national holidays are excluded from SLA calculations.</p></CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid gap-1 sm:w-56">
              <Label htmlFor="calendarYear">Calendar year</Label>
              <Select value={calendarYear} onValueChange={(value) => setCalendarYear(value ?? String(new Date().getFullYear()))}>
                <SelectTrigger id="calendarYear" className="w-full"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent><SelectGroup>{calendarYears.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </div>
            <form className="ml-auto flex flex-wrap items-end gap-3" action={() => run(importHolidaysAction(Number(year)), `Imported holidays for ${year}`)}><div className="grid gap-1"><Label htmlFor="year">Import year</Label><Input id="year" value={year} onChange={(e) => setYear(e.target.value)} type="number" /></div><Button type="submit" disabled={busy}>Import from API</Button></form>
          </div>
          <form className="grid gap-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-end" action={(form) => run(saveHolidayAction({ date: form.get("date"), name: form.get("name"), type: form.get("type") }), "Holiday saved")}>
            <div className="grid gap-1"><Label htmlFor="date">Date</Label><Input id="date" name="date" type="date" required /></div>
            <div className="grid gap-1"><Label htmlFor="name">Name</Label><Input id="name" name="name" placeholder="Company holiday" required /></div>
            <div className="grid gap-1">
              <Label htmlFor="holidayType">Type</Label>
              <input name="type" type="hidden" value={holidayType} />
              <Select value={holidayType} onValueChange={(value) => setHolidayType(value ?? "national_holiday")}>
                <SelectTrigger id="holidayType" className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="national_holiday">National holiday</SelectItem><SelectItem value="collective_leave">Collective leave</SelectItem></SelectGroup></SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={busy}>Add date</Button>
          </form>
          <div className="grid gap-2">{visibleHolidays.length ? visibleHolidays.map((holiday) => <div key={holiday.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"><span><strong>{holiday.date}</strong> {holiday.name} <span className="text-muted-foreground">({holiday.type === "collective_leave" ? "Collective leave" : "National holiday"})</span></span><Button variant="ghost" size="sm" onClick={() => run(deleteHolidayAction(holiday.id), "Holiday deleted")}>Delete</Button></div>) : <p className="py-6 text-center text-sm text-muted-foreground">No holidays recorded for {calendarYear}.</p>}</div>
        </CardContent>
      </Card>
    </div>
  );
}
