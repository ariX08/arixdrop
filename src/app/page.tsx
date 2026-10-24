"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RoomPanel } from "@/components/RoomPanel";
import { JoinModal } from "@/components/JoinModal";
import SpecularButton from "@/components/SpecularButton";
import AnimatedContent from "@/components/AnimatedContent";
import BlurText from "@/components/BlurText";
import StrokeText from "@/components/StrokeText";
import { TurnstileWidget, hasTurnstileSiteKey } from "@/components/TurnstileWidget";
import { motion, AnimatePresence } from "motion/react";

function markSiteUnlocked() {
  try {
    sessionStorage.setItem("pigeon-entry-ok", "1");
  } catch {
    /* */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pigeon-site-ready"));
  }
}

function HomeContent() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("room");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinRequest, setJoinRequest] = useState<{ code: string; nonce: number } | null>(
    initialRoom && /^[A-Za-z0-9]{6}$/.test(initialRoom)
      ? { code: initialRoom.toUpperCase(), nonce: 1 }
      : null
  );
  const [sessionActive, setSessionActive] = useState(
    !!(initialRoom && /^[A-Za-z0-9]{6}$/.test(initialRoom))
  );
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Entry gate — only unlock on successful invisible Turnstile (or no key in dev)
  const [siteReady, setSiteReady] = useState(false);
  const [gateError, setGateError] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(0); // remount on retry
  const [barProgress, setBarProgress] = useState(8);

  // Restore unlock within same tab session
  useEffect(() => {
    try {
      if (sessionStorage.getItem("pigeon-entry-ok") === "1") {
        setSiteReady(true);
        markSiteUnlocked();
      }
    } catch {
      /* */
    }
  }, []);

  // Dev without Turnstile key: unlock after brand animation
  useEffect(() => {
    if (hasTurnstileSiteKey()) return;
    if (siteReady) return;
    const t = setTimeout(() => {
      setSiteReady(true);
      markSiteUnlocked();
    }, 2800);
    return () => clearTimeout(t);
  }, [siteReady]);

  // Indeterminate-ish progress while waiting for Turnstile
  useEffect(() => {
    if (siteReady || gateError) return;
    const id = setInterval(() => {
      setBarProgress((p) => {
        if (p >= 88) return 12 + Math.random() * 8;
        return Math.min(88, p + 3 + Math.random() * 6);
      });
    }, 400);
    return () => clearInterval(id);
  }, [siteReady, gateError]);

  function unlockSite() {
    setBarProgress(100);
    setGateError(false);
    setSiteReady(true);
    markSiteUnlocked();
  }

  function onHeroSend() {
    fileInputRef.current?.click();
  }

  function onFilesPicked(list: FileList | null) {
    if (!list || list.length === 0) return;
    setPendingFiles(Array.from(list));
    setSessionActive(true);
  }

  function onSessionReset() {
    setSessionActive(false);
    setPendingFiles(null);
    setJoinRequest(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Entry splash ─────────────────────────────────────────────────────
  if (!siteReady) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center relative px-6">
        {!gateError && hasTurnstileSiteKey() && (
          <TurnstileWidget
            key={turnstileKey}
            size="invisible"
            onSuccess={() => unlockSite()}
            onError={() => setGateError(true)}
            onExpire={() => setGateError(true)}
          />
        )}

        <div className="w-full max-w-md">
          <StrokeText
            text="pigeon"
            strokeColor="#ffffff"
            fillColor="#ffffff"
            strokeStyle="solid"
            strokeWidth={1.4}
            drawDuration={2.4}
            fillDelay={0.15}
            stagger={0.06}
            ease="power2.out"
            trigger="mount"
            fillMode="wipe"
            wipeFrom="left"
            fontSize={96}
            fontWeight={800}
            letterSpacing={-3}
            marching={false}
            hoverRedraw={false}
            shadow={false}
            fontFamily="var(--font-brand), cursive"
          />
        </div>

        <div className="mt-10 w-full max-w-[220px]">
          {gateError ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-white/80">Verification failed. Please try again.</p>
              <button
                type="button"
                onClick={() => {
                  setGateError(false);
                  setBarProgress(8);
                  setTurnstileKey((k) => k + 1);
                }}
                className="h-10 px-5 rounded-xl bg-white text-[#1d1d1f] text-sm font-medium hover:bg-white/90 transition"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-500 ease-out"
                  style={{ width: `${barProgress}%` }}
                />
              </div>
              <p className="mt-3 text-center text-xs text-white/50 tracking-wide">Verifying…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main site ────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col relative">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="flex-1 relative">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onFilesPicked(e.target.files)}
        />

        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center text-white">
          <AnimatePresence mode="wait">
            {!sessionActive ? (
              <motion.div
                key="hero"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <div className="mb-8 sm:mb-10 max-w-md mx-auto px-2">
                  <StrokeText
                    text="pigeon"
                    strokeColor="#ffffff"
                    fillColor="#ffffff"
                    strokeStyle="solid"
                    strokeWidth={1.4}
                    drawDuration={2.2}
                    fillDelay={0.15}
                    stagger={0.06}
                    ease="power2.out"
                    trigger="mount"
                    fillMode="wipe"
                    wipeFrom="left"
                    fontSize={96}
                    fontWeight={800}
                    letterSpacing={-3}
                    marching={false}
                    hoverRedraw={true}
                    shadow={false}
                    fontFamily="var(--font-brand), cursive"
                  />
                </div>

                <AnimatedContent
                  distance={40}
                  direction="vertical"
                  duration={0.75}
                  ease="power3.out"
                  trigger="mount"
                  stagger={0.09}
                  blur={4}
                  className="flex flex-col items-center"
                >
                  <BlurText
                    text="Send files directly between devices"
                    animateBy="words"
                    direction="top"
                    trigger="load"
                    delay={80}
                    stepDuration={0.32}
                    blur={12}
                    distance={28}
                    color="#ffffff"
                    className="font-[family-name:var(--font-instrument)] font-semibold text-4xl sm:text-5xl lg:text-[3.4rem] tracking-tight leading-[1.15] justify-center"
                  />

                  <p className="mt-5 text-base sm:text-lg text-white/85 max-w-lg mx-auto leading-relaxed">
                    No upload. No account. Files move peer-to-peer over an encrypted connection and
                    disappear when you&apos;re done.
                  </p>

                  <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <SpecularButton
                      size="md"
                      radius={12}
                      tint="#ffffff"
                      tintOpacity={0.98}
                      textColor="#1d1d1f"
                      lineColor="#ffffff"
                      baseColor="#a1a1aa"
                      intensity={1.15}
                      idleIntensity={0.45}
                      onClick={onHeroSend}
                    >
                      Send files →
                    </SpecularButton>
                    <SpecularButton
                      size="md"
                      radius={12}
                      tint="#ffffff"
                      tintOpacity={0.22}
                      textColor="#ffffff"
                      lineColor="#e0e0ff"
                      baseColor="#a1a1aa"
                      intensity={0.9}
                      idleIntensity={0.35}
                      onClick={() => setJoinOpen(true)}
                    >
                      Enter code
                    </SpecularButton>
                  </div>

                  <p className="mt-8 text-sm text-white/70">Works on the same network or across the internet.</p>
                </AnimatedContent>
              </motion.div>
            ) : (
              <motion.div
                key="room"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="max-w-md mx-auto text-left"
              >
                <RoomPanel
                  joinRequest={joinRequest}
                  initialFiles={pendingFiles}
                  onJoinHandled={() => {}}
                  onReset={onSessionReset}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section id="how" className="border-t border-white/20 bg-black/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-white">
            <AnimatedContent distance={48} duration={0.7} stagger={0.1} threshold={0.12}>
              <h2 className="font-[family-name:var(--font-instrument)] font-semibold text-2xl text-center mb-12">
                How it works
              </h2>
              <ol className="grid sm:grid-cols-3 gap-10 list-none">
                {[
                  {
                    n: "01",
                    title: "Create a room",
                    body: "Select files. Pigeon generates a 6-character code and a one-time link.",
                  },
                  {
                    n: "02",
                    title: "Share the code",
                    body: "The recipient opens the link or types the code. Devices negotiate a direct connection.",
                  },
                  {
                    n: "03",
                    title: "Send & done",
                    body: "When both devices are in the room, press Send. Data moves device-to-device.",
                  },
                ].map((item) => (
                  <li key={item.n}>
                    <span className="font-[family-name:var(--font-instrument)] font-semibold text-white/80 text-sm tabular-nums mb-2 block">
                      {item.n}
                    </span>
                    <h3 className="font-medium mb-1.5">{item.title}</h3>
                    <p className="text-sm text-white/80 leading-relaxed">{item.body}</p>
                  </li>
                ))}
              </ol>
            </AnimatedContent>
          </div>
        </section>
      </main>

      <Footer />

      <JoinModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        initialCode=""
        onJoin={(code) => {
          setJoinOpen(false);
          setJoinRequest({ code: code.toUpperCase(), nonce: Date.now() });
          setSessionActive(true);
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <HomeContent />
    </Suspense>
  );
}
