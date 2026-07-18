"use client";

import { useRef, useState } from "react";
import { MAX_MEDIA } from "@/lib/validate";

/**
 * On edit we only get URLs back from PFM, not MIME types, so kind is inferred
 * from the extension. Only used to pick <img> vs <video> and to enforce X's
 * mixing rule — a wrong guess degrades to a broken thumbnail, not a bad post.
 */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm|avi)(\?|$)/i.test(url);
}

export default function MediaPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const hasVideo = value.some(isVideoUrl);
  // X allows up to 4 images, or a single video — never both.
  const full = hasVideo || value.length + uploading >= MAX_MEDIA;

  async function upload(file: File): Promise<string> {
    const res = await fetch("/api/media/upload-url", { method: "POST" });
    if (!res.ok) throw new Error("Couldn't start upload");
    const { mediaUrl, uploadUrl } = (await res.json()) as {
      mediaUrl: string;
      uploadUrl: string;
    };

    // Straight to storage — the signed URL is why the file never touches our
    // server, and why there's no request size limit to worry about.
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) throw new Error(`Upload failed for ${file.name}`);

    return mediaUrl;
  }

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // let the same file be picked again after removal
    if (files.length === 0) return;

    setError(null);

    const video = files.find((f) => f.type.startsWith("video/"));
    if (video && (files.length > 1 || value.length > 0)) {
      setError("A video can't be combined with other media");
      return;
    }
    if (!video && hasVideo) {
      setError("Remove the video before adding images");
      return;
    }

    const room = MAX_MEDIA - value.length;
    const accepted = video ? [video] : files.slice(0, room);
    if (!video && files.length > room) {
      setError(`Only ${MAX_MEDIA} images per post — extra files were skipped`);
    }

    setUploading((n) => n + accepted.length);
    // Sequential: keeps partial success intelligible when one file fails.
    for (const file of accepted) {
      try {
        const url = await upload(file);
        onChange([...value, url]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={onFiles}
      />

      {(value.length > 0 || uploading > 0) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((url) => (
            <div key={url} className="relative">
              {isVideoUrl(url) ? (
                <video
                  src={url}
                  className="h-20 w-20 rounded-lg border border-edge object-cover"
                />
              ) : (
                // Remote PFM storage; next/image would need domain config for no gain here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-lg border border-edge object-cover"
                />
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((u) => u !== url))}
                  aria-label="Remove media"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-canvas text-xs text-fg ring-1 ring-edge hover:bg-surface"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {Array.from({ length: uploading }, (_, i) => (
            <div
              key={`uploading-${i}`}
              className="flex h-20 w-20 animate-pulse items-center justify-center rounded-lg border border-edge text-xs text-muted"
            >
              …
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={full}
          className="rounded-full border border-edge px-3 py-1.5 text-sm text-fg transition-colors hover:bg-surface disabled:opacity-40"
        >
          Add media
        </button>
      )}

      {full && !disabled && (
        <span className="ml-2 text-xs text-muted">
          {hasVideo ? "One video per post" : `${MAX_MEDIA} images max`}
        </span>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
