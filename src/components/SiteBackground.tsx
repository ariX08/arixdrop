"use client";

import Grainient from "./Grainient";

export function SiteBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      <Grainient
        colors={['#0c0a12', '#1a1025', '#3b1d6b', '#635bff', '#a78bfa']}
        type="linear"
        angle={125}
        bands={1}
        softness={1}
        flow={0.55}
        scale={1.15}
        speed={0.35}
        silk={0.4}
        grainAmount={0.06}
        grainSize={1.3}
        grainAnimated
        contrast={1.05}
        saturation={0.95}
        interactive={false}
        clickSwirl={false}
        intro
        className="w-full h-full"
      />
      {/* Readability scrim so UI stays premium & legible */}
      <div className="absolute inset-0 bg-black/35 dark:bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />
    </div>
  );
}
