"use client";

import { useState } from "react";
import { useRouter } from "@bprogress/next/app";
import { toast } from "sonner";

import { deleteCandidateAction } from "@/app/actions/applications";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteCandidateButton({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function onConfirm() {
    const res = await deleteCandidateAction(candidateId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Candidate deleted.");
    setOpen(false);
    router.push("/candidates");
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
        Delete candidate
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete candidate?"
        description="This soft-deletes the candidate, their applications, and resume document. The action is recorded in the audit log."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirm}
      />
    </>
  );
}
