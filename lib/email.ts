// lib/email.ts — Resend client + alert template.

import { Resend } from "resend";
import "server-only";

export interface AlertEmailInput {
  to: string;
  unsubscribeToken: string;
  committee: string;
  docType: "Agenda" | "Minutes";
  meetingDate: string;
  title: string;
  url: string;
  summary: string;
}

const FROM_ADDRESS =
  process.env.ALERT_FROM_EMAIL ?? "Pembroke Town Brief <brief@pembroke.goodbotai.tech>";
const SITE_BASE = process.env.SITE_BASE_URL ?? "https://pembroke.goodbotai.tech";

function unsubscribeUrl(token: string): string {
  return `${SITE_BASE}/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtWeek(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export interface WeeklyDigestInput {
  to: string;
  unsubscribeToken: string;
  weekStart: Date;
  weekEnd: Date;
  personaLabel: string | null;
  snow: { title: string; until: Date; url: string } | null;
  thisWeek: { committee: string; title: string; when: Date; url?: string }[];
  newDocs: { committee: string; title: string; when: Date; url?: string; docType?: string }[];
  forYou: { committee: string; title: string; when: Date; url?: string }[];
}

export function buildWeeklyDigestHtml(input: WeeklyDigestInput): string {
  const { to: _to, unsubscribeToken, weekStart, weekEnd, personaLabel, snow, thisWeek, newDocs, forYou } = input;
  const weekRange = `${fmtWeek(weekStart)} – ${fmtWeek(weekEnd)}`;
  const unSub = unsubscribeUrl(unsubscribeToken);

  const snowBlock = snow
    ? `<tr><td style="padding:0 0 16px 0;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:14px 16px">
<a href="${esc(snow.url)}" style="font-size:15px;font-weight:600;color:#92400e;text-decoration:none">❄ ${esc(snow.title)}</a>
<div style="font-size:12px;color:#92400e;margin-top:4px">Until ${snow.until.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
</td></tr>`
    : "";

  const personaLine = personaLabel
    ? `<div style="font-size:12px;color:#57534e;margin-top:4px">For ${esc(personaLabel)}</div>`
    : "";

  const fmtItem = (it: { committee: string; title: string; when: Date; url?: string }, withTime = false) => {
    const when = withTime
      ? it.when.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : it.when.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const titleCell = it.url
      ? `<a href="${esc(it.url)}" style="color:#1e3a8a;text-decoration:underline">${esc(it.title)}</a>`
      : esc(it.title);
    return `<tr><td style="padding:0 0 8px 0;font-size:12px;color:#57534e">${when} · ${esc(it.committee)}</td></tr>
<tr><td style="padding:0 0 12px 0;font-size:14px;line-height:1.45">${titleCell}</td></tr>`;
  };

  const thisWeekBlock = thisWeek.length
    ? `<tr><td style="padding:24px 0 8px 0;font-size:13px;font-weight:600;color:#1c1917;text-transform:uppercase;letter-spacing:0.05em">Meetings this week</td></tr>
${thisWeek.map((i) => fmtItem(i, true)).join("")}`
    : "";

  const newDocsBlock = newDocs.length
    ? `<tr><td style="padding:24px 0 8px 0;font-size:13px;font-weight:600;color:#1c1917;text-transform:uppercase;letter-spacing:0.05em">New postings</td></tr>
${newDocs.map((i) => fmtItem(i, false)).join("")}`
    : "";

  const forYouBlock = forYou.length
    ? `<tr><td style="padding:24px 0 8px 0;font-size:13px;font-weight:600;color:#1c1917;text-transform:uppercase;letter-spacing:0.05em">Picked for you</td></tr>
${forYou.map((i) => fmtItem(i, false)).join("")}`
    : "";

  const empty = thisWeek.length === 0 && newDocs.length === 0 && forYou.length === 0
    ? `<tr><td style="padding:24px 0;font-size:14px;color:#57534e;line-height:1.55">Nothing new this week that matches your alert preferences. <a href="${SITE_BASE}/settings" style="color:#1e3a8a">Adjust your preferences</a> if you want to see more.</td></tr>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;font-family:-apple-system,Segoe UI,sans-serif;background:#fafaf9;color:#1c1917">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;padding:24px 16px">
<tr><td style="padding:0 0 8px 0;font-size:22px;font-weight:600">Your week in Pembroke</td></tr>
<tr><td style="padding:0 0 4px 0;font-size:13px;color:#57534e">${weekRange}</td></tr>
${personaLine ? `<tr><td>${personaLine}</td></tr>` : ""}
${snowBlock}
${empty}
${forYouBlock}
${thisWeekBlock}
${newDocsBlock}
<tr><td style="padding:24px 0 0 0;border-top:1px solid #e7e5e4;font-size:11px;color:#78716c;line-height:1.5">
You're getting this weekly digest because you picked alert categories at <a href="${SITE_BASE}/settings" style="color:#78716c">pembroke.goodbotai.tech/settings</a>. <a href="${unSub}" style="color:#78716c">Unsubscribe</a>.
</td></tr>
</table>
</body></html>`;
}

export function buildWeeklyDigestText(input: WeeklyDigestInput): string {
  const lines: string[] = [];
  lines.push(`Your week in Pembroke`);
  lines.push(`${input.weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${input.weekEnd.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`);
  if (input.personaLabel) lines.push(`For ${input.personaLabel}`);
  if (input.snow) {
    lines.push("");
    lines.push(`❄ ${input.snow.title}`);
    lines.push(`Until ${input.snow.until.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}`);
    lines.push(input.snow.url);
  }
  if (input.forYou.length) {
    lines.push("");
    lines.push("PICKED FOR YOU");
    for (const i of input.forYou) {
      lines.push(`- ${input.forYou.length ? "" : ""}${i.committee} — ${i.title} (${i.when.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`);
      if (i.url) lines.push(`  ${i.url}`);
    }
  }
  if (input.thisWeek.length) {
    lines.push("");
    lines.push("MEETINGS THIS WEEK");
    for (const i of input.thisWeek) {
      lines.push(
        `- ${i.when.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} — ${i.committee} — ${i.title}`,
      );
    }
  }
  if (input.newDocs.length) {
    lines.push("");
    lines.push("NEW POSTINGS");
    for (const i of input.newDocs) {
      lines.push(
        `- ${i.when.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} — ${i.committee} — ${i.title}`,
      );
      if (i.url) lines.push(`  ${i.url}`);
    }
  }
  if (
    input.forYou.length === 0 &&
    input.thisWeek.length === 0 &&
    input.newDocs.length === 0
  ) {
    lines.push("");
    lines.push("Nothing new this week that matches your alert preferences.");
  }
  lines.push("");
  lines.push("Adjust preferences: https://pembroke.goodbotai.tech/settings");
  lines.push("Unsubscribe: " + unsubscribeUrl(input.unsubscribeToken));
  return lines.join("\n");
}

export function buildEmailHtml(input: AlertEmailInput): string {
  const { committee, docType, meetingDate, title, url, summary, unsubscribeToken } = input;
  const safeSummary = summary
    .slice(0, 800)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const unSub = unsubscribeUrl(unsubscribeToken);
  return `<!doctype html>
<html><body style="margin:0;font-family:-apple-system,Segoe UI,sans-serif;background:#fafaf9;color:#1c1917">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;padding:24px 16px">
<tr><td style="padding:0 0 16px 0;font-size:13px;color:#57534e">
📍 Pembroke NH town brief
</td></tr>
<tr><td style="padding:0 0 8px 0;font-size:18px;font-weight:600">
${safeTitle}
</td></tr>
<tr><td style="padding:0 0 16px 0;font-size:13px;color:#57534e">
${committee} · ${docType} · ${meetingDate}
</td></tr>
<tr><td style="padding:0 0 16px 0;font-size:14px;line-height:1.55;white-space:pre-wrap">${safeSummary}</td></tr>
<tr><td style="padding:0 0 16px 0">
<a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;font-size:14px;text-decoration:none">Read the full document</a>
</td></tr>
<tr><td style="padding:16px 0 0 0;border-top:1px solid #e7e5e4;font-size:11px;color:#78716c">
You're receiving this because you picked categories that match this posting at <a href="${SITE_BASE}" style="color:#78716c">pembroke.goodbotai.tech</a>. Update categories at <a href="${SITE_BASE}/settings" style="color:#78716c">/settings</a>. <a href="${unSub}" style="color:#78716c">Unsubscribe</a>.
</td></tr>
</table>
</body></html>`;
}

export async function sendAlert(input: AlertEmailInput): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const resend = new Resend(apiKey);
  const html = buildEmailHtml(input);
  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: `New ${input.docType.toLowerCase()}: ${input.committee} — ${input.meetingDate}`,
      html,
    });
    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (ex) {
    return { ok: false, error: String(ex) };
  }
}

// Send the weekly digest. Subject includes the week range so users
// can search their inbox for past digests.
export async function sendWeeklyDigest(
  input: WeeklyDigestInput,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const resend = new Resend(apiKey);
  const html = buildWeeklyDigestHtml(input);
  const text = buildWeeklyDigestText(input);
  const weekRange = `${input.weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${input.weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  const subject = input.snow
    ? `❄ Your week in Pembroke — ${weekRange} (snow emergency)`
    : `Your week in Pembroke — ${weekRange}`;
  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject,
      html,
      text,
    });
    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (ex) {
    return { ok: false, error: String(ex) };
  }
}