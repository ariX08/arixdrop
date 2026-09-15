"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Header } from "@/components/Header";
import { RoomPanel } from "@/components/RoomPanel";
import { JoinModal } from "@/components/JoinModal";

function HomeContent() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("room");
  const [joinOpen, setJoinOpen] = useState(!!initialRoom && !initialRoom);
  const [joinCode, setJoinCode] = useState<string | null>(
    initialRoom && /^[A-Za-z0-9]{6}$/.test(initialRoom) ? initialRoom.toUpperCase() : null
  );

  // Open modal on deep link if code present but let RoomPanel also auto-join
  const [modalSeed] = useState(initialRoom || "");

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
                No upload. No account. Files move peer-to-peer over an encrypted
                connection and disappear when you're done.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    document
                      .querySelector<HTMLButtonElement>("[data-select-files]")
                      ?.click();
                  }}
                  className="btn-primary inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-accent text-white font-medium text-base shadow-sm hover:bg-accent-hover active:bg-accent-pressed transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <path
                      d="M9 3v9M5 8l4 4 4-4"
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
                initialRoom={initialRoom}
                joinCode={joinCode}
                onJoinHandled={() => setJoinCode(null)}
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
                  The recipient opens the link or types the code. Devices negotiate a direct connection.
                </p>
              </li>
              <li className="relative pl-10 sm:pl-0">
                <span className="absolute left-0 top-0 sm:static sm:block font-display font-semibold text-accent text-sm tabular-nums mb-2">
                  03
                </span>
                <h3 className="font-medium text-ink mb-1.5">Transfer & done</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Files move device-to-device. The room closes when finished.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-18">
            <div className="grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5">
                <h2 className="font-display font-semibold text-2xl tracking-tight mb-4">
                  Built for the moment you need it
                </h2>
                <p className="text-muted leading-relaxed mb-8">
                  AriXDrop is a tool, not a platform. No accounts, no storage quotas, no lingering
                  copies on someone else's servers.
                </p>
                <ul className="space-y-4 text-sm">
                  {[
                    ["Direct P2P", "WebRTC DataChannel between the two devices"],
                    ["Multiple files", "send several files in one room"],
                    ["Live progress", "speed and per-file status while transferring"],
                    ["6-character code", "short code, easy to read aloud"],
                    ["Automatic cleanup", "room state vanishes after the transfer"],
                  ].map(([title, desc]) => (
                    <li key={title} className="flex gap-3">
                      <span className="mt-0.5 w-5 h-5 rounded bg-accent/10 flex items-center justify-center shrink-0">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3 5-5.5"
                            stroke="#E85D04"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span>
                        <strong className="text-ink font-medium">{title}</strong>
                        {" — "}
                        {desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-7">
                <div className="bg-surface border border-border rounded-xl shadow-panel p-5 sm:p-6 min-h-[200px]">
                  <p className="text-sm text-muted">
                    Share a code or link. Both devices must be in the same room before any file
                    data moves — and only then, directly between them.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="privacy" className="border-t border-border bg-surface">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-16">
            <h2 className="font-display font-semibold text-2xl tracking-tight mb-4">Privacy</h2>
            <div className="max-w-2xl text-muted leading-relaxed space-y-3">
              <p>
                Files never leave your devices except to travel directly to the recipient. Signaling
                only helps set up the connection; the worker never sees file contents.
              </p>
              <p>
                Rooms are temporary. After the transfer finishes or the room times out, all state is
                discarded.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-muted">
          <p>AriXDrop — peer-to-peer file transfer</p>
          <div className="flex gap-6">
            <a href="#privacy" className="hover:text-ink transition-colors">
              Privacy
            </a>
            <a href="#how" className="hover:text-ink transition-colors">
              How it works
            </a>
          </div>
        </div>
      </footer>

      <JoinModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        initialCode={modalSeed}
        onJoin={(code) => {
          setJoinOpen(false);
          setJoinCode(code.toUpperCase());
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
