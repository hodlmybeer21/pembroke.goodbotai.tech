"use client";

import { useState } from "react";

const EXAMPLES = [
  "When is the next Select Board meeting?",
  "How do I get rid of paint?",
  "Where is the library and what are the hours?",
  "What does trash pickup cost?",
  "Is there a snow emergency tonight?",
];

interface Source { slug: string; title: string; url: string }

export default function AskPage() {
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [townPages, setTownPages] = useState<string[]>([]);

  async function submit(text?: string) {
    const query = (text ?? q).trim();
    if (!query || pending) return;
    setPending(true);
    setAnswer(null);
    setSources([]);
    setTownPages([]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? "No answer.");
      setSources(data.sources ?? []);
      setTownPages(data.town_pages_in_context ?? []);
      if (text) setQ(text);
    } catch (err) {
      setAnswer("Couldn't reach the bot right now. Try again in a minute.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Ask the bot
        </h1>
        <p className="text-stone-600 mt-2">
          Plain-language questions about Pembroke town government. Two flavors:
          what the town is doing (meetings, votes, agendas) and how-to
          (library hours, trash pickup, paint disposal).
        </p>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What do you want to know?"
            disabled={pending}
            aria-label="Your question"
            className="flex-1 px-3 py-2 border border-stone-300 rounded-md text-sm bg-white"
          />
          <button
            type="submit"
            disabled={pending || !q.trim()}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {pending ? "Thinking…" : "Ask"}
          </button>
        </div>
      </form>

      <div className="mb-8 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => submit(ex)}
            disabled={pending}
            className="text-xs px-3 py-1.5 rounded-full border border-stone-300 bg-white text-stone-700 hover:border-brand-500 hover:text-brand-700 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {answer && (
        <article className="surface p-5">
          <div className="text-xs text-stone-500 mb-3 font-medium uppercase tracking-wider">
            Answer
          </div>
          <div className="whitespace-pre-wrap text-sm text-stone-800 leading-relaxed">
            {answer}
          </div>
          {sources.length > 0 && (
            <div className="mt-5 pt-4 border-t border-stone-200">
              <div className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-2">
                Sources
              </div>
              <ul className="text-xs space-y-1">
                {sources.map((s, i) => (
                  <li key={i}>
                    <a className="text-brand-700 underline" href={s.url}>
                      {s.title || s.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {townPages.length > 0 && (
            <div className="mt-3 text-xs text-stone-500">
              Read from: {townPages.slice(0, 4).join(", ")}
              {townPages.length > 4 && ` +${townPages.length - 4} more`}
            </div>
          )}
        </article>
      )}
    </div>
  );
}