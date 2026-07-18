import type { PostInput } from "./pfm";

export const MAX_CAPTION = 280;

/**
 * Shared by create and update. PFM's PUT replaces the whole post rather than
 * patching it, so both endpoints take the same full shape and validate the same
 * way.
 */
export function parsePostInput(body: unknown): { input: PostInput } | { error: string } {
  const raw = (body ?? {}) as Record<string, unknown>;

  const caption = typeof raw.caption === "string" ? raw.caption.trim() : "";
  if (!caption) return { error: "Caption is required" };
  if (caption.length > MAX_CAPTION) {
    return { error: `Caption must be ${MAX_CAPTION} characters or fewer` };
  }

  let scheduledAt: string | null = null;
  if (typeof raw.scheduledAt === "string" && raw.scheduledAt) {
    const when = new Date(raw.scheduledAt);
    if (Number.isNaN(when.getTime())) return { error: "Invalid date" };
    if (when.getTime() < Date.now()) return { error: "Pick a time in the future" };
    scheduledAt = when.toISOString();
  }

  const communityId =
    typeof raw.communityId === "string" && raw.communityId.trim()
      ? raw.communityId.trim()
      : null;

  return { input: { caption, scheduledAt, communityId } };
}
