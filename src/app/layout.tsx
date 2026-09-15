import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: "AriXDrop — Send files directly",
  description:
    "Transfer files peer-to-peer between devices. No upload, no account, no permanent storage. End-to-end encrypted via WebRTC.",
  openGraph: {
    title: "AriXDrop — Send files directly",
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
    <html lang="en" className={`${instrument.variable} ${ibmPlex.variable}`}>
      <body className="bg-paper text-ink font-body antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
