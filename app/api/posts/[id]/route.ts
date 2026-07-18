import { NextResponse } from "next/server";
import { deletePost, PfmError, updatePost } from "@/lib/pfm";
import { parsePostInput } from "@/lib/validate";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;

  // PFM replaces rather than patches, so the client sends the post's full
  // intended state — including communityId, which would otherwise be dropped.
  const parsed = parsePostInput(await request.json().catch(() => ({})));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await updatePost(id, parsed.input));
  } catch (error) {
    const status = error instanceof PfmError ? error.status : 500;
    return NextResponse.json({ error: "Failed to update post" }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  try {
    await deletePost(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof PfmError ? error.status : 500;
    return NextResponse.json({ error: "Failed to delete post" }, { status });
  }
}
