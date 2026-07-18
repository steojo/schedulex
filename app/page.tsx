import CalendarGrid from "@/components/CalendarGrid";
import ComposeButton from "@/components/ComposeButton";
import { listPosts, type CalendarPost } from "@/lib/pfm";
import { formatMonthParam, monthLabel, parseMonth, shiftMonth } from "@/lib/date";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = parseMonth(monthParam);

  // Posts arrive already projected by lib/pfm — no X tokens cross into the
  // client payload. Month nav is plain links, so this refetches server-side and
  // PFM is never touched from the browser.
  let posts: CalendarPost[];
  let error: string | null = null;
  try {
    posts = await listPosts();
  } catch {
    posts = [];
    error = "Couldn't reach Post for Me. Check POST_FOR_ME_API_KEY.";
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">{monthLabel(month)}</h1>

        <nav className="flex items-center gap-1">
          <MonthLink month={formatMonthParam(shiftMonth(month, -1))} direction="prev" />
          <MonthLink month={formatMonthParam(shiftMonth(month, 1))} direction="next" />
          <Link
            href="/"
            className="ml-1 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface hover:text-fg"
          >
            Today
          </Link>
        </nav>

        <div className="ml-auto">
          <ComposeButton />
        </div>
      </header>

      {error && (
        <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5">
        <CalendarGrid month={month} posts={posts} />
      </div>
    </main>
  );
}

function MonthLink({ month, direction }: { month: string; direction: "prev" | "next" }) {
  return (
    <Link
      href={`/?month=${month}`}
      aria-label={direction === "prev" ? "Previous month" : "Next month"}
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-fg"
    >
      {direction === "prev" ? "←" : "→"}
    </Link>
  );
}
