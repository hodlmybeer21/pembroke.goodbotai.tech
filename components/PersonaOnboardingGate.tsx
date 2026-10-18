"use client";

// components/PersonaOnboardingGate.tsx — Client component that shows the
// PersonaPicker modal when the server-rendered home page has determined
// the user has no persona set yet. Renders nothing if persona is already
// set (the server reads the profile and decides whether to mount this).

import { useEffect, useState } from "react";
import { PersonaPicker } from "./PersonaPicker";

interface Props {
  hasPersona: boolean;
}

export function PersonaOnboardingGate({ hasPersona }: Props) {
  // Show the picker on mount when the server tells us there's no persona.
  // Don't show on subsequent visits (the localStorage flag tracks this).
  const [show, setShow] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (hasPersona) return;
    if (typeof window === "undefined") return;
    try {
      // If the user already dismissed the picker, don't auto-show it
      // again. They can still pick a persona from /settings.
      const dismissed = localStorage.getItem("pembroke-persona-dismissed");
      if (dismissed) return;
      setShow(true);
    } catch {
      setShow(true);
    }
  }, [hasPersona]);

  if (!show || hasPersona) return null;

  function handleComplete() {
    try {
      // Clear the dismissed flag so future re-encounters of "no persona"
      // (shouldn't normally happen) show it again.
      localStorage.removeItem("pembroke-persona-dismissed");
    } catch {}
    // Force a full page reload so the server re-reads the profile and
    // re-renders the home page with the new persona's tag order.
    window.location.reload();
  }

  function handleSkip() {
    try {
      localStorage.setItem("pembroke-persona-dismissed", "1");
    } catch {}
    setSkipped(true);
    setShow(false);
  }

  return (
    <PersonaPicker
      onComplete={(personaId, _categories) => {
        handleComplete();
      }}
      onSkip={handleSkip}
    />
  );
}