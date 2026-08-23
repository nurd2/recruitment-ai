"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteProcessingAction } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteDocumentButton({
  resumeDocumentId,
}: {
  resumeDocumentId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function onConfirm() {
    const res = await deleteProcessingAction(resumeDocumentId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Upload & processing entry removed.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this upload?"
        description="Removes the upload & processing entry. If a candidate was created from it, the candidate and their resume are kept. Recorded in the audit log."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirm}
      />
    </>
  );
}
