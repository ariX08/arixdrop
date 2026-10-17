"use client";

import { openCookieSettings } from "@/lib/cookies";

export function Footer() {
  return (
    <footer className="border-t border-white/20 mt-auto text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">
          <div>
            <p className="font-[family-name:var(--font-instrument)] font-semibold text-white">Pigeon</p>
            <p className="text-sm text-white/80 mt-1 max-w-xs">
              Peer-to-peer file transfer. No accounts. No permanent storage.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm text-white/80">
            <a href="/privacy" className="hover:text-white transition-colors">
              Privacy policy
            </a>
            <a href="/terms" className="hover:text-white transition-colors">
              Terms & conditions
            </a>
            <a href="/security" className="hover:text-white transition-colors">
              Security
            </a>
            <a href="/cookies" className="hover:text-white transition-colors">
              Cookies
            </a>
            <a href="/#how" className="hover:text-white transition-colors">
              How it works
            </a>
            <button
              type="button"
              onClick={() => openCookieSettings()}
              className="text-left hover:text-white transition-colors"
            >
              Cookie settings
            </button>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-white/75">
          <p>© {new Date().getFullYear()} Pigeon</p>
          <p>
            Made by{" "}
            <a
              href="https://arix.faltuworkonly91.workers.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-medium hover:text-white/90 transition-colors"
            >
              ARITRA.DESIGN
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
