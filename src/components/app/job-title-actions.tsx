"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "@bprogress/next/app";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteJobTitleAction } from "@/app/actions/job-titles";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function JobTitleActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function remove() {
    const result = await deleteJobTitleAction(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Job title removed.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`${title} actions`}>
              <MoreVertical />
            </Button>
          }
        />
        <DropdownMenuContent align="center" className="w-40">
          <DropdownMenuItem render={<Link href={`/job-title/${id}/edit`} />}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setOpen(true)}
          >
            <Trash2 /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Remove job title?"
        description="This will remove the job title from the job title list. Existing applications and audit history will be preserved."
        confirmLabel="Remove"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
