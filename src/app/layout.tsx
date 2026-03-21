import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "aigengamez | Free Browser Games for Kids & Adults",
  description: "Play 29 free browser games — puzzles, word games, math, art, and action. No download needed. Kids and adult modes. Hebrew / English.",
  keywords: ["free games", "browser games", "kids games", "math games", "word games", "puzzle games", "Hebrew games"],
  openGraph: {
    title: "aigengamez | Free Browser Games for Kids & Adults",
    description: "Play 29 free browser games — puzzles, word games, math, art, and action. No download needed.",
    url: "https://aigengamez.vercel.app",
    siteName: "aigengamez",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "aigengamez | Free Browser Games",
    description: "29 free browser games for kids and adults. Puzzles, word games, math, art, and more.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="main-content">
            {children}
          </main>
          <Footer />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
