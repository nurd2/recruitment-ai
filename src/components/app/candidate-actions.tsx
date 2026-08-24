"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "@bprogress/next/app";
import { ArrowRightLeft, FileDown, MoreHorizontal, Pencil, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  changeApplicationStatusAction,
  deleteCandidateAction,
  moveApplicationAction,
  withdrawApplicationAction,
} from "@/app/actions/applications";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { statusDotClass } from "@/lib/status-colors";
import { cn } from "@/lib/utils";

type Props = {
  applicationId: string;
  candidateId: string;
  jobTitleId: string;
  resumeDocumentId: string | null;
  currentStatusId: string | null;
  statuses: { id: string; name: string; color: string | null }[];
  otherJobTitles: { id: string; title: string }[];
};

type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  action: () => Promise<void>;
};

export function CandidateActions({
  applicationId,
  candidateId,
  jobTitleId,
  resumeDocumentId,
  currentStatusId,
  statuses,
  otherJobTitles,
}: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  async function changeStatus(statusId: string) {
    const res = await changeApplicationStatusAction({ applicationId, toStatusId: statusId });
    if (!res.ok) toast.error(res.error);
    else toast.success("Application status updated.");
    router.refresh();
  }

  async function moveTo(toJobTitleId: string) {
    const res = await moveApplicationAction({ applicationId, toJobTitleId });
    if (!res.ok) toast.error(res.error);
    else toast.success("Application moved to the new job title.");
    router.refresh();
  }

  async function withdraw() {
    const res = await withdrawApplicationAction(applicationId);
    if (!res.ok) toast.error(res.error);
    else toast.success("Application withdrawn.");
    router.refresh();
  }

  async function removeCandidate() {
    const res = await deleteCandidateAction(candidateId);
    if (!res.ok) toast.error(res.error);
    else toast.success("Candidate deleted.");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Candidate actions">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {statuses.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  disabled={s.id === currentStatusId}
                  onClick={() => changeStatus(s.id)}
                >
                  <span className={cn("size-2 shrink-0 rounded-full", statusDotClass(s.color))} />
                  {s.name}
                  {s.id === currentStatusId ? " (current)" : ""}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {otherJobTitles.length > 0 ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeft className="size-4" /> Move to job title
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {otherJobTitles.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => moveTo(t.id)}>
                    {t.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
          <DropdownMenuItem
            render={<Link href={`/candidates/${candidateId}?fromJobTitle=${jobTitleId}`} />}
          >
            <UserRound className="size-4" /> Open candidate
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`/candidates/${candidateId}/edit`} />}>
            <Pencil className="size-4" /> Edit candidate
          </DropdownMenuItem>
          {resumeDocumentId ? (
            <DropdownMenuItem
              render={
                <a
                  href={`/api/resumes/${resumeDocumentId}/download`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <FileDown className="size-4" /> Open resume
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              setConfirm({
                title: "Withdraw application?",
                description:
                  "This deactivates the application. The candidate and their other applications are retained.",
                confirmLabel: "Withdraw",
                destructive: false,
                action: withdraw,
              })
            }
          >
            <UserRound className="size-4" /> Withdraw application
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              setConfirm({
                title: "Delete candidate?",
                description:
                  "This soft-deletes the candidate, their applications, and resume document. The action is recorded in the audit log.",
                confirmLabel: "Delete",
                destructive: true,
                action: removeCandidate,
              })
            }
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" /> Delete candidate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        destructive={confirm?.destructive}
        onConfirm={async () => {
          if (!confirm) return;
          setConfirm(null);
          await confirm.action();
        }}
      />
    </>
  );
}
