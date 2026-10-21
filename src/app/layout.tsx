import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AgentationWrapper } from "@/frontend/components/AgentationWrapper";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "TripEvo — Premium Generative Itineraries",
  description: "Next-gen travel itinerary planner driven by real-time vibe onboarding, active weather intelligence, and live group collaboration simulation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <AgentationWrapper />
      </body>
    </html>
  );
}
