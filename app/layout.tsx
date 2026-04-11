import type { Metadata } from "next";
import { Source_Sans_3, Space_Grotesk } from "next/font/google";

import "./globals.css";

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body"
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "AI Engineer Agent",
  description: "Analyze GitHub repositories and get actionable engineering suggestions."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} font-[var(--font-body)]`}>
        {children}
      </body>
    </html>
  );
}

