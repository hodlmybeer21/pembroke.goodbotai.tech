"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";

interface SettingsFormProps {
  email: string;
  initialCategories: string[];
  initialTelegramEnabled: boolean;
  unsubscribeToken: string;
}

export function SettingsForm({
  email,
  initialCategories,
  initialTelegramEnabled,
  unsubscribeToken,
}: SettingsFormProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialCategories));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tgEnabled, setTgEnabled] = useState(initialTelegramEnabled);
  const [tgToken, setTgToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgSaving, setTgSaving] = useState(false);
  const [tgStatus, setTgStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [tgExpanded, setTgExpanded] = useState(false);

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

  async function saveTelegram() {
    setTgSaving(true);
    setTgStatus(null);
    try {
      const res = await fetch("/api/profile/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: tgToken,
          chatId: tgChatId,
          enabled: true,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setTgStatus({ ok: true, msg: "Telegram alerts enabled. New postings will land in your chat." });
      setTgEnabled(true);
      setTgToken("");
      setTgChatId("");
    } catch (ex) {
      setTgStatus({ ok: false, msg: String(ex) });
    } finally {
      setTgSaving(false);
    }
  }

  async function disableTelegram() {
    if (!confirm("Stop getting Telegram alerts? You'll still get emails if you pick categories.")) return;
    setTgSaving(true);
    setTgStatus(null);
    try {
      const res = await fetch("/api/profile/telegram", { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setTgStatus({ ok: true, msg: "Telegram alerts disabled." });
      setTgEnabled(false);
    } catch (ex) {
      setTgStatus({ ok: false, msg: String(ex) });
    } finally {
      setTgSaving(false);
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
              className={
                "block border rounded-md p-3 cursor-pointer transition-colors " +
                (isOn
                  ? "border-brand-500 bg-brand-50"
                  : "border-stone-200 bg-white hover:border-stone-400")
              }
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
          <span className="text-sm text-success">Saved at {savedAt}</span>
        )}
        {error && <span className="text-sm text-red-700">Error: {error}</span>}
      </div>

      {/* Telegram opt-in */}
      <section className="pt-4 border-t border-stone-200">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="font-medium text-stone-800 text-sm">Telegram alerts</h3>
          {tgEnabled && (
            <span className="text-xs text-success font-medium">Enabled</span>
          )}
        </div>
        {!tgExpanded && !tgEnabled && (
          <p className="text-sm text-stone-600 mb-2">
            Get new-posting summaries in your Telegram, not just email.
            You'll need to make your own bot (takes 2 minutes) —{" "}
            <button
              type="button"
              onClick={() => setTgExpanded(true)}
              className="underline text-brand-700"
            >
              show me how
            </button>
            .
          </p>
        )}
        {tgExpanded && (
          <ol className="text-xs text-stone-600 list-decimal pl-5 space-y-1 mb-3">
            <li>
              In Telegram, message <strong>@BotFather</strong>. Send{" "}
              <code className="bg-stone-100 px-1 rounded">/newbot</code>, name it, and copy
              the HTTP API token.
            </li>
            <li>
              Message your new bot (search for it by username). Send{" "}
              <code className="bg-stone-100 px-1 rounded">/start</code>.
            </li>
            <li>
              Visit{" "}
              <code className="bg-stone-100 px-1 rounded text-[10px]">
                https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
              </code>{" "}
              and find the <code className="bg-stone-100 px-1 rounded">chat.id</code> number.
            </li>
            <li>Paste the token and chat.id below.</li>
          </ol>
        )}
        {tgEnabled ? (
          <div className="flex items-center gap-2">
            <button
              onClick={disableTelegram}
              disabled={tgSaving}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              {tgSaving ? "Disabling…" : "Disable Telegram alerts"}
            </button>
          </div>
        ) : tgExpanded ? (
          <div className="space-y-2">
            <input
              type="password"
              value={tgToken}
              onChange={(e) => setTgToken(e.target.value)}
              placeholder="Bot token (from @BotFather)"
              aria-label="Telegram bot token"
              className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm bg-white"
              autoComplete="off"
              spellCheck={false}
            />
            <input
              type="text"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              placeholder="Your chat.id (a number)"
              aria-label="Telegram chat id"
              className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm bg-white"
              autoComplete="off"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={saveTelegram}
                disabled={tgSaving || !tgToken || !tgChatId}
                className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:bg-stone-300"
              >
                {tgSaving ? "Saving…" : "Enable Telegram alerts"}
              </button>
              <button
                onClick={() => setTgExpanded(false)}
                className="text-xs text-stone-500 underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {tgStatus && (
          <div
            className={
              "mt-2 text-xs " +
              (tgStatus.ok ? "text-success" : "text-red-700")
            }
          >
            {tgStatus.msg}
          </div>
        )}
        <p className="text-[11px] text-stone-500 mt-2">
          Your bot token and chat.id are stored encrypted on our server
          (AES-256-GCM) and only used to send you alerts. They're never
          logged, never shared, and never sent back to your browser.
        </p>
      </section>

      <details className="pt-2 border-t border-stone-200 text-sm text-stone-600 group">
        <summary className="cursor-pointer text-stone-700 font-medium list-none flex items-center gap-2 py-2">
          <span className="text-stone-400 group-open:rotate-90 transition-transform">▸</span>
          Privacy & account
        </summary>
        <div className="pt-3 pb-2 pl-5">
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
      </details>
    </div>
  );
}