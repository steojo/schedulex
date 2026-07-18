import { NextResponse } from "next/server";
import { createPost, listPosts, PfmError } from "@/lib/pfm";
import { parsePostInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Already projected — listPosts maps everything through toCalendarPost.
    return NextResponse.json(await listPosts());
  } catch (error) {
    const status = error instanceof PfmError ? error.status : 500;
    return NextResponse.json({ error: "Failed to load posts" }, { status });
  }
}

export async function POST(request: Request) {
  const parsed = parsePostInput(await request.json().catch(() => ({})));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await createPost(parsed.input));
  } catch (error) {
    const status = error instanceof PfmError ? error.status : 500;
    return NextResponse.json({ error: "Failed to create post" }, { status });
  }
}
