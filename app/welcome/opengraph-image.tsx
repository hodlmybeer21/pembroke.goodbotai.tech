// app/welcome/opengraph-image.tsx — OG image for the new resident guide.

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "New to Pembroke? Start here.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1e3a8a 0%, #15803d 100%)",
          color: "white",
          padding: "60px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
            <path d="M2 24 Q 5 22 8 24 T 14 24 T 20 24 T 26 24 T 32 24" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <path d="M2 27 Q 5 25 8 27 T 14 27 T 20 27 T 26 27 T 32 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            <path d="M2 30 Q 5 28 8 30 T 14 30 T 20 30 T 26 30 T 32 30" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
            <circle cx="16" cy="12" r="6" fill="white" opacity="0.95" />
            <line x1="16" y1="3" x2="16" y2="5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="19" x2="16" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="7" y1="12" x2="9" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="23" y1="12" x2="25" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9.5" y1="5.5" x2="10.9" y2="6.9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="21.1" y1="17.1" x2="22.5" y2="18.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9.5" y1="18.5" x2="10.9" y2="17.1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="21.1" y1="6.9" x2="22.5" y2="5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.9 }}>
            Pembroke, NH
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            fontSize: 60,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            maxWidth: "950px",
          }}
        >
          New to Pembroke?
          <br />
          Start here.
        </div>

        <div
          style={{
            fontSize: 26,
            color: "#dcfce7",
            marginTop: 28,
            maxWidth: "950px",
            lineHeight: 1.4,
          }}
        >
          Vote. Trash. Library. Dog license. School.
          <br />
          The first-month checklist that every new resident needs.
        </div>
      </div>
    ),
    { ...size },
  );
}