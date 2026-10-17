"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

interface Props {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export function TurnstileWidget({ onSuccess, onError, onExpire }: Props) {
  const ref = useRef<any>(null);

  if (!SITE_KEY) {
    return (
      <p className="text-xs text-[var(--muted)] text-center py-2">
        Add NEXT_PUBLIC_TURNSTILE_SITE_KEY in Vercel to enable bot protection.
      </p>
    );
  }

  return (
    <div className="flex justify-center my-3 min-h-[65px]">
      <Turnstile
        ref={ref}
        siteKey={SITE_KEY}
        options={{
          size: "normal",
          theme: "auto",
        }}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
      />
    </div>
  );
}
