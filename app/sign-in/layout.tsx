// app/sign-in/layout.tsx — page metadata for /sign-in (the page itself
// is a client component, which can't export metadata).

export const metadata = {
  title: "Sign in — Pembroke, NH",
  description: "Sign in to pick the Pembroke town updates you want by email.",
  alternates: { canonical: "/sign-in" },
  robots: { index: false, follow: true },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
