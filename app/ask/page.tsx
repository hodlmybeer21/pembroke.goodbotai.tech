"use client";

// app/ask/page.tsx — Ask-the-bot chat interface.
//
// The bot is a persistent Pembroke town guide. Conversations live in
// localStorage so they survive page reloads. Each new question can
// reference prior context — the server gets the last 10 exchanges
// and uses them for pronoun resolution (stub) or as conversation
// history (LLM mode).

import { useEffect, useRef, useState } from "react";
import { ShareButton } from "@/components/ShareButton";

interface AskResponse {
  answer: string;
  q: string;
  mode: "llm" | "stub";
  meetings_in_context?: number;
  summaries_in_context?: number;
  town_pages_in_context?: string[];
  archive_entries_in_context?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  townPages?: string[];
  archiveCount?: number;
  mode?: "llm" | "stub";
  ts: number;
}

const EXAMPLES: string[] = [
  "What happened at the last Select Board meeting?",
  "How do I get rid of paint?",
  "When is the next trash day on Pembroke Street?",
  "Is there a snow emergency tonight?",
  "When did the Cemetery Commission last raise burial fees?",
  "What does the Conservation Commission do?",
  "Where is the library and what are the hours?",
];

const STORAGE_KEY = "pembroke-ask-history-v1";
const MAX_HISTORY = 20;

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ChatMessage[];
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  } catch {
    // localStorage may be full or disabled; silently degrade.
  }
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AskPage() {
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load conversation from localStorage on mount.
  useEffect(() => {
    const loaded = loadHistory();
    if (loaded.length > 0) {
      setMessages(loaded);
    } else {
      // Seed with a greeting message so the chat doesn't look empty.
      setMessages([
        {
          id: genId(),
          role: "bot",
          content:
            "Hi — I'm Pembroke, the town bot. Ask me about meetings, services, hours, fees, or anything else about how the town works. I'll pull from the town's own data and the meeting archive.",
          ts: Date.now(),
        },
      ]);
    }
    setHydrated(true);
  }, []);

  // Persist on every change.
  useEffect(() => {
    if (hydrated) saveHistory(messages);
  }, [messages, hydrated]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  async function submit(text?: string) {
    const query = (text ?? q).trim();
    if (!query || pending) return;
    setPending(true);
    setQ("");
    // Append the user message immediately.
    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: query,
      ts: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    try {
      // Build the history payload (only user/assistant role + content).
      const history = [...messages, userMsg]
        .filter((m) => m.role === "user" || m.role === "bot")
        .slice(-MAX_HISTORY)
        .map((m) => ({
          role: (m.role === "bot" ? "assistant" : "user") as
            | "user"
            | "assistant",
          content: m.content,
        }));
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, history }),
      });
      const data = (await res.json()) as AskResponse;
      const botMsg: ChatMessage = {
        id: genId(),
        role: "bot",
        content: data.answer ?? "No answer came back.",
        townPages: data.town_pages_in_context,
        archiveCount: data.archive_entries_in_context,
        mode: data.mode,
        ts: Date.now(),
      };
      setMessages((m) => [...m, botMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: genId(),
          role: "bot",
          content: "Couldn't reach the bot right now. Try again in a minute.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setPending(false);
      // Re-focus the input for fast follow-ups.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function clearChat() {
    if (!confirm("Clear the conversation? This can't be undone.")) return;
    setMessages([
      {
        id: genId(),
        role: "bot",
        content:
          "Cleared. Ask me anything about Pembroke — meetings, services, hours, fees, votes.",
        ts: Date.now(),
      },
    ]);
  }

  return (
    <div className="container-page">
      <head>
        <title>Ask the bot — Pembroke, NH</title>
        <meta name="description" content="Plain-language questions about Pembroke town government. Answers from the town's own data." />
        <meta property="og:title" content="Ask the Pembroke town bot" />
        <meta property="og:description" content="Plain-English questions about meetings, services, hours, fees. Answers from the town's own data." />
        <meta property="og:image" content="https://pembroke-goodbotai-tech.vercel.app/og-ask.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Ask the Pembroke town bot" />
        <meta name="twitter:description" content="Plain-English questions about meetings, services, hours, fees." />
        <meta name="twitter:image" content="https://pembroke-goodbotai-tech.vercel.app/og-ask.svg" />
      </head>

      <header className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
            Pembroke
          </h1>
          <p className="text-stone-600 mt-1 text-sm">
            Town bot. Remembers this conversation. Answers from the town's own
            data and the meeting archive.
          </p>
        </div>
        <button
          onClick={clearChat}
          className="text-xs px-3 py-1.5 rounded-md border border-stone-300 bg-white text-stone-600 hover:border-rose-400 hover:text-rose-600 transition-colors"
        >
          Clear chat
        </button>
      </header>

      {/* Chat thread */}
      <div
        ref={scrollRef}
        className="surface p-4 mb-4 max-h-[60vh] overflow-y-auto"
        aria-live="polite"
        aria-label="Conversation with the town bot"
      >
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
        {pending && (
          <div className="flex justify-start mb-3">
            <div className="bg-stone-100 text-stone-500 text-sm rounded-2xl rounded-tl-sm px-4 py-2.5 inline-flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse" />
              <span className="inline-block w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse" style={{ animationDelay: "120ms" }} />
              <span className="inline-block w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse" style={{ animationDelay: "240ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Examples — only show on the first turn (before the user has asked anything) */}
      {messages.filter((m) => m.role === "user").length === 0 && (
        <div className="mb-4">
          <div className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-2">
            Try one of these
          </div>
          <div className="flex flex-wrap gap-2">
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
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mb-6"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask the town bot…"
            disabled={pending}
            aria-label="Your question"
            autoFocus
            className="flex-1 px-3 py-2 border border-stone-300 rounded-md text-sm bg-white"
          />
          <button
            type="submit"
            disabled={pending || !q.trim()}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {pending ? "…" : "Send"}
          </button>
        </div>
      </form>

      <div className="text-xs text-stone-500 mb-8">
        <ShareButton
          url="https://pembroke-goodbotai.tech/ask"
          title="Pembroke town bot — ask it anything"
          body="Hey — pembroke-goodbotai.tech/ask answers plain-English questions about Pembroke. I just asked it about [whatever]."
        />
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%] bg-brand-600 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] bg-stone-100 text-stone-900 text-sm rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
        <div className="whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
        {/* Context footer — what the bot read to answer */}
        {(message.townPages?.length || (message.archiveCount ?? 0) > 0) ? (
          <div className="mt-3 pt-2.5 border-t border-stone-200 space-y-1.5">
            {message.townPages && message.townPages.length > 0 && (
              <div className="text-xs text-stone-500">
                Read from {message.townPages.length} town-info page
                {message.townPages.length === 1 ? "" : "s"}
                {message.townPages.slice(0, 4).map((p, i) => (
                  <span key={i}>
                    {i === 0 ? ": " : ", "}
                    <a className="text-brand-700 underline" href={`https://pembroke.goodbotai.tech/?q=${encodeURIComponent(p)}`}>
                      {p}
                    </a>
                  </span>
                ))}
              </div>
            )}
            {message.archiveCount && message.archiveCount > 0 && (
              <div className="text-xs text-stone-500">
                Read from {message.archiveCount} meeting summary record
                {message.archiveCount === 1 ? "" : "s"} in the{" "}
                <a className="text-brand-700 underline" href="/archive">
                  archive
                </a>
                {message.mode === "stub" ? (
                  <span className="ml-1 text-stone-400">(keyword match)</span>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}