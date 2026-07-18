# schedulex

A personal scheduler for X (Twitter): write a post, pick a time, see everything on a month
calendar. Single user, dark-only, deployed on Vercel's free tier.

<!-- Add a screenshot of the calendar view here: ![schedulex](docs/calendar.png) -->

## Why this exists

I was about to pay for an X scheduling tool when I realised the API I already subscribe to for
another project — [Post for Me](https://www.postforme.dev) — supports X. The scheduler I was
about to buy was a UI over an API I was already paying for. So I built the UI.

## The interesting part: there is no database

No Postgres, no Prisma, no SQLite, no job queue, no cron, no publish worker. The app is four
route handlers and a `grid-cols-7`.

That falls out of what Post for Me does. It owns the OAuth flow and stores and refreshes the X
tokens itself, so there are no credentials to persist. It also schedules natively — you hand it
a `scheduled_at` and it fires the post at that time — so there is no background process waiting
to publish anything.

Which means the publishing API **is** the datastore:

| Action | Implementation |
| --- | --- |
| Show the calendar | `GET /v1/social-posts`, bucketed into day cells |
| Schedule a post | `POST /v1/social-posts` with `scheduled_at` |
| Reschedule / edit | `PUT /v1/social-posts/{id}` |
| Cancel | `DELETE /v1/social-posts/{id}` |

State that would normally live in a `posts` table lives in the API that was going to receive it
anyway. Removing the database also removed the deploy story, the migration story, and the
backup story.

### The sharp edge

Post for Me embeds live X `access_token` and `refresh_token` values inside the
`social_accounts` array of **every** post response. Keeping the API key server-side isn't
enough — passing a post object straight to a client component would ship credentials that can
post as you into the page payload.

So every post crosses the server/client boundary through one whitelist function,
[`toCalendarPost`](lib/pfm.ts), and `lib/pfm.ts` starts with `import "server-only"` so any
client import fails the build rather than leaking at runtime. If you build something on this
API, check what you're forwarding.

### Where the design would run out

Threads and long-term history are the real limits — both need somewhere to put ordering and
retention, which means a database. Drafts don't: Post for Me has an `isDraft` flag, so they'd
stay a no-database feature.

## Running it

**This needs your own Post for Me account** with an X account connected — there's no hosted
version, and the API is paid.

```bash
git clone https://github.com/<you>/schedulex
cd schedulex
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

| Variable | Where it comes from |
| --- | --- |
| `POST_FOR_ME_API_KEY` | Post for Me dashboard. Use a project scoped to this app, not one shared with anything important. |
| `X_SOCIAL_ACCOUNT_ID` | `GET /v1/social-accounts` — the `id` of your connected X account |
| `APP_PASSWORD` | Whatever you want to log in with |
| `SESSION_SECRET` | `openssl rand -hex 32` |

Auth is a password in an env var, an HMAC-signed HTTP-only cookie, and a check in `proxy.ts`.
About forty lines. There is one user, so NextAuth would have been more configuration than the
code it replaced.

## Notes

- **Communities are a separate destination.** A post published into an X community is visible
  in that community and *not* to your followers — verified the hard way. The compose form lets
  you pick a community (or paste an ID), but posting to both means two separate posts.
- **280 characters.** No thread splitting.
- **No media.** Text only for now; Post for Me supports images and video via a separate upload
  endpoint.
- **Polling, not webhooks.** Status refreshes when the page loads. At one user that's plenty,
  and it avoids running a public webhook endpoint with a verification secret to manage.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Post for Me · Vercel

## License

MIT
