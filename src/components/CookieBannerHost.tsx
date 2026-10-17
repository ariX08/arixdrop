"use client";

import { CookieBanner } from "./CookieBanner";

/** Client boundary so the banner can live in the root layout. */
export function CookieBannerHost() {
  return <CookieBanner />;
}
