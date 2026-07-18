@AGENTS.md

# schedulex

Personal single-user scheduler for X, built on the [Post for Me](https://www.postforme.dev)
(PFM) API. Next.js 16 App Router, TypeScript, Tailwind v4.

## Commands

```bash
npm run dev          # localhost:3000
npx tsc --noEmit     # typecheck
npx eslint .         # lint — `next lint` was removed in Next 16
npm run build
```

## Architecture: there is no database, on purpose

PFM owns the X OAuth tokens and fires scheduled posts itself, so PFM *is* the datastore. The
calendar is a read of `GET /v1/social-posts`, rescheduling a `PUT`, cancelling a `DELETE`.
There is no job queue, no cron, no publish worker, and no ORM.

Do not add a database, an auth library, a calendar library, or the PFM SDK. Each was considered
and rejected — see "the wall" below for when that changes.

## Invariants — break these and you leak credentials or lose data

**1. `lib/pfm.ts` is `server-only` and `toCalendarPost` is a whitelist.** PFM embeds live X
`access_token` and `refresh_token` values inside `social_accounts` on *every* post response.
Never spread a raw PFM object toward the client, never widen the projection without checking
what you're admitting. After touching it, re-verify:

```bash
curl -b cookies http://localhost:3000/api/posts | grep -c access_token   # must be 0
```

**2. PFM's `PUT` replaces, it does not patch.** It takes the same DTO as create, and
`social_accounts` is required. Any field you omit is stripped from the post — media, community,
quoted tweet. Callers must always send full intended state, which is why `CalendarPost` carries
`mediaUrls`, `communityId`, and `quoteTweetId`: the edit dialog can't resend what it wasn't
told. `toPfmBody` in `lib/pfm.ts` builds the body for both paths so they can't drift.

**3. X options nest under the key `x`**, not `twitter`, despite the schema being named
`TwitterConfigurationDto`. Both `community_id` and `quote_tweet_id` live there.

**4. Timezones.** `scheduled_at` is UTC; which calendar day a post lands on depends on the
viewer. `CalendarGrid` defers day-bucketing and the "today" ring until after mount via
`useSyncExternalStore`, because the server renders in UTC. Don't move that logic to the server.

## API notes

- Base URL is `https://api.postforme.dev/v1`. The marketing docs omit `/v1` and are wrong.
- The OpenAPI spec is at `https://api.postforme.dev/docs/openapi.json` (HTML-wrapped; the JSON
  is embedded and HTML-escaped). Consult it before guessing a field name.
- `GET /v1/social-posts` has **no date filter** — only `offset`/`limit`/`platform`/`status`.
  `listPosts` pages through and the month filter happens in memory.
- Media upload is two steps: `POST /v1/media/create-upload-url` server-side for a signed URL,
  then the **browser** `PUT`s the file straight to it. Files must not pass through this app.
- Community posts reach the community only, **not** your followers. Posting to both means two
  separate posts.
- `X_SOCIAL_ACCOUNT_ID` changes whenever the X account is reconnected in PFM.
- No webhooks. Polling on page load is sufficient at one user.

## The wall

Threads need a database and then some: PFM has no reply-chaining field at all (no
`in_reply_to`, no `thread_id`), so threading means holding replies somewhere and posting them
against the X API directly — which means owning X OAuth, token storage, and refresh. Recurring
posts and long-term history also need storage. Drafts do **not** — PFM has an `isDraft` flag.

If a feature requires storage, say so plainly rather than contorting the no-database design.

## Verify with the real API

Typechecking proves very little here; most bugs are in what PFM accepts. Log in via
`/api/login` with `APP_PASSWORD`, exercise the real route handlers, and confirm against PFM
itself. Clean up test posts — they publish to a real X account.
