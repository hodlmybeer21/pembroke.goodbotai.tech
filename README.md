# Pembroke.goodbotai.tech

Public-facing town-aware site for Pembroke, NH residents. Surfaces what's happening in town government — upcoming meetings, agendas, minutes, recent decisions — in plain English.

Live: https://pembroke.goodbotai.tech (pending Hostinger DNS)

## What's here

- **`/`** — Daily brief: wallet / commute / kids / property / family grouped, plus this-week meetings
- **`/calendar`** — Next 90 days of Select Board, Planning Board, Budget, CIP, Roads, Recreation, Conservation meetings
- **`/agendas`** — Recent agenda + minutes postings, with PDF links to the original docs
- **`/ask`** — Ask-the-bot (UI live; LLM endpoint ships in v2)
- **`/about`** — What it is, what's coming next

## How it works

Next.js 14 App Router with ISR (`revalidate: 3600`). Data comes from two public CivicEngage endpoints:

- `https://www.pembroke-nh.com/common/modules/iCalendar/iCalendar.aspx?catID=N&feed=calendar` — iCal feeds for each committee
- `https://www.pembroke-nh.com/agendacenter` — HTML agenda index

No API keys. No login. No third-party dependencies.

## Cost

Vercel hobby tier (free). Zero spend expected for the first year at NH-town scale.

## Local development

\`\`\`bash
cd pembroke.goodbotai.tech
npm install
npm run dev
# open http://localhost:3000
\`\`\`

## Project layout

See \`SPEC.md\` (what + why) and \`AGENTS.md\` (session handoff for future agents).

## v2 plan

1. OCR auto-summaries on agenda PDFs (port \`pdfocr.swift\` to a serverless endpoint, or fetch from his Mac cron output via Vercel KV)
2. Ask-the-bot LLM endpoint (Hermes Cloud or Nous Portal)
3. Login + category alerts (parent, homeowner, business owner, etc.)
4. Second town (Manchester on Granicus) to validate ingestion layer

## License

Built for Pembroke, NH residents. Free to use.
