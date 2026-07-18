"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Dialog from "./Dialog";
import PostForm, { type PostFormValues } from "./PostForm";

export default function ComposeButton({ presetDate }: { presetDate?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function create(values: PostFormValues): Promise<string | null> {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: values.caption,
        // datetime-local has no zone; new Date() reads it as local, which is
        // what the user meant. The route converts to UTC for PFM.
        scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : null,
        communityId: values.communityId,
        media: values.media,
        quoteTweetId: values.quoteTweetId,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return body.error ?? "Something went wrong";
    }

    setOpen(false);
    router.refresh();
    return null;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-accent px-4 py-1.5 text-[15px] font-bold text-white transition-colors hover:bg-accent-hover"
      >
        Compose
      </button>

      {open && (
        <Dialog title="New post" onClose={() => setOpen(false)}>
          <PostForm
            initial={{
              caption: "",
              scheduledAt: presetDate ?? "",
              communityId: null,
              media: [],
              quoteTweetId: null,
            }}
            submitLabel="Schedule"
            onSubmit={create}
          />
        </Dialog>
      )}
    </>
  );
}
