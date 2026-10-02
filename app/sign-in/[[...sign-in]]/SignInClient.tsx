"use client";

import { SignIn } from "@clerk/nextjs";

export function SignInClient() {
  return (
    <div className="container-page flex justify-center py-12">
      <SignIn
        afterSignInUrl="/settings"
        signUpUrl="/sign-up"
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "shadow-sm border border-stone-200",
          },
        }}
      />
    </div>
  );
}