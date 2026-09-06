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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [withdrawalDate, setWithdrawalDate] = useState(jakartaDate());
  const [withdrawalType, setWithdrawalType] = useState<"standard" | "pre_joining">("standard");
  const [cancelHireOpen, setCancelHireOpen] = useState(false);
  const [cancelHireReason, setCancelHireReason] = useState("");
  const [cancelHirePending, setCancelHirePending] = useState(false);

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
    const res = await withdrawApplicationAction({ applicationId, withdrawalDate, withdrawalType });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setWithdrawalOpen(false);
    toast.success("Application withdrawn.");
    router.refresh();
  }

  async function cancelHire() {
    const reason = cancelHireReason.trim();
    if (!reason) return;
    setCancelHirePending(true);
    const res = await cancelHireAction({ applicationId, reason });
    setCancelHirePending(false);
    if (!res.ok) toast.error(res.error);
    else {
      setCancelHireOpen(false);
      setCancelHireReason("");
      toast.success("Hire canceled and removed from fulfillment.");
    }
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
            <DropdownMenuItem
              onClick={() => {
                setWithdrawalDate(jakartaDate());
                setWithdrawalOpen(true);
              }}
            >
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
                <DropdownMenuItem onClick={() => setCancelHireOpen(true)}>
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
            <DatePicker id="hired-date" value={hiredDate} onChange={setHiredDate} required />
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
            <Select
              value={withdrawalType}
              onValueChange={(value) =>
                setWithdrawalType((value ?? "standard") as "standard" | "pre_joining")
              }
            >
              <SelectTrigger id="withdrawal-type" className="w-full">
                <SelectValue placeholder="Select withdrawal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="standard">Standard withdrawal</SelectItem>
                  <SelectItem value="pre_joining">Pre-joining withdrawal</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="withdrawal-date">Withdrawal date</Label>
            <DatePicker
              id="withdrawal-date"
              value={withdrawalDate}
              onChange={setWithdrawalDate}
              max={jakartaDate()}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await withdraw();
              }}
            >
              Withdraw application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelHireOpen} onOpenChange={setCancelHireOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel hire</DialogTitle>
            <DialogDescription>
              This removes the hire from fulfillment. Explain why the hire is being canceled.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="hire-cancellation-reason">Reason</Label>
            <Textarea
              id="hire-cancellation-reason"
              value={cancelHireReason}
              onChange={(event) => setCancelHireReason(event.target.value)}
              placeholder="Enter the cancellation reason"
              maxLength={1000}
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={cancelHirePending}
              onClick={() => setCancelHireOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={cancelHirePending || !cancelHireReason.trim()} onClick={cancelHire}>
              {cancelHirePending ? "Please wait..." : "Cancel hire"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title ?? ""}</AlertDialogTitle>
            {confirm?.description ? (
              <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm?.destructive ? "destructive" : "default"}
              onClick={async () => {
                if (!confirm) return;
                setConfirm(null);
                await confirm.action();
              }}
            >
              {confirm?.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
