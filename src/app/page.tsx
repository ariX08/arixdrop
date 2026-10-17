"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RoomPanel } from "@/components/RoomPanel";
import { JoinModal } from "@/components/JoinModal";
import { motion, AnimatePresence } from "motion/react";

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

  return (
    <div className="min-h-dvh flex flex-col hero-gradient">
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

        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20 text-center">
          <AnimatePresence mode="wait">
            {!sessionActive ? (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <h1 className="font-[family-name:var(--font-instrument)] font-semibold text-4xl sm:text-5xl lg:text-[3.4rem] tracking-tight text-[var(--ink)] leading-[1.15]">
                  Send files directly<br className="hidden sm:block" /> between devices
                </h1>
                <p className="mt-5 text-base sm:text-lg text-[var(--muted)] max-w-lg mx-auto leading-relaxed">
                  No upload. No account. Files move peer-to-peer over an encrypted connection and disappear when you&apos;re done.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={onHeroSend}
                    className="btn-primary inline-flex items-center justify-center gap-2 h-12 px-7 rounded-lg text-[15px] w-full sm:w-auto"
                  >
                    Send files
                    <span aria-hidden>→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setJoinOpen(true)}
                    className="btn-ghost inline-flex items-center justify-center h-12 px-7 rounded-lg text-[15px] w-full sm:w-auto"
                  >
                    Enter code
                  </button>
                </div>

                <p className="mt-8 text-sm text-[var(--muted)]">
                  Works on the same network or across the internet.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="room"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
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

        <section id="how" className="border-t border-[var(--border)] bg-[var(--bg)]/60">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="font-[family-name:var(--font-instrument)] font-semibold text-2xl text-[var(--ink)] text-center mb-12">
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
                  <span className="font-[family-name:var(--font-instrument)] font-semibold text-[var(--accent)] text-sm tabular-nums mb-2 block">
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
          setSessionActive(true);
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--bg)]" />}>
      <HomeContent />
    </Suspense>
  );
}
