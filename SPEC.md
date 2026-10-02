# Pembroke.goodbotai.tech — Spec

A public-facing website for residents of Pembroke, NH that surfaces what's happening in town government. Companion to the personal cron bot, but generic (works for any resident from 7 to 99).

## What it does (v1)

**Landing page (`/`)**
- Today's daily brief: wallet/commute/kids/property/family grouped
- This week's upcoming meetings
- "🆕 New postings" callout for new agendas/minutes with PDF links

**Calendar (`/calendar`)**
- Next 90 days of Select Board, Planning Board, Budget, CIP, Roads, Recreation, Conservation meetings
- Pulled from CivicEngage iCal feeds

**Agendas (`/agendas`)**
- List of all recent agenda/minutes postings
- Each entry: committee, date, title, link to PDF
- PDF link opens the scanned file for the resident to read directly

**Ask the bot (`/ask`)** — placeholder UI in v1
- Search-style input
- Will route through a Hermes Cloud LLM once a key is wired
- v1 returns "feature coming next sprint" with an explanation

**About (`/about`)**
- What this is, who built it, how to contact the town

## What it does NOT do (yet)

- **No OCR on this site.** PDFs are linked, not auto-summarized. OCR is done by the personal cron bot (`pembroke_town_brief.py`); porting OCR to the public site is v2 work.
- **No login / profiles.** Anyone can read. Personalized alerts by life-situation is v2.
- **No ads / sponsorships.** v1 is informational only.
- **No multi-town.** Pembroke only. Multi-tenant expansion is gated on v1 traction.

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