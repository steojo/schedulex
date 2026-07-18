"use client";

import { useState } from "react";

import { MAX_CAPTION } from "@/lib/validate";

export const BUILD_IN_PUBLIC = "1493446837214187523";

export type PostFormValues = {
  caption: string;
  scheduledAt: string; // datetime-local value; "" means post now
  communityId: string | null;
};

/**
 * Shared by compose and edit. `showCommunity` is off when editing — PFM's update
 * endpoint takes caption and scheduled_at, so a community can't be moved after
 * the fact without deleting and re-creating.
 */
export default function PostForm({
  initial,
  submitLabel,
  showCommunity = true,
  disabled = false,
  onSubmit,
  footer,
}: {
  initial: PostFormValues;
  submitLabel: string;
  showCommunity?: boolean;
  disabled?: boolean;
  onSubmit: (values: PostFormValues) => Promise<string | null>;
  footer?: React.ReactNode;
}) {
  const [caption, setCaption] = useState(initial.caption);
  const [scheduledAt, setScheduledAt] = useState(initial.scheduledAt);
  const [community, setCommunity] = useState<"none" | "bip" | "custom">(
    initial.communityId === null
      ? "none"
      : initial.communityId === BUILD_IN_PUBLIC
        ? "bip"
        : "custom",
  );
  const [customId, setCustomId] = useState(
    initial.communityId && initial.communityId !== BUILD_IN_PUBLIC
      ? initial.communityId
      : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const over = caption.length > MAX_CAPTION;
  const canSubmit =
    !busy && !disabled && caption.trim().length > 0 && !over &&
    (community !== "custom" || customId.trim().length > 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const communityId =
      community === "none" ? null : community === "bip" ? BUILD_IN_PUBLIC : customId.trim();

    const message = await onSubmit({ caption: caption.trim(), scheduledAt, communityId });
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="What's happening?"
        rows={4}
        autoFocus
        disabled={disabled}
        className="w-full resize-none bg-transparent text-[19px] leading-6 outline-none placeholder:text-muted disabled:opacity-60"
      />

      <div className="mt-2 flex items-center justify-between border-t border-edge pt-3">
        <label className="text-sm text-muted">
          Schedule
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={disabled}
            className="ml-2 rounded-md border border-edge bg-transparent px-2 py-1 text-sm text-fg outline-none focus:border-accent disabled:opacity-60"
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
