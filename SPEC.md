# Pembroke.goodbotai.tech — Spec

A public-facing website for residents of Pembroke, NH that surfaces what's happening in town government. Companion to the personal cron bot, but generic (works for any resident from 7 to 99).

## What it does (current build)

**Landing page (`/`)**
- Today's daily brief: wallet/commute/kids/property/family grouped
- This week's upcoming meetings
- "🆕 New postings" callout for new agendas/minutes with OCR summaries + PDF links

**Calendar (`/calendar`)**
- Next 90 days of Select Board, Planning Board, Budget, CIP, Roads, Recreation, Conservation meetings
- Pulled from CivicEngage iCal feeds

**Agendas (`/agendas`)**
- List of recent agenda/minutes postings, each with an OCR auto-summary + PDF link
- OCR summaries refreshed daily from Tyler's Mac cron

**Ask the bot (`/ask`)**
- Chat widget. If `NOUS_API_KEY` env var is set on Vercel, routes to Nous Research inference API with live calendar + agenda context. Otherwise a context-aware stub matches keywords against upcoming meetings.

**Settings (`/settings`, `protected`)**
- Pick alert categories: parent / homeowner / renter / commuter / senior / business / voter
- One-click unsubscribe, delete-profile button
- Email-only delivery is one click away at the bottom of every alert

**Privacy (`/privacy`)**
- Plain-English disclosure: what's stored, why, third parties (Clerk / Resend / Vercel)
- Data minimization: email + categories + opaque unsubscribe token; nothing else

**About (`/about`)**
- What this is, who's behind it, contact info

## What it does NOT do (yet)

- **Multi-town.** Pembroke only. Multi-tenant expansion is gated on v1+ traction.
- **Telegram delivery for alerts.** Email only in v3. Telegram comes if asked.
- **Custom alert categories.** Hardcoded 7 categories — no freeform tag picker.
- **Webhook alerts to your own Slack/Discord/etc.** Email only.

## Data sources (all public, free)

| Source | Endpoint | Refresh |
| --- | --- | --- |
| CivicEngage iCal feeds | `https://www.pembroke-nh.com/common/modules/iCalendar/iCalendar.aspx?catID=N&feed=calendar` | Daily ISR (1h revalidate) |
| CivicEngage agenda center HTML | `https://www.pembroke-nh.com/agendacenter` | Daily ISR (1h revalidate) |

## Stack

- **Next.js 14** App Router (matches Vercel auto-detection)
- **Tailwind CSS** for styling (no custom CSS framework)
- **ISR** (`revalidate: 3600`) on data-heavy pages
- **No build-time data fetching** — always fresh within the revalidate window
- **No external API keys needed** for v1

## Cost

Vercel hobby tier (free): covers hobby-domain deployments, ISR, serverless functions. Daily traffic estimate ≈2-50 visits/day for first 3 months. Zero spend.

## Rollout

1. **v1 ships** with browse-only functionality (this PR)
2. **Tyler's webhook + Hostinger DNS**: CNAME `pembroke.goodbotai.tech` → Vercel target
3. **Distribution**: Pembroke Community FB group, town clerk email, local newsletter
4. **Measure**: signups (none in v1, but page visits via Vercel analytics), PostHog if needed
5. **v2 triggers on signal** (50+ recurring visitors): add OCR summaries, ask-bot LLM, login