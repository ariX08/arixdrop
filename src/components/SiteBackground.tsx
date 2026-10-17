"use client";

export function SiteBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      <div
        className="absolute inset-0"
        style={{ background: "var(--bg-gradient)" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "var(--scrim)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[color-mix(in_srgb,var(--bg)_70%,transparent)]" />
    </div>
  );
}
