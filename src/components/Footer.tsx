export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">
          <div>
            <p className="font-display font-semibold text-ink">AriXDrop</p>
            <p className="text-sm text-muted mt-1 max-w-xs">
              Peer-to-peer file transfer. No accounts. No permanent storage.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm text-muted">
            <a href="/privacy" className="hover:text-ink transition-colors">
              Privacy policy
            </a>
            <a href="/terms" className="hover:text-ink transition-colors">
              Terms & conditions
            </a>
            <a href="/security" className="hover:text-ink transition-colors">
              Security
            </a>
            <a href="/cookies" className="hover:text-ink transition-colors">
              Cookies
            </a>
            <a href="/#how" className="hover:text-ink transition-colors">
              How it works
            </a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-muted">
          <p>© {new Date().getFullYear()} AriXDrop</p>
          <p>
            Made by{" "}
            <a
              href="https://arix.faltuworkonly91.workers.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink font-medium hover:text-accent transition-colors"
            >
              ARITRA.DESIGN
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
