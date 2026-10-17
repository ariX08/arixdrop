import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Privacy policy — pigeon",
  description: "How pigeon handles data, files, and privacy.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="font-display font-semibold text-3xl tracking-tight text-[var(--ink)]">Privacy policy</h1>
        <p className="text-sm text-[var(--muted)] mt-2">Last updated: 17 October 2026</p>

        <div className="mt-10 space-y-8 text-[var(--muted)] leading-relaxed">
          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">What pigeon is</h2>
            <p>
              pigeon is a peer-to-peer file transfer tool. Files are sent directly between your
              browser and the recipient&apos;s browser using WebRTC. We do not operate a file storage
              service and we do not keep copies of the files you transfer.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Files and content</h2>
            <p>
              File contents travel on a direct encrypted connection between the two devices. They
              are not uploaded to pigeon servers for storage. Temporary signaling messages (used
              only to set up the connection) do not include file contents.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Signaling data</h2>
            <p>
              To connect two devices we use a short-lived signaling channel (room codes and WebRTC
              session signals). That channel may process connection metadata such as room codes and
              session negotiation messages. Room state is temporary and is discarded when the room
              expires or both participants leave.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Accounts</h2>
            <p>
              pigeon does not require an account. We do not maintain user profiles or login systems
              for this product.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Hosting and logs</h2>
            <p>
              The website is hosted on Vercel. Signaling runs on Cloudflare Workers. Those providers
              may process standard technical logs (for example IP addresses, timestamps, and error
              reports) as part of operating their infrastructure. We do not use those logs to build
              advertising profiles.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Cookies</h2>
            <p>
              See our{" "}
              <a href="/cookies" className="text-[var(--ink)] underline underline-offset-2">
                Cookies
              </a>{" "}
              page for details. We aim to keep optional tracking to a minimum.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Contact</h2>
            <p>
              Questions about this policy: contact via{" "}
              <a
                href="https://arix.faltuworkonly91.workers.dev"
                className="text-[var(--ink)] underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                ARITRA.DESIGN
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
