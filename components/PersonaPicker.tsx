"use client";

// components/PersonaPicker.tsx — Onboarding modal for first-visit users.
//
// Shown when the user lands on / with no persona in their profile.
// The user picks a life-situation persona, which sets the default
// category bundle and the home page's impact-section ordering.
// The user can always change their persona on /settings.

import { useState } from "react";
import { PERSONAS, type Persona } from "@/lib/categories";

interface PersonaPickerProps {
  onComplete: (personaId: string, categories: string[]) => void;
  onSkip: () => void;
}

export function PersonaPicker({ onComplete, onSkip }: PersonaPickerProps) {
  const [selected, setSelected] = useState<Persona | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: selected.id,
          categories: selected.categories,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      onComplete(selected.id, selected.categories);
    } catch (ex) {
      setError(String(ex));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="persona-picker-title"
    >
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="px-5 sm:px-7 pt-6 pb-4 border-b border-stone-200">
          <h2
            id="persona-picker-title"
            className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900"
          >
            What best describes you?
          </h2>
          <p className="text-stone-600 text-sm mt-1">
            Pick a life-situation so we can show you what matters. You can
            fine-tune the categories on /settings later.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-4">
          <ul className="space-y-2.5">
            {PERSONAS.map((p) => {
              const isSelected = selected?.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(p)}
                    aria-pressed={isSelected}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                      isSelected
                        ? "border-brand-600 bg-brand-50"
                        : "border-stone-200 hover:border-brand-400 bg-white"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl" aria-hidden>
                        {p.emoji}
                      </span>
                      <span className="font-semibold text-stone-900">
                        {p.label}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 mt-0.5">
                      {p.blurb}
                    </p>
                    {isSelected && (
                      <p className="text-xs text-brand-700 mt-1.5 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="px-5 sm:px-7 py-4 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            className="text-sm text-stone-500 hover:text-stone-700 disabled:opacity-50"
          >
            Skip for now
          </button>
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-xs text-rose-600">{error}</span>
            )}
            <button
              type="button"
              onClick={commit}
              disabled={!selected || submitting}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving…" : selected ? `Pick ${selected.label}` : "Pick one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}