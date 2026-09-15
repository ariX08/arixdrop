import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Security — AriXDrop",
  description: "How AriXDrop protects transfers and what security depends on.",
};

export default function SecurityPage() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="font-display font-semibold text-3xl tracking-tight text-ink">Security</h1>
        <p className="text-sm text-muted mt-2">Last updated: 15 September 2026</p>

        <div className="mt-10 space-y-8 text-muted leading-relaxed">
          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Direct transfer</h2>
            <p>
              After two devices connect, file data is intended to move over a WebRTC DataChannel
              between those devices. AriXDrop is not designed to store your files on a central
              server.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Encryption in transit</h2>
            <p>
              WebRTC connections use DTLS for media and data channels in modern browsers. Signaling
              (room codes and session negotiation) uses HTTPS/WSS to the signaling worker.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Room codes</h2>
            <p>
              Anyone who has the active room code or link can attempt to join that room while it is
              open. Treat codes like a temporary shared secret. Do not post codes publicly if the
              files are sensitive. Rooms expire automatically.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">What we cannot guarantee</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Security of devices you control (malware, unlocked screens).</li>
              <li>Correct recipient if you share a code with the wrong person.</li>
              <li>Network environments that block or inspect WebRTC traffic.</li>
              <li>Browser bugs or extensions that alter page behavior.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Recommendations</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Share codes through a channel you already trust.</li>
              <li>Confirm the other device shows the same room code before sending.</li>
              <li>Prefer trusted networks for highly sensitive material.</li>
              <li>Close or cancel the room when you are finished.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Reporting issues</h2>
            <p>
              Security concerns can be reported via{" "}
              <a
                href="https://arix.faltuworkonly91.workers.dev"
                className="text-ink underline underline-offset-2"
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
