import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AegisGG • Аналитика Dota 2, MMR трекер и разбор матчей",
  description: "Персональная статистика Dota 2, история матчей, поминутный разбор реплеев с ползунком нетворса, крипов и слотов игроков.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-200 font-sans antialiased selection:bg-zinc-700 selection:text-white">
        {children}
      </body>
    </html>
  );
}
