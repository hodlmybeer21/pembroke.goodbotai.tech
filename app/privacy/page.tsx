export default function PrivacyPage() {
  return (
    <div className="container-page">
      <h1 className="text-2xl font-semibold mb-4">Privacy</h1>
      <section className="space-y-4 text-sm">
        <p>
          <strong>What we store.</strong> If you create an account, we store:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>your email address (used to send you alert emails)</li>
          <li>the category IDs you've selected</li>
          <li>an opaque unsubscribe token (a UUID, generated server-side)</li>
        </ul>
        <p>
          We do not store your name, address, phone, browser fingerprint, IP, or
          any tracking pixel data.
        </p>

        <h2 className="text-base font-semibold pt-2">Why</h2>
        <p>
          The site is free, no ads, no sponsorships in v3. Email is the only way
          alerts reach you. We don't want your data. Don't want it. Need it only
          to send the alerts you asked for.
        </p>

        <h2 className="text-base font-semibold pt-2">Third parties</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Clerk</strong> — hosts authentication. They store your email,
            auth credentials, and session tokens per their{" "}
            <a className="underline" href="https://clerk.com/privacy">
              privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Resend</strong> — sends the alert emails on our behalf. They
            see your email and the email body.
          </li>
          <li>
            <strong>Vercel</strong> — hosts the site + Postgres database. Sees
            HTTP requests and stores our Postgres rows.
          </li>
        </ul>

        <h2 className="text-base font-semibold pt-2">Unsubscribe</h2>
        <p>
          One-click unsubscribe at the bottom of every alert. The link deletes
          your profile row. You can also delete your profile manually from the{" "}
          <a className="underline" href="/settings">
            Settings
          </a>{" "}
          page when signed in.
        </p>

        <h2 className="text-base font-semibold pt-2">Data retention</h2>
        <p>
          Profile rows are kept until you delete them via unsubscribe or Settings.
          On request, we'll delete your row manually — message us at the address
          in <a className="underline" href="/about">About</a>.
        </p>

        <p className="text-xs text-stone-500 pt-4 border-t border-stone-200">
          This page documents v3 behavior. Subject to change as we add features;
          updates posted here.
        </p>
      </section>
    </div>
  );
}