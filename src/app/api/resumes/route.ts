import { NextResponse } from "next/server";

import { AuthError } from "@/lib/authz";
import { createResumeUpload } from "@/lib/upload-resume";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const result = await createResumeUpload(await request.formData());
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const status = err instanceof AuthError
      ? err.message === "FORBIDDEN"
        ? 403
        : 401
      : 400;
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status });
  }
}
