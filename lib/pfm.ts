// Post for Me API client. Server-only — importing this from a client component
// is a build error, which is the point: the API key is a full-access bearer
// token and this repo is public.
import "server-only";

const BASE = "https://api.postforme.dev/v1";

export type PostStatus = "draft" | "scheduled" | "processing" | "processed";

/** The only post shape allowed to reach the browser. See toCalendarPost. */
export type CalendarPost = {
  id: string;
  caption: string;
  status: PostStatus;
  scheduledAt: string;
  communityId: string | null;
  mediaUrls: string[];
  quoteTweetId: string | null;
};

type PfmPost = {
  id: string;
  caption: string;
  status: PostStatus;
  scheduled_at: string | null;
  created_at: string;
  media?: { url: string }[];
  platform_configurations?: {
    x?: { community_id?: string; quote_tweet_id?: string };
  };
};

function apiKey(): string {
  const key = process.env.POST_FOR_ME_API_KEY;
  if (!key) throw new Error("POST_FOR_ME_API_KEY is not set");
  return key;
}

export function accountId(): string {
  const id = process.env.X_SOCIAL_ACCOUNT_ID;
  if (!id) throw new Error("X_SOCIAL_ACCOUNT_ID is not set");
  return id;
}

export class PfmError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function pfm<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    // Don't surface the raw PFM body to callers — it echoes the request back
    // and could carry account details into a client-visible error message.
    throw new PfmError(res.status, `PFM ${method} ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/**
 * SECURITY BOUNDARY — do not widen without thinking hard.
 *
 * PFM embeds live X `access_token` and `refresh_token` values inside the
 * `social_accounts` array of every post response. Anyone holding those can post
 * as the account owner. Keeping POST_FOR_ME_API_KEY server-side is NOT enough:
 * forwarding a raw PFM object to a client component leaks the tokens straight
 * into the page payload.
 *
 * So every post crossing to the browser goes through this whitelist. Never
 * spread the raw object, never add `social_accounts`, never return `...raw`.
 */
export function toCalendarPost(raw: PfmPost): CalendarPost {
  return {
    id: raw.id,
    caption: raw.caption,
    status: raw.status,
    // Published posts have no scheduled_at; fall back so they still land on a day.
    scheduledAt: raw.scheduled_at ?? raw.created_at,
    communityId: raw.platform_configurations?.x?.community_id ?? null,
    // Media and quote survive edits only because they're carried here — PFM's
    // update replaces the post, so the edit dialog has to resend them.
    mediaUrls: raw.media?.map((m) => m.url) ?? [],
    quoteTweetId: raw.platform_configurations?.x?.quote_tweet_id ?? null,
  };
}

type Paginated<T> = { data: T[]; meta: { total: number; next: string | null } };

/**
 * The list endpoint has no date-range filter — only offset/limit/platform/
 * status. So the calendar pages through everything and filters by month in
 * memory. Fine at one-user volume; the cap stops a runaway loop.
 */
export async function listPosts(): Promise<CalendarPost[]> {
  const LIMIT = 100;
  const MAX = 1000;
  const out: CalendarPost[] = [];

  for (let offset = 0; offset < MAX; offset += LIMIT) {
    const page = await pfm<Paginated<PfmPost>>(
      "GET",
      `/social-posts?limit=${LIMIT}&offset=${offset}`,
    );
    out.push(...page.data.map(toCalendarPost));
    if (!page.meta.next || page.data.length < LIMIT) break;
  }
  return out;
}

export type PostInput = {
  caption: string;
  scheduledAt: string | null;
  communityId: string | null;
  media: string[];
  quoteTweetId: string | null;
};

/**
 * Create and update take the same body — PFM's PUT replaces rather than
 * patches — so it's built in one place. Anything omitted here is dropped from
 * the post, which is why callers must always pass full state.
 */
function toPfmBody(input: PostInput) {
  // Both X options live under the "x" key, even though the schema that defines
  // them is named TwitterConfigurationDto.
  const x = {
    ...(input.communityId ? { community_id: input.communityId } : {}),
    ...(input.quoteTweetId ? { quote_tweet_id: input.quoteTweetId } : {}),
  };

  return {
    caption: input.caption,
    social_accounts: [accountId()],
    // null or omitted means publish immediately.
    scheduled_at: input.scheduledAt,
    media: input.media.map((url) => ({ url })),
    ...(Object.keys(x).length > 0 ? { platform_configurations: { x } } : {}),
  };
}

export async function createPost(input: PostInput): Promise<CalendarPost> {
  return toCalendarPost(await pfm<PfmPost>("POST", "/social-posts", toPfmBody(input)));
}

/**
 * Two-step upload. This step needs the API key, so it stays on the server; the
 * returned `uploadUrl` is a short-lived signed storage URL the browser PUTs the
 * file to directly, so files never pass through this app.
 */
export async function createUploadUrl(): Promise<{
  mediaUrl: string;
  uploadUrl: string;
}> {
  const res = await pfm<{ media_url: string; upload_url: string }>(
    "POST",
    "/media/create-upload-url",
  );
  return { mediaUrl: res.media_url, uploadUrl: res.upload_url };
}

/**
 * PFM's PUT REPLACES the post rather than patching it, and `social_accounts` is
 * required. Callers must pass full intended state: sending only `caption` 400s,
 * and omitting media, community, or quote silently strips them from the post.
 */
export async function updatePost(id: string, input: PostInput): Promise<CalendarPost> {
  return toCalendarPost(
    await pfm<PfmPost>("PUT", `/social-posts/${id}`, toPfmBody(input)),
  );
}

export async function deletePost(id: string): Promise<void> {
  await pfm("DELETE", `/social-posts/${id}`);
}
