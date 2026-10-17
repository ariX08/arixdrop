"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { DitherProps } from "./Dither";

const Dither = dynamic<DitherProps>(() => import("./Dither"), {
  ssr: false,
  loading: () => null,
});

function useIsDark(): boolean {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const read = () => document.documentElement.classList.contains("dark");
    setDark(read());

    const obs = new MutationObserver(() => setDark(read()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  return dark;
}

export function SiteBackground() {
  const dark = useIsDark();

  // Match CSS --page-bg so fallback never flashes a different color
  const pageBg = dark ? "#1e1b4b" : "#ebe7ff";
  const wave = dark ? "#c4b5fd" : "#6d28d9";
  const ditherBg = dark ? "#1e1b4b" : "#ebe7ff";

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden
      style={{ backgroundColor: pageBg }}
    >
      {/* Solid layer always present — kills brown/transparent flash before WebGL */}
      <div className="absolute inset-0" style={{ backgroundColor: pageBg }} />

      <div className="absolute inset-0">
        <Dither
          key={dark ? "dark" : "light"}
          waveColor={wave}
          backgroundColor={ditherBg}
          ditherMode="bayer"
          colorNum={4}
          pixelSize={3}
          waveSpeed={0.04}
          waveFrequency={2.8}
          waveAmplitude={0.28}
          scale={1.15}
          contrast={1.1}
          brightness={dark ? 0.02 : 0.08}
          mouseEffect="erase"
          mouseRadius={0.35}
          mouseStrength={0.85}
          trail={0.4}
          enableMouseInteraction
          clickRipple
          intro={false}
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Light scrim only in dark mode for text readability */}
      {dark ? (
        <>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/50" />
        </>
      ) : (
        <div className="absolute inset-0 bg-white/20" />
      )}
    </div>
  );
}
