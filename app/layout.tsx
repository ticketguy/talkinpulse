import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { getSessionSafe } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalkinPulse — CT Intelligence",
  description: "Prediction markets, takes, debates and signal intelligence for Crypto Twitter.",
  openGraph: {
    title: "TalkinPulse",
    description: "CT prediction markets and signal intelligence",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionSafe();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
