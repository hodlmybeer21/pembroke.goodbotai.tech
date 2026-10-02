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