"use client";

// WatchesForm — user can add/remove street watches. Server is the source
// of truth via /api/watches; this component is a thin client wrapper.

import { useState, useEffect, useRef } from "react";

interface Watch {
  street: string;
  created_at: string;
  match_count_90d?: number;
}

interface StreetOption {
  street: string;
  match_count_90d: number;
}

export function WatchesForm({ initialWatches, streets }: { initialWatches: Watch[]; streets: StreetOption[] }) {
  const [watches, setWatches] = useState<Watch[]>(initialWatches);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Top 8 suggestions for the current input, deduped against watches.
  const suggestions = input.trim().length >= 2
    ? streets
        .filter(
          (s) =>
            s.street.toLowerCase().includes(input.trim().toLowerCase()) &&
            !watches.some((w) => w.street.toLowerCase() === s.street.toLowerCase()),
        )
        .slice(0, 8)
    : [];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function add(street: string) {
    setSaving(true);
    setStatus(null);
    setShowSuggestions(false);
    setInput("");
    try {
      const res = await fetch("/api/watches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ street }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      // Insert locally — server returns the new watch
      setWatches((prev) => [j.watch, ...prev]);
      setStatus({ ok: true, msg: `Watching ${street}.` });
    } catch (ex) {
      setStatus({ ok: false, msg: String(ex) });
    } finally {
      setSaving(false);
    }
  }

  async function remove(street: string) {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/watches?street=${encodeURIComponent(street)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setWatches((prev) => prev.filter((w) => w.street !== street));
      setStatus({ ok: true, msg: `Stopped watching ${street}.` });
    } catch (ex) {
      setStatus({ ok: false, msg: String(ex) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="pt-4 border-t border-stone-200">
      <div className="mb-2">
        <h3 className="font-medium text-stone-800 text-sm">Streets I watch</h3>
        <p className="text-xs text-stone-500 mt-1">
          Get an email when any new agenda or minutes mention a street you
          care about — road projects, paving, traffic, zoning.
        </p>
      </div>

      {/* Add input + autocomplete */}
      <div className="relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = input.trim();
            if (trimmed) add(trimmed);
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Type a street name (e.g. Borough Road)"
            aria-label="Street name"
            className="flex-1 px-3 py-2 border border-stone-300 rounded-md text-sm bg-white"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={saving || !input.trim()}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:bg-stone-300"
          >
            Watch
          </button>
        </form>
        {showSuggestions && suggestions.length > 0 && (
          <ul
            className="absolute z-10 mt-1 w-full bg-white border border-stone-200 rounded-md shadow-lg max-h-64 overflow-y-auto"
            role="listbox"
          >
            {suggestions.map((s) => (
              <li key={s.street}>
                <button
                  type="button"
                  onClick={() => add(s.street)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-baseline justify-between gap-2"
                >
                  <span className="text-stone-800">{s.street}</span>
                  <span className="text-[10px] text-stone-500">
                    {s.match_count_90d > 0 ? `${s.match_count_90d} recent mention${s.match_count_90d === 1 ? "" : "s"}` : "no recent mentions"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Current list */}
      {watches.length === 0 ? (
        <p className="text-xs text-stone-500 mt-3">No streets watched yet.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {watches.map((w) => (
            <li
              key={w.street}
              className="flex items-baseline justify-between gap-2 px-3 py-2 bg-stone-50 rounded-md text-sm"
            >
              <div>
                <span className="font-medium text-stone-800">{w.street}</span>
                <span className="text-[11px] text-stone-500 ml-2">
                  {w.match_count_90d && w.match_count_90d > 0
                    ? `${w.match_count_90d} mention${w.match_count_90d === 1 ? "" : "s"} in last 90 days`
                    : "no recent mentions"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(w.street)}
                disabled={saving}
                className="text-xs text-stone-500 hover:text-red-700 underline"
              >
                Stop watching
              </button>
            </li>
          ))}
        </ul>
      )}

      {status && (
        <div
          className={
            "mt-2 text-xs " + (status.ok ? "text-success" : "text-red-700")
          }
        >
          {status.msg}
        </div>
      )}
    </section>
  );
}