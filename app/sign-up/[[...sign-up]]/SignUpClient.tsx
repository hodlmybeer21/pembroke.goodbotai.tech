"use client";

import { SignUp } from "@clerk/nextjs";

export function SignUpClient() {
  return (
    <div className="container-page flex justify-center py-12">
      <SignUp
        afterSignUpUrl="/settings"
        signInUrl="/sign-in"
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