"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import PostDialog from "./PostDialog";
import { dayKey, isSameMonth, isToday, monthGrid, type Month } from "@/lib/date";
import type { CalendarPost, PostStatus } from "@/lib/pfm";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_STYLES: Record<PostStatus, string> = {
  scheduled: "bg-accent/15 text-accent hover:bg-accent/25",
  processing: "bg-pending/15 text-pending hover:bg-pending/25",
  processed: "bg-success/15 text-success hover:bg-success/25",
  draft: "bg-surface text-muted hover:bg-edge",
};

export default function CalendarGrid({
  month,
  posts,
}: {
  month: Month;
  posts: CalendarPost[];
}) {
  const [selected, setSelected] = useState<CalendarPost | null>(null);

  // scheduled_at is UTC; which day a post lands on — and which day is "today" —
  // depends on the viewer's timezone. The server renders in UTC, so deferring
  // these to after mount avoids a hydration mismatch (and a wrong day on Vercel,
  // where the server clock is UTC but the owner is not).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true, // client snapshot
    () => false, // server snapshot
  );

  const days = useMemo(() => monthGrid(month), [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const post of posts) {
      const key = dayKey(new Date(post.scheduledAt));
      const list = map.get(key);
      if (list) list.push(post);
      else map.set(key, [post]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    }
    return map;
  }, [posts]);

  return (
    <>
      <div className="grid grid-cols-7 border-t border-l border-edge">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-r border-b border-edge px-2 py-1.5 text-center text-xs font-semibold text-muted"
          >
            <span className="sm:hidden">{day[0]}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}

        {days.map((date) => {
          const outside = !isSameMonth(date, month);
          const today = mounted && isToday(date);
          const dayPosts = mounted ? (byDay.get(dayKey(date)) ?? []) : [];

          return (
            <div
              key={date.toISOString()}
              className={`min-h-24 border-r border-b border-edge p-1.5 sm:min-h-28 ${
                outside ? "bg-surface/30" : ""
              }`}
            >
              <div
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  today ? "bg-accent font-bold text-white" : outside ? "text-muted/50" : "text-muted"
                }`}
              >
                {date.getDate()}
              </div>

              <div className="space-y-1">
                {dayPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => setSelected(post)}
                    title={post.caption}
                    className={`block w-full truncate rounded px-1.5 py-1 text-left text-xs transition-colors ${
                      STATUS_STYLES[post.status]
                    }`}
                  >
                    <span className="tabular-nums opacity-70">
                      {new Date(post.scheduledAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>{" "}
                    {post.communityId && <span title="Community post">◆ </span>}
                    {post.mediaUrls.length > 0 && <span title="Has media">▣ </span>}
                    {post.caption}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        <Legend className="bg-accent" label="Scheduled" />
        <Legend className="bg-pending" label="Processing" />
        <Legend className="bg-success" label="Published" />
        <Legend className="bg-muted" label="Draft" />
        <span className="ml-auto">◆ community · ▣ media</span>
      </div>

      {selected && <PostDialog post={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}
