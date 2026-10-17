"use client";

export function SiteBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(125deg, #0c0a12 0%, #1a1025 25%, #3b1d6b 50%, #635bff 75%, #a78bfa 100%)",
        }}
      />
      {/* Readability scrim so UI stays premium & legible */}
      <div className="absolute inset-0 bg-black/35 dark:bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />
    </div>
  );
}
