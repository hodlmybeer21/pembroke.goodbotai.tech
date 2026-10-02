import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pembroke, NH — town brief",
  description:
    "What Pembroke NH town government is doing — meetings, agendas, decisions. Daily brief for residents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-stone-200 bg-white">
          <div className="container-page py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold text-stone-900">
              📍 Pembroke, NH
            </Link>
            <nav className="flex gap-4 text-sm text-stone-600">
              <Link href="/calendar">Calendar</Link>
              <Link href="/agendas">Agendas</Link>
              <Link href="/ask">Ask</Link>
              <Link href="/about">About</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-stone-200 bg-white">
          <div className="container-page py-6 text-xs text-stone-500">
            Built for Pembroke, NH residents · data from{" "}
            <a href="https://www.pembroke-nh.com" className="underline">
              pembroke-nh.com
            </a>
            {" "}· refreshes hourly
          </div>
        </footer>
      </body>
    </html>
  );
}