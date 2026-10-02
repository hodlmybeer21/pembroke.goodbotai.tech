"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";

interface SettingsFormProps {
  email: string;
  initialCategories: string[];
  unsubscribeToken: string;
}

export function SettingsForm({ email, initialCategories, unsubscribeToken }: SettingsFormProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialCategories));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSavedAt(null);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: Array.from(selected) }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setSavedAt(new Date().toLocaleTimeString("en-US", { timeStyle: "short" }));
    } catch (ex) {
      setError(String(ex));
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    if (!confirm("Delete your profile and unsubscribe? This can't be undone.")) return;
    setSaving(true);
    try {
      await fetch("/api/profile", { method: "DELETE" });
      window.location.href = "/?deleted=1";
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-stone-600">
        Signed in as <strong>{email}</strong>. Pick the topics you care about.
        We'll email you when something new drops.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const isOn = selected.has(cat.id);
          return (
            <label
              key={cat.id}
              className={`block border rounded-md p-3 cursor-pointer transition-colors ${
                isOn
                  ? "border-brand-500 bg-brand-50"
                  : "border-stone-200 bg-white hover:border-stone-400"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(cat.id)}
                  className="rounded"
                />
                <span className="font-medium text-sm">{cat.label}</span>
              </div>
              <div className="text-xs text-stone-500 ml-6">{cat.description}</div>
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-stone-200">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:bg-stone-300"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {savedAt && (
          <span className="text-sm text-green-700">Saved at {savedAt}</span>
        )}
        {error && <span className="text-sm text-red-700">Error: {error}</span>}
      </div>

      <div className="pt-6 border-t border-stone-200 text-sm text-stone-600">
        <h3 className="font-medium text-stone-800 mb-2">Privacy</h3>
        <p className="mb-2">
          We store only your email + selected categories + an unsubscribe token.
          No name, no address, no tracking pixels.
        </p>
        <p className="mb-2">
          One-click unsubscribe is at the bottom of every alert.
        </p>
        <p className="mb-4">
          <a
            className="text-red-700 underline"
            href={`/api/alerts/unsubscribe?token=${unsubscribeToken}`}
          >
            Unsubscribe and delete profile
          </a>
          {" — or use the button below."}
        </p>
        <button
          onClick={deleteAccount}
          disabled={saving}
          className="px-3 py-1.5 border border-red-300 text-red-700 text-sm rounded-md hover:bg-red-50"
        >
          Delete my profile
        </button>
      </div>
    </div>
  );
}