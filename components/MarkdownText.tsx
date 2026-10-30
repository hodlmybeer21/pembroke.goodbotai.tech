"use client";

// components/MarkdownText.tsx — a very small markdown renderer.
//
// The town bot writes its answers in markdown (bold, italics, inline
// code, bullet lists). Rendering it as plain text left raw "**bold**"
// markers in the bubble, which reads as broken rather than as a bot
// answering.
//
// This is deliberately not a markdown library. It handles exactly the
// subset the bot produces and nothing else, so there is no dependency,
// no HTML injection surface, and nothing to sanitise.

import { Fragment, type ReactNode } from "react";

/** Render one line of inline markdown: **bold**, *italic*, `code`. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Match **bold**, *italic* and `code` in one pass.
  const rx = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith("**")) {
      out.push(
        <strong key={key} className="font-semibold text-stone-900">
          {tok.slice(2, -2)}
        </strong>
      );
    } else if (tok.startsWith("`")) {
      out.push(
        <code
          key={key}
          className="rounded bg-stone-200 px-1 py-0.5 font-mono text-[0.85em] text-stone-800"
        >
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      out.push(
        <em key={key} className="italic">
          {tok.slice(1, -1)}
        </em>
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MarkdownText({ text }: { text: string }) {
  const lines = (text ?? "").split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    const items = bullets.map((b, i) => (
      <li key={i} className="leading-relaxed">
        {inline(b, `b${i}`)}
      </li>
    ));
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-1.5 ml-4 list-disc space-y-0.5">
        {items}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }
    flushBullets();
    if (!line.trim()) {
      blocks.push(<div key={`sp-${idx}`} className="h-2" />);
      return;
    }
    blocks.push(
      <p key={`p-${idx}`} className="my-1 leading-relaxed">
        {inline(line, `p${idx}`)}
      </p>
    );
  });
  flushBullets();

  return <Fragment>{blocks}</Fragment>;
}
