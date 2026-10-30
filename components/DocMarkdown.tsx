// components/DocMarkdown.tsx — renders the SOURCES.md and GAPS.md documents.
//
// Deliberately not a markdown library. It handles exactly what those two
// documents use - headings, paragraphs, bullet lists, pipe tables,
// **bold**, *italic*, `code` and [links](url) - so there is no
// dependency and no HTML injection surface.
//
// It is a server component: the documents are read at build time and
// never shipped to the browser as raw text.

import { Fragment, type ReactNode } from "react";

/** Inline markdown: **bold**, *italic*, `code`, [text](url). */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const rx = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
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
        <code key={key} className="break-all rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.85em] text-stone-800">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("[")) {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (mm) {
        const href = mm[2];
        const external = /^https?:\/\//.test(href);
        out.push(
          <a
            key={key}
            href={href}
            className="break-words text-brand-700 underline underline-offset-2"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {mm[1]}
          </a>
        );
      }
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

function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

const isDivider = (line: string) => /^\s*\|?[\s:-]*-[\s|:-]*\|?\s*$/.test(line);

export function DocMarkdown({ text }: { text: string }) {
  const lines = (text ?? "").split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="my-2 ml-5 list-disc space-y-1 text-sm leading-relaxed text-stone-700">
        {bullets.map((b, i) => (
          <li key={i}>{inline(b, `b${key}-${i}`)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\r$/, "");
    const line = raw.trimEnd();

    // A pipe table: a header row followed by a divider row.
    if (line.trim().startsWith("|") && i + 1 < lines.length && isDivider(lines[i + 1])) {
      flushBullets();
      const head = splitRow(line);
      const rows: string[][] = [];
      let j = i + 2;
      for (; j < lines.length && lines[j].trim().startsWith("|"); j++) {
        rows.push(splitRow(lines[j]));
      }
      blocks.push(
        <div key={`tbl-${key++}`} className="my-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-300 text-left">
                {head.map((h, hi) => (
                  <th key={hi} className="py-1.5 pr-3 font-semibold text-stone-700">
                    {inline(h, `th${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-stone-200 align-top">
                  {r.map((c, ci) => (
                    <td key={ci} className="py-1.5 pr-3 text-stone-700">
                      {inline(c, `td${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      i = j - 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushBullets();
      const level = heading[1].length;
      const size =
        level === 1 ? "text-xl" : level === 2 ? "text-lg" : level === 3 ? "text-base" : "text-sm";
      blocks.push(
        <h3
          key={`h-${key++}`}
          className={`mt-4 font-serif font-semibold text-stone-900 ${size}`}
        >
          {inline(heading[2], `h${key}`)}
        </h3>
      );
      continue;
    }

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }

    flushBullets();
    if (!line.trim()) {
      blocks.push(<div key={`sp-${key++}`} className="h-1" />);
      continue;
    }
    blocks.push(
      <p key={`p-${key++}`} className="my-1.5 text-sm leading-relaxed text-stone-700">
        {inline(line, `p${key}`)}
      </p>
    );
  }
  flushBullets();

  // Long URLs are the whole reason this wrapper exists: a bare
  // https://... link in a bullet is one unbreakable word, and on a phone
  // it pushed the whole page wider than the screen. overflow-wrap is an
  // inherited property, so one class here covers every link below.
  return <div className="break-words">{blocks}</div>;
}
