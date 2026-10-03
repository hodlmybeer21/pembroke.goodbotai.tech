"use client";

// ShareButton — a small, polite share affordance. "Send to a Pembroke
// resident you know." Uses the Web Share API on mobile (where it works
// well), falls back to a copy-link + email prefill on desktop.
//
// Important: this is friend-to-friend sharing. It does NOT have a
// "tell the town" affordance. Per Tyler's direction, that comes later —
// wait for residents to spread it organically.

import { useState } from "react";

interface ShareButtonProps {
  url: string;
  title: string;
  body?: string;
  className?: string;
  label?: string;
}

const DEFAULT_BODY =
  "Hey — I use pembroke.goodbotai.tech for [trash day / meeting alerts / whatever]. Thought you might find it useful too.";

export function ShareButton({
  url,
  title,
  body = DEFAULT_BODY,
  className = "",
  label = "Share with a neighbor",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // Build the email prefill
  const emailHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${body}\n\n${url}`)}`;
  // Build the SMS prefill (works on iMessage / Android Messages)
  const smsHref = `sms:?body=${encodeURIComponent(`${body} ${url}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the link text. Most browsers fall back to a
      // permission dialog if the user denies clipboard access.
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title,
          text: body,
          url,
        });
        return;
      } catch {
        // user cancelled or browser rejected; fall through to the panel
      }
    }
    setOpen(true);
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={nativeShare}
        className="text-xs text-stone-500 hover:text-brand-700 underline"
      >
        {label} →
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Share"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <div className="text-sm font-medium text-stone-900 mb-1">
              Share with a neighbor
            </div>
            <div className="text-xs text-stone-500 mb-3">
              Pembroke residents use this site for trash day, meeting
              alerts, and town info. Send it to someone who'd find it useful.
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={emailHref}
                className="text-xs px-3 py-1.5 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
              >
                Email
              </a>
              <a
                href={smsHref}
                className="text-xs px-3 py-1.5 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
              >
                Text
              </a>
              <button
                type="button"
                onClick={copy}
                className="text-xs px-3 py-1.5 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-stone-400 hover:text-stone-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}