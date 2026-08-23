"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import {
  addStatusAction,
  deactivateStatusAction,
  reorderStatusesAction,
  setStatusColorAction,
  updateStatusAction,
} from "@/app/actions/job-titles";
import { ColorPicker } from "@/components/app/color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { isStatusColor, type StatusColor } from "@/lib/status-colors";
import type { ActionResult } from "@/lib/action-result";

type StatusRow = {
  id: string;
  name: string;
  position: number;
  isDefault: boolean;
  active: boolean;
  color: string;
};

export function StatusEditor({
  jobTitleId,
  statuses,
}: {
  jobTitleId: string;
  statuses: StatusRow[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<StatusColor>("gray");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const ordered = [...statuses].sort((a, b) => a.position - b.position);

  async function refresh<T>(
    fn: () => Promise<ActionResult<T>>,
    successMessage?: string,
  ) {
    const res = await fn();
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (successMessage) toast.success(successMessage);
    router.refresh();
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await refresh(
      () => addStatusAction(jobTitleId, newName.trim(), newColor),
      "Status added.",
    );
    setNewName("");
    setNewColor("gray");
  }

  async function onColor(id: string, color: StatusColor) {
    await refresh(() => setStatusColorAction(id, color), "Status color updated.");
  }

  async function onRename(id: string) {
    if (!editingName.trim()) return;
    await refresh(() => updateStatusAction(id, editingName.trim()), "Status updated.");
    setEditingId(null);
  }

  async function onMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    await refresh(
      () => reorderStatusesAction(jobTitleId, next.map((s) => s.id)),
      "Status order saved.",
    );
  }

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2">
        {ordered.map((s, i) => (
          <li
            key={s.id}
            className="flex items-center gap-2 rounded-2xl border px-3 py-2"
          >
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onMove(i, -1)}
                aria-label="Move up"
              >
                <ArrowUp className="size-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onMove(i, 1)}
                aria-label="Move down"
              >
                <ArrowDown className="size-3" />
              </Button>
            </div>
            {editingId === s.id ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => onRename(s.id)}
                onKeyDown={(e) => e.key === "Enter" && onRename(s.id)}
                autoFocus
                className="h-8"
              />
            ) : (
              <span
                className="flex-1 cursor-pointer"
                onClick={() => {
                  setEditingId(s.id);
                  setEditingName(s.name);
                }}
              >
                {s.name}
                {s.isDefault ? (
                  <Badge variant="secondary" className="ml-2">
                    default
                  </Badge>
                ) : null}
              </span>
            )}
            <ColorPicker
              value={isStatusColor(s.color) ? s.color : "gray"}
              onChange={(c) => onColor(s.id, c)}
              label={`Color for ${s.name}`}
              align="right"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() =>
                refresh(() => deactivateStatusAction(s.id), "Status deactivated.")
              }
              aria-label={`Deactivate ${s.name}`}
            >
              <Trash2 className="size-3" />
            </Button>
          </li>
        ))}
      </ul>
      <form onSubmit={onAdd} className="flex items-center gap-2">
        <ColorPicker value={newColor} onChange={setNewColor} label="Color for new status" />
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New status name"
          className="flex-1"
        />
        <Button type="submit" variant="outline" size="sm">
          <Plus className="size-4" /> Add
        </Button>
      </form>
    </div>
  );
}
