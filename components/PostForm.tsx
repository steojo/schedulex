"use client";

import { useEffect, useState } from "react";

import MediaPicker from "./MediaPicker";
import { MAX_CAPTION, parseTweetId } from "@/lib/validate";

export const BUILD_IN_PUBLIC = "1493446837214187523";

export type PostFormValues = {
  caption: string;
  scheduledAt: string; // datetime-local value; "" means post now
  communityId: string | null;
  media: string[];
  quoteTweetId: string | null;
};

/**
 * Closing the dialog unmounts this form, so without somewhere to put the
 * in-progress values a stray backdrop click throws the post away. localStorage
 * is the right store: it's per-browser state about an unsent post, not data
 * PFM should hear about until submit.
 */
function readDraft(key: string | undefined): PostFormValues | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<PostFormValues>;
    return {
      caption: typeof draft.caption === "string" ? draft.caption : "",
      scheduledAt: typeof draft.scheduledAt === "string" ? draft.scheduledAt : "",
      communityId: typeof draft.communityId === "string" ? draft.communityId : null,
      media: Array.isArray(draft.media) ? draft.media.filter((m) => typeof m === "string") : [],
      quoteTweetId: typeof draft.quoteTweetId === "string" ? draft.quoteTweetId : null,
    };
  } catch {
    // Corrupt or unreadable (private mode, quota): fall back to `initial`.
    return null;
  }
}

function clearDraft(key: string | undefined) {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

/**
 * Shared by compose and edit. `showCommunity` is off when editing: moving a
 * published-to community after the fact is confusing, so it's fixed at creation
 * — but the value is still carried through, since PFM's update replaces the
 * post and would otherwise drop it.
 */
export default function PostForm({
  initial,
  submitLabel,
  showCommunity = true,
  disabled = false,
  draftKey,
  onSubmit,
  footer,
}: {
  initial: PostFormValues;
  submitLabel: string;
  showCommunity?: boolean;
  disabled?: boolean;
  /** localStorage key to autosave to, so closing the dialog doesn't lose typing. */
  draftKey?: string;
  onSubmit: (values: PostFormValues) => Promise<string | null>;
  footer?: React.ReactNode;
}) {
  // Read once, at mount, before any state is derived — a restored draft stands
  // in for `initial` wholesale rather than merging field by field.
  const [restored] = useState(() => readDraft(draftKey));
  const start = restored ?? initial;

  const [caption, setCaption] = useState(start.caption);
  const [scheduledAt, setScheduledAt] = useState(start.scheduledAt);
  const [community, setCommunity] = useState<"none" | "bip" | "custom">(
    start.communityId === null
      ? "none"
      : start.communityId === BUILD_IN_PUBLIC
        ? "bip"
        : "custom",
  );
  const [customId, setCustomId] = useState(
    start.communityId && start.communityId !== BUILD_IN_PUBLIC ? start.communityId : "",
  );
  const [media, setMedia] = useState<string[]>(start.media);
  const [quote, setQuote] = useState(start.quoteTweetId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRestored, setShowRestored] = useState(restored !== null);

  const communityId =
    community === "none" ? null : community === "bip" ? BUILD_IN_PUBLIC : customId.trim();

  // Saves on every keystroke rather than on unmount: the tab can be closed or
  // reloaded without warning, and an unmount cleanup wouldn't fire for that.
  useEffect(() => {
    if (!draftKey) return;
    const empty =
      caption.trim() === "" && media.length === 0 && quote.trim() === "" && communityId === null;
    try {
      if (empty) window.localStorage.removeItem(draftKey);
      else
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({
            caption,
            scheduledAt,
            communityId,
            media,
            quoteTweetId: quote.trim() || null,
          } satisfies PostFormValues),
        );
    } catch {}
  }, [draftKey, caption, scheduledAt, communityId, media, quote]);

  const over = caption.length > MAX_CAPTION;
  const quoteId = parseTweetId(quote);
  const canSubmit =
    !busy && !disabled && caption.trim().length > 0 && !over && quoteId !== false &&
    (community !== "custom" || customId.trim().length > 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (quoteId === false) return;
    setBusy(true);
    setError(null);

    const message = await onSubmit({
      caption: caption.trim(),
      scheduledAt,
      communityId,
      media,
      quoteTweetId: quoteId,
    });
    if (message) {
      setError(message);
      setBusy(false);
      return;
    }
    // Only on success — a failed submit leaves the draft in place to retry.
    clearDraft(draftKey);
  }

  function discardDraft() {
    setCaption(initial.caption);
    setScheduledAt(initial.scheduledAt);
    setCommunity(
      initial.communityId === null
        ? "none"
        : initial.communityId === BUILD_IN_PUBLIC
          ? "bip"
          : "custom",
    );
    setCustomId(
      initial.communityId && initial.communityId !== BUILD_IN_PUBLIC ? initial.communityId : "",
    );
    setMedia(initial.media);
    setQuote(initial.quoteTweetId ?? "");
    setShowRestored(false);
  }

  return (
    <form onSubmit={submit}>
      {showRestored && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-edge px-3 py-1.5 text-xs text-muted">
          <span>Restored your unsent draft.</span>
          <button
            type="button"
            onClick={discardDraft}
            className="font-semibold text-fg transition-colors hover:text-danger"
          >
            Discard
          </button>
        </div>
      )}

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="What's happening?"
        rows={4}
        autoFocus
        disabled={disabled}
        className="w-full resize-none bg-transparent text-[19px] leading-6 outline-none placeholder:text-muted disabled:opacity-60"
      />

      <MediaPicker value={media} onChange={setMedia} disabled={disabled} />

      <div className="mt-3">
        <label className="text-sm text-muted">
          Quote tweet
          <input
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="Paste a tweet URL"
            disabled={disabled}
            className="mt-1 w-full rounded-md border border-edge bg-transparent px-3 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-accent disabled:opacity-60"
          />
        </label>
        {quoteId === false && (
          <p className="mt-1 text-xs text-danger">That doesn&apos;t look like a tweet URL</p>
        )}
        {quoteId && quote !== quoteId && (
          <p className="mt-1 text-xs text-muted">Quoting tweet {quoteId}</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-edge pt-3">
        <label className="text-sm text-muted">
          Schedule
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={disabled}
            // The icon is a small target; let a click anywhere in the field open
            // the picker. Not supported everywhere, and throws without a user
            // gesture, so failure just falls back to normal typing.
            onClick={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch {}
            }}
            className="ml-2 cursor-pointer rounded-md border border-edge bg-transparent px-2 py-1 text-sm text-fg outline-none focus:border-accent disabled:opacity-60"
          />
        </label>
        <span className={`text-sm tabular-nums ${over ? "text-danger" : "text-muted"}`}>
          {caption.length}/{MAX_CAPTION}
        </span>
      </div>

      {!scheduledAt && !disabled && (
        <p className="mt-2 text-xs text-muted">Leave the time empty to post immediately.</p>
      )}

      {showCommunity && (
        <div className="mt-3">
          <label className="text-sm text-muted">
            Community
            <select
              value={community}
              onChange={(e) => setCommunity(e.target.value as typeof community)}
              disabled={disabled}
              className="ml-2 rounded-md border border-edge bg-canvas px-2 py-1 text-sm text-fg outline-none focus:border-accent disabled:opacity-60"
            >
              <option value="none">None — posts to followers</option>
              <option value="bip">Build in Public</option>
              <option value="custom">Custom ID…</option>
            </select>
          </label>

          {community === "custom" && (
            <input
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              placeholder="Community ID"
              className="mt-2 w-full rounded-md border border-edge bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent"
            />
          )}

          {community !== "none" && (
            // Verified against X: a community post does not reach followers.
            <p className="mt-2 text-xs text-muted">
              Community posts are only visible in the community, not to your followers.
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex items-center gap-2">
        {footer}
        <button
          type="submit"
          disabled={!canSubmit}
          className="ml-auto rounded-full bg-accent px-4 py-1.5 text-[15px] font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
