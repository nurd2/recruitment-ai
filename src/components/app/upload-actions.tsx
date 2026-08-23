"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, RefreshCw, SquareChartGantt, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { deleteProcessingAction, retryProcessingAction } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  resumeDocumentId: string;
  processingJobId: string;
  state: string;
};

export function UploadActions({ resumeDocumentId, processingJobId, state }: Props) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function retry() {
    const result = await retryProcessingAction(processingJobId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Processing queued again.");
    router.refresh();
  }

  async function remove() {
    const result = await deleteProcessingAction(resumeDocumentId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Upload & processing entry removed.");
    setDeleteOpen(false);
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Upload actions">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          {state === "needs_review" ? (
            <DropdownMenuItem render={<Link href={`/review/${resumeDocumentId}`} />}>
              <SquareChartGantt className="size-4" /> Review
            </DropdownMenuItem>
          ) : null}
          {state === "failed" ? (
            <DropdownMenuItem onClick={retry}>
              <RefreshCw className="size-4" /> Retry
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this upload?"
        description="Removes the upload & processing entry. If a candidate was created from it, the candidate and their resume are kept. Recorded in the audit log."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
