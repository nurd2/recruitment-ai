import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { resumeDocuments } from "@/db/schema";
import { requireUser } from "@/lib/authz";
import { getFileBuffer } from "@/lib/storage";

/**
 * Private resume access: requires an authenticated session and serves the
 * file from the private bucket. Protected endpoint instead of public URLs.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  // Authorization gate: throws unless an authenticated session exists.
  await requireUser();
  const { id } = await ctx.params;

  const [doc] = await db
    .select()
    .from(resumeDocuments)
    .where(eq(resumeDocuments.id, id));
  if (!doc || doc.deletedAt) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const buffer = await getFileBuffer(doc.storagePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "STORAGE_ERROR" }, { status: 500 });
  }
}
