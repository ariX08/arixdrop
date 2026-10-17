import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Sans, JetBrains_Mono, Story_Script } from "next/font/google";
import { SiteBackground } from "@/components/SiteBackground";
import "./globals.css";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: ["500", "600", "700"],
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-ibm-plex",
  display: "swap",
  weight: ["400", "500", "600"],
});

const storyScript = Story_Script({
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
  weight: "400",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "pigeon — send files directly",
  description:
    "Transfer files peer-to-peer between devices. No upload, no account, no permanent storage. End-to-end encrypted via WebRTC.",
  openGraph: {
    title: "pigeon — send files directly",
    description:
      "Fast P2P file transfer. Create a room, share a code or link, files move device-to-device.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrument.variable} ${ibmPlex.variable} ${storyScript.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pigeon-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-transparent text-[var(--ink)] font-[family-name:var(--font-ibm-plex)] antialiased min-h-dvh flex flex-col relative overflow-x-hidden">
        <SiteBackground />
        {children}
      </body>
    </html>
  );
}
