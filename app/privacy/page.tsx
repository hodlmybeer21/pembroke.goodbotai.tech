// app/privacy/page.tsx — Privacy policy for pembroke.goodbotai.tech.
//
// Documents v6 behavior: what we store, who we share it with, how to
// delete it, what third parties see.

import Link from "next/link";

export const metadata = {
  title: "Privacy — Pembroke, NH",
  description:
    "What pembroke.goodbotai.tech stores about you, who we share it with, and how to delete your data.",
};

export default function PrivacyPage() {
  return (
    <div className="container-page">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          Privacy
        </h1>
        <p className="text-stone-600 mt-2 text-base">
          We don't want your data. We store the minimum needed to send you
          the alerts you asked for, and nothing else.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            What we store about you
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed mb-3">
            If you create an account (via the sign-in button in the top
            right), we store:
          </p>
          <ul className="text-sm text-stone-700 space-y-1 list-disc list-inside mb-3">
            <li>Your email address (used to send you alert emails)</li>
            <li>
              The topic categories you've selected (e.g. "school board",
              "roads", "budget")
            </li>
            <li>
              A list of streets you watch, if you set up "watch this street"
              alerts
            </li>
            <li>
              An opaque unsubscribe token (a UUID, generated server-side,
              used only to build the one-click unsubscribe link in your
              emails)
            </li>
            <li>Your account creation and last-update timestamps</li>
          </ul>
          <p className="text-sm text-stone-700 leading-relaxed">
            We do not store your name, mailing address, phone number, browser
            fingerprint, IP address, or any tracking pixel data. We do not
            use third-party analytics on this site. There are no cookies set
            by us; the only cookies are the Clerk session cookie, which is
            required for sign-in.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            Who else sees your data
          </h2>
          <ul className="text-sm text-stone-700 space-y-2">
            <li>
              <strong>Clerk</strong> — handles sign-in. They store your email
              and auth credentials per their{" "}
              <a
                className="underline"
                href="https://clerk.com/privacy"
              >
                privacy policy
              </a>
              . We do not share anything with them beyond what sign-in
              requires.
            </li>
            <li>
              <strong>Resend</strong> — sends the alert emails on our behalf.
              When you get an email, Resend sees your email address and the
              message body. We use their standard transactional tier. Their
              data retention is governed by{" "}
              <a
                className="underline"
                href="https://resend.com/legal/privacy-policy"
              >
                their policy
              </a>
              .
            </li>
            <li>
              <strong>Vercel</strong> — hosts the site + the Postgres
              database. They see HTTP requests (your IP, user agent) and
              store the Postgres rows described above. Vercel's data
              handling is governed by their{" "}
              <a
                className="underline"
                href="https://vercel.com/legal/privacy-policy"
              >
                privacy policy
              </a>
              .
            </li>
          </ul>
          <p className="text-sm text-stone-700 leading-relaxed mt-3">
            We do not sell, rent, or trade your data. We do not share it with
            advertisers, marketers, or anyone outside the three vendors
            above. We do not use it for any purpose other than delivering
            the alerts you signed up for.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            How to delete your data
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed mb-3">
            Three ways, all immediate:
          </p>
          <ol className="text-sm text-stone-700 space-y-1 list-decimal list-inside mb-3">
            <li>
              Click the unsubscribe link at the bottom of any alert email.
              This deletes your profile row.
            </li>
            <li>
              Sign in and visit{" "}
              <Link className="underline" href="/settings">
                Settings
              </Link>
              , then click "Delete my profile" at the bottom of the page.
            </li>
            <li>
              Email{" "}
              <a
                className="underline"
                href="mailto:hello@pembroke.goodbotai.tech"
              >
                hello@pembroke.goodbotai.tech
              </a>{" "}
              and ask. We'll delete the row that day.
            </li>
          </ol>
          <p className="text-sm text-stone-700 leading-relaxed">
            Deletion is permanent and not reversible. We don't keep backups of
            your profile; once it's gone, it's gone.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-3">
            Data we keep even if you don't sign in
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed mb-3">
            Even if you never sign in, the site keeps:
          </p>
          <ul className="text-sm text-stone-700 space-y-1 list-disc list-inside mb-3">
            <li>
              Server logs (Vercel's standard request logs) — used for
              debugging and abuse detection. Retained for ~30 days, not
              linked to your account unless you sign in.
            </li>
            <li>
              Aggregated usage metrics — page views per day, never per user.
              We don't track individual users without their consent.
            </li>
          </ul>
          <p className="text-sm text-stone-700 leading-relaxed">
            The town-side data (meeting summaries, agenda PDFs, scraped
            service pages) is all from the Town of Pembroke's own public
            website. It belongs to the town, not to us, and the town
            publishes it as a public record.
          </p>
        </section>

        <section className="lg:col-span-2 surface p-5">
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-2">
            Changes to this policy
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            We update this page when we add features that change what we
            store. The current version describes v6 behavior. If we make a
            material change (e.g. start sharing data with a new vendor), we
            announce it in the daily brief before it takes effect.
          </p>
        </section>
      </div>

      <p className="text-xs text-stone-500 mt-12 pt-6 border-t border-stone-200">
        Last updated October 2026. Effective for all accounts created on or
        after this date; previous accounts are covered by the policy in
        effect when they signed up unless they re-consent.
      </p>
    </div>
  );
}