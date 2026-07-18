import { NextResponse } from "next/server";
import { createUploadUrl, PfmError } from "@/lib/pfm";

/**
 * Mints a signed URL the browser uploads a file to directly. Behind proxy.ts,
 * so only a logged-in session can ask for one.
 */
export async function POST() {
  try {
    return NextResponse.json(await createUploadUrl());
  } catch (error) {
    const status = error instanceof PfmError ? error.status : 500;
    return NextResponse.json({ error: "Couldn't start upload" }, { status });
  }
}
