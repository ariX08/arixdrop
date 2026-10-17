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
      {/* Exact React Bits GradientASCII with the props you specified */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <GradientASCII
          colors={['#1e3fd8', '#f6f8ff', '#a5d8ff', '#38bdf8']}
          shape="horizon"
          characters=" =+xX0S8#@"
          cellSize={18}
          density={0.8}
          className="w-full h-full"
        />
        <div className="absolute inset-0 bg-[var(--scrim)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg)]" />
      </div>

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="flex-1 relative">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            <motion.div
              className="lg:col-span-5 pt-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="font-[family-name:var(--font-instrument)] font-semibold text-3xl sm:text-4xl lg:text-[2.75rem] tracking-tight text-[var(--ink)] leading-[1.15] max-w-[16ch]">
                Send files directly between devices
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[var(--muted)] max-w-[34ch] leading-relaxed">
                No upload. No account. Files move peer-to-peer over an encrypted connection and disappear when you&apos;re done.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    document.querySelector<HTMLButtonElement>("[data-select-files]")?.click();
                  }}
                  className="btn-primary inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-base"
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
                  className="btn-ghost inline-flex items-center justify-center h-12 px-6 rounded-xl text-base font-medium"
                >
                  Enter code
                </button>
              </div>

              <p className="mt-5 text-sm text-[var(--muted)]">
                Works on the same network or across the internet. Room expires after transfer.
              </p>
            </motion.div>

            <motion.div
              className="lg:col-span-7"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
            >
              <RoomPanel
                joinRequest={joinRequest}
                onJoinHandled={() => {}}
              />
            </motion.div>
          </div>
        </section>

        <section id="how" className="border-t border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="font-[family-name:var(--font-instrument)] font-semibold text-2xl text-[var(--ink)] mb-10">
              How it works
            </h2>
            <ol className="grid sm:grid-cols-3 gap-8 list-none">
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
                <li key={item.n} className="relative">
                  <span className="font-[family-name:var(--font-instrument)] font-semibold text-blue-500 text-sm tabular-nums mb-2 block">
                    {item.n}
                  </span>
                  <h3 className="font-medium text-[var(--ink)] mb-1.5">{item.title}</h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{item.body}</p>
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
