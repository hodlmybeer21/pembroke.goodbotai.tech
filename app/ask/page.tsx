"use client";

import { useState } from "react";

export default function AskPage() {
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() || pending) return;
    setPending(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? "No answer.");
    } catch (err) {
      setAnswer("Couldn't reach the bot right now. Try again in a minute.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="container-page">
      <h1 className="text-2xl font-semibold mb-1">Ask the bot</h1>
      <p className="text-sm text-stone-500 mb-6">
        Ask plain-language questions about Pembroke town government. Examples:
        "When is the next Select Board meeting?", "What did Planning Board vote on last
        Tuesday?", "Is there a road project on Borough Road?".
      </p>

      <form onSubmit={submit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What do you want to know?"
            disabled={pending}
            className="flex-1 px-3 py-2 border border-stone-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={pending || !q.trim()}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {pending ? "Thinking..." : "Ask"}
          </button>
        </div>
      </form>

      {answer && (
        <div className="p-4 bg-white border border-stone-200 rounded-md text-sm">
          <div className="text-xs text-stone-500 mb-2 font-medium">Answer</div>
          <div className="whitespace-pre-wrap">{answer}</div>
        </div>
      )}

      <div className="mt-8 p-4 bg-stone-100 border border-stone-200 rounded-md text-xs text-stone-600">
        <strong>What this answers.</strong> Two kinds of questions: town-meeting
        stuff (when is the next Select Board, what's on tomorrow's agenda)
        and general how-to (where is the library, how does trash pickup work,
        what are transfer station fees). Answers come from the town's own
        website and the daily-brief data. Add an LLM key in Vercel env vars for
        more natural phrasing.
      </div>
    </div>
  );
}