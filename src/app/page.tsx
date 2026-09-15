"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RoomPanel } from "@/components/RoomPanel";
import { JoinModal } from "@/components/JoinModal";

function HomeContent() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("room");
  const [joinOpen, setJoinOpen] = useState(false);
  // nonce forces RoomPanel to re-run join even if same code is entered twice
  const [joinRequest, setJoinRequest] = useState<{ code: string; nonce: number } | null>(
    initialRoom && /^[A-Za-z0-9]{6}$/.test(initialRoom)
      ? { code: initialRoom.toUpperCase(), nonce: 1 }
      : null
  );

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-surface focus:px-4 focus:py-2 focus:rounded focus:shadow-panel"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="flex-1">
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 sm:pt-18 pb-16 sm:pb-22">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-5 pt-2">
              <h1 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight text-ink max-w-[18ch]">
                Send files directly between devices
              </h1>
              <p className="mt-5 text-lg text-muted max-w-[36ch]">
                No upload. No account. Files move peer-to-peer over an encrypted connection and
                disappear when you're done.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    document.querySelector<HTMLButtonElement>("[data-select-files]")?.click();
                  }}
                  className="btn-primary inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-accent text-white font-medium text-base shadow-sm hover:bg-accent-hover active:bg-accent-pressed transition-colors"
                >
                  {/* Upload / send icon (arrow up into tray) */}
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <path
                      d="M9 12V4M9 4L5.5 7.5M9 4l3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M3 14h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                  Send files
                </button>
                <button
                  type="button"
                  onClick={() => setJoinOpen(true)}
                  className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-border bg-surface text-ink font-medium text-base hover:bg-paper hover:border-ink/20 active:bg-border/40 transition-colors"
                >
                  Enter code
                </button>
              </div>
              <p className="mt-4 text-sm text-muted">
                Works on the same network or across the internet. Room expires after transfer.
              </p>
            </div>

            <div className="lg:col-span-7">
              <RoomPanel
                joinRequest={joinRequest}
                onJoinHandled={() => {
                  /* keep request identity; RoomPanel owns session */
                }}
              />
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-border bg-surface">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-18">
            <h2 className="font-display font-semibold text-2xl tracking-tight mb-10">How it works</h2>
            <ol className="grid sm:grid-cols-3 gap-8 sm:gap-6 list-none">
              <li className="relative pl-10 sm:pl-0">
                <span className="absolute left-0 top-0 sm:static sm:block font-display font-semibold text-accent text-sm tabular-nums mb-2">
                  01
                </span>
                <h3 className="font-medium text-ink mb-1.5">Create a room</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Select files. AriXDrop generates a 6-character code and a one-time link.
                </p>
              </li>
              <li className="relative pl-10 sm:pl-0">
                <span className="absolute left-0 top-0 sm:static sm:block font-display font-semibold text-accent text-sm tabular-nums mb-2">
                  02
                </span>
                <h3 className="font-medium text-ink mb-1.5">Share the code</h3>
                <p className="text-sm text-muted leading-relaxed">
                  The recipient opens the link or types the code. Devices negotiate a direct
                  connection.
                </p>
              </li>
              <li className="relative pl-10 sm:pl-0">
                <span className="absolute left-0 top-0 sm:static sm:block font-display font-semibold text-accent text-sm tabular-nums mb-2">
                  03
                </span>
                <h3 className="font-medium text-ink mb-1.5">Send & done</h3>
                <p className="text-sm text-muted leading-relaxed">
                  When both devices are in the room, press Send files. Data moves device-to-device.
                </p>
              </li>
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
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <HomeContent />
    </Suspense>
  );
}
