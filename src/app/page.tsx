"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RoomPanel } from "@/components/RoomPanel";
import { JoinModal } from "@/components/JoinModal";
import GradientASCII from "@/components/GradientASCII";
import { motion } from "motion/react";

function HomeContent() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("room");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinRequest, setJoinRequest] = useState<{ code: string; nonce: number } | null>(
    initialRoom && /^[A-Za-z0-9]{6}$/.test(initialRoom)
      ? { code: initialRoom.toUpperCase(), nonce: 1 }
      : null
  );

  return (
    <>
      {/* Full-site animated background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <GradientASCII
          colors={['#0a1628', '#1e3a8a', '#3b82f6', '#60a5fa']}
          shape="horizon"
          characters=" =+xX0S8#@"
          cellSize={16}
          density={0.75}
          glyphOpacity={0.7}
          gradientOpacity={0.85}
          glow={0.15}
          flicker={0.15}
          softness={0.6}
          scale={1.1}
          flow={0.4}
          speed={0.6}
          grain={0.06}
          mouseInteraction={true}
          intro={true}
          className="w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70" />
      </div>

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="flex-1 relative">
        {/* ========== HERO ========== */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8 sm:pb-12">
          <motion.div
            className="text-center max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-[family-name:var(--font-instrument)] font-semibold text-[2rem] sm:text-4xl lg:text-[2.75rem] tracking-tight text-white leading-[1.15]">
              Send files directly<br className="hidden sm:block" /> between devices
            </h1>
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-white/55 leading-relaxed max-w-md mx-auto">
              No upload. No account. Peer-to-peer & encrypted.
            </p>

            <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  document.querySelector<HTMLButtonElement>("[data-select-files]")?.click();
                }}
                className="btn-primary inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl text-base w-full sm:w-auto"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <path d="M9 12V4M9 4L5.5 7.5M9 4l3.5 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 14h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
                Send files
              </button>
              <button
                type="button"
                onClick={() => setJoinOpen(true)}
                className="btn-ghost inline-flex items-center justify-center h-12 px-7 rounded-xl text-base font-medium w-full sm:w-auto"
              >
                Enter code
              </button>
            </div>
          </motion.div>

          {/* Room panel — centered under hero */}
          <motion.div
            className="mt-10 sm:mt-14 max-w-lg mx-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <RoomPanel
              joinRequest={joinRequest}
              onJoinHandled={() => {}}
            />
          </motion.div>
        </section>

        {/* ========== HOW IT WORKS ========== */}
        <section id="how" className="border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="font-[family-name:var(--font-instrument)] font-semibold text-xl sm:text-2xl text-white text-center mb-10 sm:mb-12">
              How it works
            </h2>
            <ol className="grid sm:grid-cols-3 gap-8 sm:gap-6 list-none">
              {[
                {
                  n: "01",
                  title: "Create a room",
                  body: "Select files. Get a 6-character code and a one-time link.",
                },
                {
                  n: "02",
                  title: "Share the code",
                  body: "Recipient opens the link or types the code. Devices connect directly.",
                },
                {
                  n: "03",
                  title: "Send & done",
                  body: "Files move device-to-device. Nothing is stored on any server.",
                },
              ].map((item) => (
                <li key={item.n} className="text-center sm:text-left">
                  <span className="font-[family-name:var(--font-instrument)] font-semibold text-blue-400 text-sm tabular-nums mb-2 block">
                    {item.n}
                  </span>
                  <h3 className="font-medium text-white mb-1.5">{item.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{item.body}</p>
                </li>
              ))}
            </ol>
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
        }}
      />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--bg)]" />}>
      <HomeContent />
    </Suspense>
  );
}
