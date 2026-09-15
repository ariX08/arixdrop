import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Cookies — AriXDrop",
  description: "How AriXDrop uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="font-display font-semibold text-3xl tracking-tight text-ink">Cookies</h1>
        <p className="text-sm text-muted mt-2">Last updated: 15 September 2026</p>

        <div className="mt-10 space-y-8 text-muted leading-relaxed">
          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Summary</h2>
            <p>
              AriXDrop is built to work without an account. We do not use advertising cookies to
              track you across other websites.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Essential / technical</h2>
            <p>
              Hosting and delivery providers (such as Vercel or Cloudflare) may set strictly
              necessary cookies or similar storage for security, load balancing, or basic site
              operation. These are required for the service to function reliably.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Local browser storage</h2>
            <p>
              The app may use in-memory or session state in your browser while a transfer is in
              progress (for example room UI state). That state is not used to identify you after the
              session ends.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Analytics</h2>
            <p>
              If analytics are added later, this page will be updated to describe what is collected
              and how to opt out where required by law.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Managing cookies</h2>
            <p>
              You can block or delete cookies in your browser settings. Blocking essential cookies
              may affect site reliability.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">More privacy detail</h2>
            <p>
              See the{" "}
              <a href="/privacy" className="text-ink underline underline-offset-2">
                Privacy policy
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
