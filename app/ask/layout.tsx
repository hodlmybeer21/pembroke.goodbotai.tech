// app/ask/layout.tsx — page metadata for /ask (the page itself is a
// client component, which can't export metadata).

export const metadata = {
  title: "Ask the bot — Pembroke, NH",
  description:
    "Plain-language questions about Pembroke town government. Answers from the town's own data.",
  alternates: { canonical: "/ask" },
  openGraph: {
    title: "Ask the Pembroke town bot",
    description:
      "Plain-English questions about meetings, services, hours, fees. Answers from the town's own data.",
    url: "/ask",
    images: [{ url: "/og-ask.png", width: 1200, height: 630, alt: "Ask the Pembroke town bot" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask the Pembroke town bot",
    description: "Plain-English questions about meetings, services, hours, fees.",
    images: ["/og-ask.png"],
  },
};

export default function AskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
