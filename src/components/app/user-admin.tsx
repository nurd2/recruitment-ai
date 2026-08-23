"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  changeRoleAction,
  createUserAction,
  deleteUserAction,
  setUserActiveAction,
} from "@/app/actions/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string | Date;
};

export function UserAdmin({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<UserRow | null>(null);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const form = new FormData(e.currentTarget);
    const res = await createUserAction({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      role: String(form.get("role") ?? "recruiter") as "admin" | "recruiter",
    });
    if (!res.ok) {
      toast.error(res.error);
      setCreating(false);
      return;
    }
    (e.target as HTMLFormElement).reset();
    setCreating(false);
    toast.success("User created.");
    router.refresh();
  }

  async function onRole(userId: string, role: string) {
    const res = await changeRoleAction({
      userId,
      role: role as "admin" | "recruiter",
    });
    if (!res.ok) toast.error(res.error);
    else toast.success("Role updated.");
    router.refresh();
  }

  async function onActive(userId: string, active: boolean) {
    const res = await setUserActiveAction({ userId, active });
    if (!res.ok) toast.error(res.error);
    else toast.success(active ? "User deactivated." : "User activated.");
    router.refresh();
  }

  async function onDeleteConfirmed() {
    if (!deleting) return;
    const res = await deleteUserAction({ userId: deleting.id });
    setDeleting(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("User deleted.");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <form
        onSubmit={onCreate}
        className="grid max-w-xl gap-4 rounded-3xl border p-4"
      >
        <h2 className="text-sm font-semibold">Add user</h2>
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Temporary password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="role">Role</Label>
          <Select name="role" defaultValue="recruiter">
            <SelectTrigger id="role" className="w-full">
              <SelectValue>
                {(value) => (value === "admin" ? "Admin" : "Recruiter")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recruiter" label="Recruiter">Recruiter</SelectItem>
              <SelectItem value="admin" label="Admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={creating} className="w-fit">
          {creating ? "Adding…" : "Add user"}
        </Button>
      </form>

      <div className="grid gap-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
          >
            <div>
              <p className="font-medium">
                {u.name}
                {u.id === currentUserId ? (
                  <Badge variant="outline" className="ml-2">
                    you
                  </Badge>
                ) : null}
              </p>
              <p className="text-sm text-muted-foreground">
                {u.email} · added {formatDate(u.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={u.banned ? "destructive" : "secondary"}>
                {u.banned ? "inactive" : u.role}
              </Badge>
              <Select
                value={u.role}
                disabled={u.banned}
                onValueChange={(v) => onRole(u.id, v ?? "recruiter")}
              >
                <SelectTrigger size="sm" aria-label={`Role for ${u.name}`}>
                  <SelectValue>
                    {(value) => (value === "admin" ? "Admin" : "Recruiter")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruiter" label="Recruiter">Recruiter</SelectItem>
                  <SelectItem value="admin" label="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onActive(u.id, u.banned)}
              >
                {u.banned ? "Activate" : "Deactivate"}
              </Button>
              {u.id !== currentUserId ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleting(u)}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete user "${deleting?.name ?? ""}"?`}
        description="This removes the user and cannot be undone."
        confirmLabel="Delete user"
        destructive
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}
