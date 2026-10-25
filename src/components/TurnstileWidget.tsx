"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

interface Props {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  /** invisible = runs on load with no UI (site entry). normal = visible checkbox. */
  size?: "normal" | "compact" | "invisible" | "flexible";
  className?: string;
}

export function TurnstileWidget({
  onSuccess,
  onError,
  onExpire,
  size = "normal",
  className = "",
}: Props) {
  const ref = useRef(null);

  if (!SITE_KEY) {
    if (size === "invisible") return null;
    return (
      <p className="text-xs text-[var(--muted)] text-center py-2">
        Add NEXT_PUBLIC_TURNSTILE_SITE_KEY in Vercel to enable bot protection.
      </p>
    );
  }

  const invisible = size === "invisible";

  return (
    <div
      className={
        invisible
          ? // Keep a real layout box off-screen — zero-size boxes often break invisible Turnstile
            `fixed left-0 top-0 z-[-1] opacity-0 pointer-events-none overflow-hidden ${className}`
          : `flex justify-center my-3 min-h-[65px] ${className}`
      }
      style={invisible ? { width: 300, height: 65 } : undefined}
      aria-hidden={invisible}
    >
      <Turnstile
        ref={ref}
        siteKey={SITE_KEY}
        options={{
          size,
          theme: "auto",
          // Retry soft failures inside the widget when possible
          retry: "auto",
          refreshExpired: "auto",
        }}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
      />
    </div>
  );
}

export function hasTurnstileSiteKey() {
  return Boolean(SITE_KEY);
}
