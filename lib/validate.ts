import type { PostInput } from "./pfm";

export const MAX_CAPTION = 280;
export const MAX_MEDIA = 4;

/**
 * Accepts a bare tweet id or any x.com/twitter.com status URL. Returns null for
 * empty input, and `false` for something that isn't a tweet reference at all —
 * better to reject a mistyped URL here than to have PFM 400 on it later.
 */
export function parseTweetId(input: string): string | null | false {
  const value = input.trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return value;

  const match = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/i.exec(
    value,
  );
  return match ? match[1] : false;
}

/**
 * Shared by create and update. PFM's PUT replaces the whole post rather than
 * patching it, so both endpoints take the same full shape and validate the same
 * way — a missing field here means the post loses it.
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

  let media: string[] = [];
  if (raw.media !== undefined && raw.media !== null) {
    if (!Array.isArray(raw.media) || raw.media.some((m) => typeof m !== "string")) {
      return { error: "Invalid media" };
    }
    media = (raw.media as string[]).filter(Boolean);
    if (media.length > MAX_MEDIA) {
      return { error: `At most ${MAX_MEDIA} images per post` };
    }
  }

  let quoteTweetId: string | null = null;
  if (typeof raw.quoteTweetId === "string") {
    const parsed = parseTweetId(raw.quoteTweetId);
    if (parsed === false) return { error: "That doesn't look like a tweet URL" };
    quoteTweetId = parsed;
  }

  return { input: { caption, scheduledAt, communityId, media, quoteTweetId } };
}
