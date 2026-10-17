"use client";

import dynamic from "next/dynamic";

const Dither = dynamic(() => import("./Dither"), { ssr: false });

export function SiteBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      <div className="absolute inset-0">
        <Dither
          waveColor="#c4b5fd"
          backgroundColor="#1e1b4b"
          ditherMode="bayer"
          colorNum={4}
          pixelSize={3}
          waveSpeed={0.04}
          waveFrequency={2.8}
          waveAmplitude={0.28}
          scale={1.15}
          contrast={1.1}
          brightness={0.02}
          mouseEffect="erase"
          mouseRadius={0.35}
          mouseStrength={0.85}
          trail={0.4}
          enableMouseInteraction
          clickRipple
          intro
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      {/* Soft scrim so text stays readable over the dither field */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/55" />
    </div>
  );
}
