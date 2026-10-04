import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// The two fonts that come with a new Next.js project.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// The page title and description shown in the browser tab and in search results.
export const metadata: Metadata = {
  title: "Akure City Life",
  description: "A playable social life simulation of Akure, Nigeria.",
};

// Tells phones to show the page at real size and not zoom on double tap.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// This wraps every page in the app. Our game page is placed where {children} is.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}