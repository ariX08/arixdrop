"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

interface Props {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  /** invisible = runs on load with no UI (site entry). normal / flexible = visible. */
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
          ? // Real layout box, clipped — opacity-0 / pointer-events-none / z-[-1] break invisible Turnstile on many mobile browsers
            `absolute left-0 top-0 w-[300px] h-[65px] overflow-hidden [clip-path:inset(50%)] ${className}`
          : `flex justify-center my-3 min-h-[65px] ${className}`
      }
      aria-hidden={invisible}
    >
      <Turnstile
        ref={ref}
        siteKey={SITE_KEY}
        options={{
          size,
          theme: "auto",
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
