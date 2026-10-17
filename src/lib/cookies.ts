export type CookieCategory = "essential" | "preferences" | "analytics" | "performance";

export type CookieConsent = {
  version: 1;
  essential: true;
  preferences: boolean;
  analytics: boolean;
  performance: boolean;
  updatedAt: string;
};

export const COOKIE_CONSENT_KEY = "pigeon-cookie-consent";
export const COOKIE_CONSENT_EVENT = "pigeon-cookie-consent-change";

export const DEFAULT_CONSENT: CookieConsent = {
  version: 1,
  essential: true,
  preferences: false,
  analytics: false,
  performance: false,
  updatedAt: "",
};

export const ACCEPT_ALL_CONSENT: Omit<CookieConsent, "updatedAt"> = {
  version: 1,
  essential: true,
  preferences: true,
  analytics: true,
  performance: true,
};

export const REJECT_OPTIONAL_CONSENT: Omit<CookieConsent, "updatedAt"> = {
  version: 1,
  essential: true,
  preferences: false,
  analytics: false,
  performance: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse stored consent (supports legacy string values). */
export function parseConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;

  // Legacy: "all" | "essential" | "rejected"
  if (raw === "all") {
    return { ...ACCEPT_ALL_CONSENT, updatedAt: new Date().toISOString() };
  }
  if (raw === "essential" || raw === "rejected") {
    return { ...REJECT_OPTIONAL_CONSENT, updatedAt: new Date().toISOString() };
  }

  try {
    const data = JSON.parse(raw) as unknown;
    if (!isRecord(data)) return null;
    return {
      version: 1,
      essential: true,
      preferences: Boolean(data.preferences),
      analytics: Boolean(data.analytics),
      performance: Boolean(data.performance),
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function readConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    return parseConsent(localStorage.getItem(COOKIE_CONSENT_KEY));
  } catch {
    return null;
  }
}

export function writeConsent(partial: Omit<CookieConsent, "updatedAt" | "essential"> & { essential?: true }): CookieConsent {
  const next: CookieConsent = {
    version: 1,
    essential: true,
    preferences: Boolean(partial.preferences),
    analytics: Boolean(partial.analytics),
    performance: Boolean(partial.performance),
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
  } catch {
    // private mode / quota — still return the value for this session
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: next }));
  }

  return next;
}

export function hasConsentChoice(): boolean {
  return readConsent() !== null;
}

export function allowsCategory(category: CookieCategory, consent: CookieConsent | null = readConsent()): boolean {
  if (category === "essential") return true;
  if (!consent) return false;
  return Boolean(consent[category]);
}

/** Open the settings UI from anywhere (footer, cookies page, etc.). */
export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("pigeon-open-cookie-settings"));
}
