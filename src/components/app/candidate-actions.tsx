"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "@bprogress/next/app";
import { ArrowRightLeft, FileDown, MoreHorizontal, Pencil, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  cancelHireAction,
  changeApplicationStatusAction,
  deleteCandidateAction,
  moveApplicationAction,
  updateHiredDateAction,
  withdrawApplicationAction,
} from "@/app/actions/applications";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { jakartaDate } from "@/lib/sla";
import { cn } from "@/lib/utils";

type Props = {
  applicationId: string;
  candidateId: string;
  jobTitleId: string;
  resumeDocumentId: string | null;
  currentStatusId: string | null;
  hiredDate: string | null;
  statuses: { id: string; name: string; color: string | null }[];
  otherJobTitles: { id: string; title: string }[];
  isAdmin: boolean;
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
  hiredDate: initialHiredDate,
  statuses,
  otherJobTitles,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [hiredStatusId, setHiredStatusId] = useState<string | null>(null);
  const [hiredDate, setHiredDate] = useState(initialHiredDate ?? jakartaDate());
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawalType, setWithdrawalType] = useState<"standard" | "pre_joining">("standard");

  async function changeStatus(statusId: string, date?: string) {
    const res = await changeApplicationStatusAction({
      applicationId,
      toStatusId: statusId,
      hiredDate: date,
    });
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

  async function saveHiredDate() {
    if (!hiredStatusId) return;
    const isExistingHire =
      statuses.find((status) => status.id === currentStatusId)?.name === "Hired";
    const res = isExistingHire
      ? await updateHiredDateAction({ applicationId, hiredDate })
      : await changeApplicationStatusAction({
          applicationId,
          toStatusId: hiredStatusId,
          hiredDate,
        });
    if (!res.ok) toast.error(res.error);
    else toast.success("Hired date saved.");
    setHiredStatusId(null);
    router.refresh();
  }

  async function withdraw() {
    const res = await withdrawApplicationAction({ applicationId, withdrawalType });
    if (!res.ok) toast.error(res.error);
    else toast.success("Application withdrawn.");
    router.refresh();
  }

  async function cancelHire() {
    const reason = window.prompt("Why is this hire being canceled?")?.trim();
    if (!reason) return;
    const res = await cancelHireAction({ applicationId, reason });
    if (!res.ok) toast.error(res.error);
    else toast.success("Hire canceled and removed from fulfillment.");
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
      {!isAdmin ? (
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={`/candidates/${candidateId}?fromJobTitle=${jobTitleId}`} />}
          aria-label="Open candidate"
        >
          <UserRound className="size-4" />
        </Button>
      ) : null}
      {isAdmin ? (
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
                    onClick={() => {
                      if (s.name === "Hired") {
                        setHiredStatusId(s.id);
                        setHiredDate(jakartaDate());
                      } else {
                        void changeStatus(s.id);
                      }
                    }}
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
            <DropdownMenuItem onClick={() => setWithdrawalOpen(true)}>
              <UserRound className="size-4" /> Withdraw application
            </DropdownMenuItem>
            {statuses.find((status) => status.id === currentStatusId)?.name === "Hired" ? (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    setHiredStatusId(currentStatusId);
                    setHiredDate(initialHiredDate ?? jakartaDate());
                  }}
                >
                  <Pencil className="size-4" /> Edit Hired date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={cancelHire}>
                  <Trash2 className="size-4" /> Cancel hire
                </DropdownMenuItem>
              </>
            ) : null}
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
      ) : null}

      <Dialog
        open={hiredStatusId !== null}
        onOpenChange={(open) => !open && setHiredStatusId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Hired date</DialogTitle>
            <DialogDescription>
              Use the date the candidate was actually hired, not the date the status was updated.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="hired-date">Hired date</Label>
            <Input
              id="hired-date"
              type="date"
              value={hiredDate}
              onChange={(event) => setHiredDate(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHiredStatusId(null)}>
              Cancel
            </Button>
            <Button onClick={saveHiredDate}>Save Hired date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawalOpen} onOpenChange={setWithdrawalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw application</DialogTitle>
            <DialogDescription>
              Pre-joining withdrawal remains in historical SLA results but no longer fills the
              requirement.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="withdrawal-type">Withdrawal type</Label>
            <select
              id="withdrawal-type"
              className="h-9 rounded-4xl border border-input bg-input/30 px-3 text-sm"
              value={withdrawalType}
              onChange={(event) =>
                setWithdrawalType(event.target.value as "standard" | "pre_joining")
              }
            >
              <option value="standard">Standard withdrawal</option>
              <option value="pre_joining">Pre-joining withdrawal</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setWithdrawalOpen(false);
                await withdraw();
              }}
            >
              Withdraw application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
