"use client";

import { useState } from "react";
import { useRouter } from "@bprogress/next/app";
import { toast } from "sonner";

import { deleteProcessingAction } from "@/app/actions/documents";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteDocumentButton({ resumeDocumentId }: { resumeDocumentId: string }) {
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
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this upload?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the upload &amp; processing entry. If a candidate was created from it, the
              candidate and their resume are kept. Recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
