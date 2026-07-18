"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Dialog from "./Dialog";
import PostForm, { type PostFormValues } from "./PostForm";
import { toLocalInputValue } from "@/lib/date";
import type { CalendarPost } from "@/lib/pfm";

export default function PostDialog({
  post,
  onClose,
}: {
  post: CalendarPost;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already on X — editing it here would be a lie.
  const published = post.status === "processed" || post.status === "processing";

  async function save(values: PostFormValues): Promise<string | null> {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: values.caption,
        scheduledAt: values.scheduledAt
          ? new Date(values.scheduledAt).toISOString()
          : null,
        // PFM's update replaces the post, so anything not resent is stripped:
        // the community it was published to, its media, its quoted tweet.
        communityId: post.communityId,
        media: values.media,
        quoteTweetId: values.quoteTweetId,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return body.error ?? "Something went wrong";
    }

    onClose();
    router.refresh();
    return null;
  }

  async function remove() {
    setError(null);
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't delete this post");
      setConfirming(false);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Dialog title={published ? "Published post" : "Edit post"} onClose={onClose}>
      <PostForm
        initial={{
          caption: post.caption,
          scheduledAt: toLocalInputValue(post.scheduledAt),
          communityId: post.communityId,
          media: post.mediaUrls,
          quoteTweetId: post.quoteTweetId,
        }}
        submitLabel="Save"
        showCommunity={false}
        disabled={published}
        onSubmit={save}
        footer={
          confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Delete?</span>
              <button
                type="button"
                onClick={remove}
                className="rounded-full bg-danger px-3 py-1.5 text-sm font-bold text-white"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full px-3 py-1.5 text-sm text-muted hover:text-fg"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-full border border-danger/50 px-3 py-1.5 text-sm font-bold text-danger transition-colors hover:bg-danger/10"
            >
              Delete
            </button>
          )
        }
      />

      {post.failed && (
        <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2">
          <p className="text-sm font-bold text-danger">Failed to publish</p>
          {post.errorMessage && (
            <p className="mt-0.5 text-xs text-danger/80">{post.errorMessage}</p>
          )}
        </div>
      )}

      {post.tweetUrl && (
        <a
          href={post.tweetUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-bold text-accent hover:underline"
        >
          View on X ↗
        </a>
      )}

      {published && !post.failed && (
        <p className="mt-3 text-xs text-muted">
          This post has already gone out, so it can&apos;t be edited here — only deleted.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </Dialog>
  );
}
