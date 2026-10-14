import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://protect30a.org"),
  title: {
    default: "Protect30A",
    template: "%s | Protect30A"
  },
  description:
    "Protect30A community engagement, live podcast participation, community leaderboards, and the South Walton stormwater plan."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<Script src="/assets/traffic.js" strategy="afterInteractive" /></body>
    </html>
  );
}
