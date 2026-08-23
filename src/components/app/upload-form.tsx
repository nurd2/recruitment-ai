"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { uploadResumeAction } from "@/app/actions/documents";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function UploadForm({
  jobTitleId,
  label = "Upload resume (PDF or DOCX)",
}: {
  jobTitleId?: string;
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    if (jobTitleId) form.append("jobTitleId", jobTitleId);

    const res = await uploadResumeAction(form);
    if (!res.ok) {
      toast.error(res.error);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    toast.success("Resume uploaded — processing queued.");
    router.push(`/review/${res.data!.resumeDocumentId}`);
    router.refresh();
  }

  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
        onChange={onFile}
        disabled={uploading}
      />
      {uploading ? (
        <p className="text-xs text-muted-foreground">
          Uploading and queuing processing…
        </p>
      ) : null}
    </div>
  );
}
