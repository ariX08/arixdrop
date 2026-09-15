import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Terms & conditions — AriXDrop",
  description: "Terms of use for AriXDrop peer-to-peer file transfer.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="font-display font-semibold text-3xl tracking-tight text-ink">
          Terms & conditions
        </h1>
        <p className="text-sm text-muted mt-2">Last updated: 15 September 2026</p>

        <div className="mt-10 space-y-8 text-muted leading-relaxed">
          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Agreement</h2>
            <p>
              By using AriXDrop you agree to these terms. If you do not agree, do not use the
              service.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">The service</h2>
            <p>
              AriXDrop provides tools to transfer files directly between devices using browser
              technologies (including WebRTC). The service is provided as-is. Availability may
              change; rooms expire; connections depend on both devices and their networks.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Your responsibilities</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Only transfer content you have the right to share.</li>
              <li>Do not use AriXDrop for unlawful, harmful, or abusive purposes.</li>
              <li>You are responsible for who you share room codes and links with.</li>
              <li>Verify the recipient before sending sensitive files.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">No warranty</h2>
            <p>
              AriXDrop is provided without warranties of any kind, including uninterrupted access,
              error-free operation, or fitness for a particular purpose. Transfers may fail due to
              network conditions, browser limits, or device capabilities.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, AriXDrop and its operator are not liable for
              indirect, incidental, or consequential damages, or for loss of data arising from use
              of the service. You use peer-to-peer transfer at your own risk.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Changes</h2>
            <p>
              We may update these terms from time to time. Continued use after changes means you
              accept the updated terms. The date at the top of this page reflects the latest update.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Contact</h2>
            <p>
              <a
                href="https://arix.faltuworkonly91.workers.dev"
                className="text-ink underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                ARITRA.DESIGN
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
