import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import HeroUIProvider from "@/components/HeroUIProvider";
import "../styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Veo 3.1 Studio",
  description: "Local studio for generating UGC-style reel clips with Veo 3.1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background font-sans antialiased`}
      >
        <HeroUIProvider>{children}</HeroUIProvider>
      </body>
    </html>
  );
}
