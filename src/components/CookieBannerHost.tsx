"use client";

import { useEffect, useState } from "react";
import { CookieBanner } from "./CookieBanner";

/**
 * Cookie banner only after the entry gate unlocks the main site.
 * Listens for `pigeon-site-ready` and sessionStorage flag set by the home page.
 * Other routes (privacy, terms, …) show it once the flag is set or after a short wait.
 */
export function CookieBannerHost() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("pigeon-entry-ok") === "1") {
        setReady(true);
        return;
      }
    } catch {
      /* */
    }

    const onReady = () => setReady(true);
    window.addEventListener("pigeon-site-ready", onReady);

    // Non-home pages: show banner after a beat so it never appears on the splash
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    let t: ReturnType<typeof setTimeout> | null = null;
    if (path !== "/") {
      t = setTimeout(() => setReady(true), 400);
    }

    return () => {
      window.removeEventListener("pigeon-site-ready", onReady);
      if (t) clearTimeout(t);
    };
  }, []);

  if (!ready) return null;
  return <CookieBanner />;
}
