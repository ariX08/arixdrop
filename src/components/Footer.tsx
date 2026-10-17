export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">
          <div>
            <p className="font-[family-name:var(--font-instrument)] font-semibold text-[var(--ink)]">Pigeon</p>
            <p className="text-sm text-[var(--muted)] mt-1 max-w-xs">
              Peer-to-peer file transfer. No accounts. No permanent storage.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm text-[var(--muted)]">
            <a href="/privacy" className="hover:text-[var(--ink)] transition-colors">Privacy policy</a>
            <a href="/terms" className="hover:text-[var(--ink)] transition-colors">Terms & conditions</a>
            <a href="/security" className="hover:text-[var(--ink)] transition-colors">Security</a>
            <a href="/cookies" className="hover:text-[var(--ink)] transition-colors">Cookies</a>
            <a href="/#how" className="hover:text-[var(--ink)] transition-colors">How it works</a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <p>© {new Date().getFullYear()} Pigeon</p>
          <p>
            Made by{" "}
            <a
              href="https://arix.faltuworkonly91.workers.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--ink)] font-medium hover:text-blue-500 transition-colors"
            >
              ARITRA.DESIGN
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
