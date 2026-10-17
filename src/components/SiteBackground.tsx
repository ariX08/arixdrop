"use client";

export function SiteBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      {/* Light theme: soft lavender wash */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            "linear-gradient(145deg, #f7f5ff 0%, #efeaff 28%, #e4dcff 55%, #d6ccff 78%, #c4b5fd 100%)",
        }}
      />
      {/* Dark theme: deep purple gradient */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            "linear-gradient(125deg, #0c0a12 0%, #1a1025 25%, #3b1d6b 50%, #635bff 75%, #a78bfa 100%)",
        }}
      />
      {/* Readability scrims */}
      <div className="absolute inset-0 bg-white/40 dark:bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/50 dark:from-black/20 dark:via-transparent dark:to-black/55" />
    </div>
  );
}
