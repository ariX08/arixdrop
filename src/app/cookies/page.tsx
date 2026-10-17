import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";

export const metadata = {
  title: "Cookies — pigeon",
  description: "How pigeon uses cookies and similar technologies, and how to manage your choices.",
};

export default function CookiesPage() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="font-display font-semibold text-3xl tracking-tight text-[var(--ink)]">Cookies</h1>
        <p className="text-sm text-[var(--muted)] mt-2">Last updated: 17 October 2026</p>

        <div className="mt-8">
          <CookieSettingsButton />
        </div>

        <div className="mt-10 space-y-8 text-[var(--muted)] leading-relaxed">
          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Summary</h2>
            <p>
              pigeon works without an account. We do not use advertising cookies to track you across
              other websites. You can accept all optional categories, reject them, or choose per
              category in Cookie settings.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Essential</h2>
            <p>
              Required for the site to function: security and delivery (for example Vercel or
              Cloudflare), and storing this consent choice so we do not ask every visit. These stay
              on.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Preferences</h2>
            <p>
              Optional. Remembers UI choices such as theme (light, dark, or system) in your browser.
              If you turn this off, those choices may not persist after you close the tab.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Analytics</h2>
            <p>
              Optional. Reserved for anonymous product metrics (what fails, what people use). No ad
              targeting. Nothing in this category runs until you opt in and a provider is configured.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Performance</h2>
            <p>
              Optional. Reserved for measuring load and transfer quality so we can improve the
              experience. Not used for advertising.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Local browser storage</h2>
            <p>
              While a transfer is in progress, the app may keep short-lived room UI state in memory
              or session storage. That is not used to identify you after the session ends.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">Managing cookies</h2>
            <p>
              Use the Cookie settings control on this page or in the site footer any time. You can
              also clear site data in your browser. Blocking essential storage may affect reliability.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-lg text-[var(--ink)] mb-2">More privacy detail</h2>
            <p>
              See the{" "}
              <a href="/privacy" className="text-[var(--ink)] underline underline-offset-2">
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
